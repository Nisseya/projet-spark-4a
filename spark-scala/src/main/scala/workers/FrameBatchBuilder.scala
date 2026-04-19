package workers

import org.apache.spark.sql.{DataFrame, SparkSession}
import org.apache.spark.sql.functions._

class FrameBatchBuilder(
                         spark: SparkSession,
                         fps: Int = 5,
                         framesPerShard: Int = 50
                       ) {

  def build(videos: Seq[ExtractedVideo]): DataFrame = {
    println(s"[FrameBatchBuilder] build start videos=${videos.size}")

    if (videos.isEmpty) {
      throw new IllegalArgumentException("no videos to build")
    }

    val dfs = videos.map { video =>
      println(s"[FrameBatchBuilder] reading videoId=${video.videoId} framesDir=${video.framesDir}")
      readFrames(video)
    }

    val result = dfs.reduce(_ unionByName _)
      .repartition(col("user_id"), col("video_id"), col("shard_id"))

    println("[FrameBatchBuilder] build done")
    result
  }

  private def readFrames(video: ExtractedVideo): DataFrame = {
    val path = s"file://${video.framesDir.toAbsolutePath}/*"
    println(s"[FrameBatchBuilder] load path=$path")

    val df = spark.read
      .format("binaryFile")
      .option("pathGlobFilter", "*.jpg")
      .load(path)
      .select(
        regexp_extract(col("path"), "frame_(\\d+)\\.jpg$", 1).cast("int").as("frame_idx"),
        col("content").as("jpeg"),
        col("length").as("byte_len")
      )
      .filter(col("frame_idx").isNotNull)
      .withColumn("user_id", lit(video.userId))
      .withColumn("video_id", lit(video.videoId))
      .withColumn("ts_ms", ((col("frame_idx") - 1) * lit(1000L) / lit(fps)).cast("long"))
      .withColumn("shard_id", ((col("frame_idx") - 1) / lit(framesPerShard)).cast("int"))
      .select("user_id", "video_id", "frame_idx", "ts_ms", "shard_id", "jpeg", "byte_len")

    println(s"[FrameBatchBuilder] dataframe ready videoId=${video.videoId}")
    df
  }
}