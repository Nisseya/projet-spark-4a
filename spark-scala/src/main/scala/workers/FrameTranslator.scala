package workers

import lib.{Env, Translator}
import org.apache.spark.sql.{DataFrame, SaveMode, SparkSession}

class FrameTranslator(spark: SparkSession) {
  private val env = new Env()
  private val translator = new Translator(spark)

  def translate(frames: DataFrame): String = {
    val bucket = env.get("AWS_S3_BUCKET")
    val outputPath = s"s3a://$bucket/translated-frames"

    translator.translate(frames)
      .select("user_id", "video_id", "frame_idx", "ts_ms", "shard_id", "translation")
      .write
      .mode(SaveMode.Append)
      .partitionBy("user_id", "video_id", "shard_id")
      .parquet(outputPath)

    outputPath
  }
}