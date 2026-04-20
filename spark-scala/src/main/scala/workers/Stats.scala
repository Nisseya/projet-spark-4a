package workers

import lib.Env
import org.apache.spark.sql.{DataFrame, SaveMode, SparkSession}
import org.apache.spark.sql.expressions.Window
import org.apache.spark.sql.functions._

class Stats(spark: SparkSession) {
  import spark.implicits._

  private val env = new Env()
  private val bucket = env.get("AWS_S3_BUCKET")
  private val framesPath = s"s3a://$bucket/translated-frames"
  private val outputBase = s"s3a://$bucket/stats"

  // --- JDBC config pour lire la table "user" de better-auth ---
  private val jdbcUrl = {
    val host = env.get("POSTGRES_HOST")
    val port = env.get("POSTGRES_PORT")
    val db   = env.get("POSTGRES_DB")
    s"jdbc:postgresql://$host:$port/$db"
  }
  private val jdbcProps = {
    val p = new java.util.Properties()
    p.setProperty("user", env.get("POSTGRES_USER"))
    p.setProperty("password", env.get("POSTGRES_PASSWORD"))
    p.setProperty("driver", "org.postgresql.Driver")
    p
  }

  def run(): Unit = {
    val frames = spark.read.parquet(framesPath).cache()
    val total = frames.count()
    println(s"[Stats] translated-frames rows: $total")

    if (total == 0) {
      println("[Stats] nothing to aggregate — exiting")
      frames.unpersist()
      return
    }

    val users = loadUsers().cache()

    val perVideo = computePerVideo(frames).cache()

    writeJson(computeGlobal(frames, perVideo),       "global")
    writeJson(computePerUser(frames, perVideo, users), "per-user")
    writeJson(perVideo,                                 "per-video")

    writeJson(topUsersByVideoCount(perVideo, users),    "top/users-by-video-count")
    writeJson(topUsersByDuration(perVideo, users),      "top/users-by-duration")
    writeJson(topLongestVideos(perVideo),               "top/longest-videos")
    writeJson(topLetters(frames),                       "top/letters")

    exportAnnotations(frames)

    perVideo.unpersist()
    users.unpersist()
    frames.unpersist()
    println("[Stats] done")
  }

  // --- IO helpers ---

  private def writeJson(df: DataFrame, name: String): Unit = {
    df.coalesce(1)
      .write
      .mode(SaveMode.Overwrite)
      .json(s"$outputBase/$name")
    println(s"[Stats] -> $outputBase/$name")
  }

  private def loadUsers(): DataFrame = {
    spark.read
      .jdbc(jdbcUrl, """"user"""", jdbcProps) // "user" est un mot réservé → quoté
      .select(
        col("id").as("user_id"),
        col("email").as("user_email"),
        col("name").as("user_name"),
        col("image").as("user_image")
      )
  }

  // --- Par vidéo : nb_frames, durée, distribution, mot prédit ---

  private def computePerVideo(frames: DataFrame): DataFrame = {
    val w = Window.partitionBy("user_id", "video_id").orderBy("frame_idx")

    // Dédoublonne les lettres consécutives (hors "undefined")
    val dedup = frames
      .filter(col("translation") =!= "undefined")
      .withColumn("prev", lag("translation", 1).over(w))
      .filter(col("prev").isNull || col("translation") =!= col("prev"))

    val predictedWord = dedup
      .groupBy("user_id", "video_id")
      .agg(concat_ws("", collect_list("translation")).as("predicted_word"))

    val letterDist = frames
      .groupBy("user_id", "video_id", "translation")
      .agg(count("*").as("cnt"))
      .groupBy("user_id", "video_id")
      .agg(
        map_from_entries(collect_list(struct(col("translation"), col("cnt"))))
          .as("letter_distribution")
      )

    val basic = frames
      .groupBy("user_id", "video_id")
      .agg(
        count("*").as("nb_frames"),
        max("ts_ms").as("duration_ms"),
        countDistinct("translation").as("nb_distinct_letters")
      )

    basic
      .join(letterDist,    Seq("user_id", "video_id"), "left")
      .join(predictedWord, Seq("user_id", "video_id"), "left")
  }

  // --- Par utilisateur : totaux + distribution + lettre dominante + infos user ---

  private def computePerUser(frames: DataFrame, perVideo: DataFrame, users: DataFrame): DataFrame = {
    val totals = perVideo
      .groupBy("user_id")
      .agg(
        count("*").as("nb_videos"),
        sum("nb_frames").as("total_frames"),
        sum("duration_ms").as("total_duration_ms"),
        avg("duration_ms").as("avg_duration_ms"),
        avg("nb_frames").as("avg_frames_per_video")
      )

    val letterDist = frames
      .groupBy("user_id", "translation")
      .agg(count("*").as("cnt"))
      .groupBy("user_id")
      .agg(
        map_from_entries(collect_list(struct(col("translation"), col("cnt"))))
          .as("letter_distribution")
      )

    val topLetter = frames
      .filter(col("translation") =!= "undefined")
      .groupBy("user_id", "translation")
      .agg(count("*").as("cnt"))
      .withColumn("rnk", row_number().over(Window.partitionBy("user_id").orderBy(desc("cnt"))))
      .filter(col("rnk") === 1)
      .select(col("user_id"), col("translation").as("top_letter"))

    totals
      .join(letterDist, Seq("user_id"), "left")
      .join(topLetter,  Seq("user_id"), "left")
      .join(users,      Seq("user_id"), "left")
  }

  // --- Global ---

  private def computeGlobal(frames: DataFrame, perVideo: DataFrame): DataFrame = {
    val basic = frames.agg(
      countDistinct("user_id").as("total_users"),
      countDistinct("video_id").as("total_videos"),
      count("*").as("total_frames")
    )

    val duration = perVideo.agg(
      sum("duration_ms").as("total_duration_ms"),
      avg("duration_ms").as("avg_duration_ms_per_video"),
      avg("nb_frames").as("avg_frames_per_video")
    )

    val letterDist = frames
      .groupBy("translation")
      .agg(count("*").as("cnt"))
      .agg(
        map_from_entries(collect_list(struct(col("translation"), col("cnt"))))
          .as("letter_distribution")
      )

    basic.crossJoin(duration).crossJoin(letterDist)
  }

  // --- Tops ---

  private def topUsersByVideoCount(perVideo: DataFrame, users: DataFrame): DataFrame =
    perVideo.groupBy("user_id")
      .agg(count("*").as("nb_videos"))
      .join(users, Seq("user_id"), "left")
      .orderBy(desc("nb_videos"))
      .limit(10)

  private def topUsersByDuration(perVideo: DataFrame, users: DataFrame): DataFrame =
    perVideo.groupBy("user_id")
      .agg(sum("duration_ms").as("total_duration_ms"))
      .join(users, Seq("user_id"), "left")
      .orderBy(desc("total_duration_ms"))
      .limit(10)

  private def topLongestVideos(perVideo: DataFrame): DataFrame =
    perVideo.select("user_id", "video_id", "duration_ms", "nb_frames", "predicted_word")
      .orderBy(desc("duration_ms"))
      .limit(10)

  private def topLetters(frames: DataFrame): DataFrame =
    frames.filter(col("translation") =!= "undefined")
      .groupBy("translation")
      .agg(count("*").as("cnt"))
      .orderBy(desc("cnt"))
      .limit(30)

  // --- Annotations : un JSON par vidéo pour l'overlay du viewer ---

  private def exportAnnotations(frames: DataFrame): Unit = {
    frames
      .select("user_id", "video_id", "frame_idx", "ts_ms", "translation")
      .orderBy("user_id", "video_id", "frame_idx")
      .write
      .mode(SaveMode.Overwrite)
      .partitionBy("user_id", "video_id")
      .json(s"$outputBase/annotations")
    println(s"[Stats] -> $outputBase/annotations (partitionné par user_id/video_id)")
  }
}