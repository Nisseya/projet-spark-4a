package workers

// this worker is from picking images and put them into parquet files that are the same as the training material

import lib.{Database, Env}
import org.apache.spark.sql.{SaveMode, SparkSession}
import org.apache.spark.sql.functions._


import java.nio.file.Paths

class ProcessWorker  (
                       fps: Int = 5,
                       framesPerShard: Int = 50
                     ) {

  private val db = new Database()

  private val env = new Env()

//  private val bucket = env.get("AWS_S3_BUCKET")
  private val endpoint = env.get("AWS_S3_ENDPOINT")
  private val access_key_id = env.get("AWS_ACCESS_KEY_ID")
  private val secret_access_key = env.get("AWS_SECRET_ACCESS_KEY")

  private val spark: SparkSession =
    SparkSession.builder()
      .appName("ProcessWorker")
      .master("local[*]")
      .config("spark.hadoop.fs.s3a.endpoint", endpoint)
      .config("spark.hadoop.fs.s3a.access.key", access_key_id)
      .config("spark.hadoop.fs.s3a.secret.key", secret_access_key)
      .config("spark.hadoop.fs.s3a.path.style.access", "true")
      .config("spark.hadoop.fs.s3a.connection.ssl.enabled", "false")
      .getOrCreate()
  spark.sparkContext.setLogLevel("ERROR")


  def run():Unit= {
    while (true) {
      db.get_processing_job() match{
        case None =>
          println("rien trouvé")
          Thread.sleep(1000)
        case Some(video_id)=>
          try {
            println(video_id)
            this.process(video_id)
            this.db.set_extraction_success(video_id = video_id)
          }
          catch {
            case e: Throwable =>
              this.db.set_failure(video_id = video_id, error = e)
              println(e.getMessage)
              Thread.sleep(10000)
          }
      }
    }
  }

  private def process(video_id: String): Unit={
    val bucket = env.get("AWS_S3_BUCKET")
    val local_extract_dir = Paths.get(s"/tmp/extract/$video_id")
    val inputGlob = s"file://$local_extract_dir/frame_*.jpg"
    val output_path = s"s3a://$bucket/extracted-images-raw/$video_id"

    val df0 =
      this.spark.read
        .format("binaryFile")
        .option("pathGlobFilter", "*.jpg")
        .load(inputGlob)
        .select(
          col("path"),
          col("content").as("jpeg"),
          col("length").as("byte_len")
        )

    val frameIdxCol =
      regexp_extract(col("path"), "frame_(\\d+)\\.jpg$", 1).cast("int")

    val df =
      df0
        .withColumn("video_id", lit(video_id))
        .withColumn("frame_idx", frameIdxCol)
        .filter(col("frame_idx").isNotNull) // sécurité
        .withColumn("ts_ms",
          ((col("frame_idx") - lit(1)) * lit(1000L) / lit(fps)).cast("long")
        )
        .withColumn("shard_id",
          ((col("frame_idx") - lit(1)) / lit(framesPerShard)).cast("int")
        )
        .select(
          col("video_id"),
          col("frame_idx"),
          col("ts_ms"),
          col("shard_id"),
          col("jpeg"),
          col("byte_len")
        )

    val dfW =
      df.repartition(col("shard_id"))

    dfW.write
      .mode(SaveMode.Overwrite)
      .partitionBy("shard_id")
      .parquet(output_path)

    val manifestPath = s"s3a://$bucket/extracted_parquet/$video_id/_manifest"
    df.groupBy("video_id", "shard_id")
      .agg(
        count(lit(1)).as("n_frames"),
        min(col("frame_idx")).as("min_frame"),
        max(col("frame_idx")).as("max_frame"),
        min(col("ts_ms")).as("min_ts_ms"),
        max(col("ts_ms")).as("max_ts_ms")
      )
      .orderBy(col("shard_id"))
      .coalesce(1)
      .write.mode(SaveMode.Overwrite)
      .json(manifestPath)
  }

}
