import lib.{Database, Env}
import org.apache.spark.sql.SparkSession
import workers.{FrameBatchBuilder, FrameTranslator, VideoExtractor}

object Main {
  def main(args: Array[String]): Unit = {
    val env = new Env()
    val db = new Database()

    val spark = SparkSession.builder()
      .appName("Main")
      .master("local[*]")
      .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem")
      .config("spark.hadoop.fs.s3a.endpoint", env.get("AWS_S3_ENDPOINT"))
      .config("spark.hadoop.fs.s3a.access.key", env.get("AWS_ACCESS_KEY_ID"))
      .config("spark.hadoop.fs.s3a.secret.key", env.get("AWS_SECRET_ACCESS_KEY"))
      .config("spark.hadoop.fs.s3a.path.style.access", "true")
      .config("spark.hadoop.fs.s3a.connection.ssl.enabled", "false")
      .config("spark.hadoop.fs.s3a.committer.name", "directory")
      .config("spark.hadoop.fs.s3a.committer.staging.conflict-mode", "append")
      .config("spark.hadoop.fs.s3a.committer.staging.tmp.path", "/tmp/s3a-staging")
      .config("spark.hadoop.fs.s3a.experimental.input.fadvise", "sequential")
      .config("spark.hadoop.fs.s3a.change.detection.mode", "none")
      .config("spark.hadoop.fs.s3a.change.detection.version.required", "false")
      .config("spark.sql.sources.commitProtocolClass",
        "org.apache.spark.internal.io.cloud.PathOutputCommitProtocol")
      .config("spark.sql.parquet.output.committer.class",
        "org.apache.spark.internal.io.cloud.BindingParquetOutputCommitter")
      .config("parquet.summary.metadata.level", "NONE")
      .config("mapreduce.fileoutputcommitter.marksuccessfuljobs", "false")
      .getOrCreate()

    spark.sparkContext.setLogLevel("ERROR")

    val extractor = new VideoExtractor(fps = 5)
    val builder = new FrameBatchBuilder(spark, fps = 5, framesPerShard = 500)
    val translator = new FrameTranslator(spark)

    val batchSize = 10
    val pendingVideoIds = db.get_pending_video_ids()

    pendingVideoIds.grouped(batchSize).foreach { batchIds =>
      val extracted = batchIds.flatMap { videoId =>
        try {
          db.set_status(videoId, "EXTRACTING")
          Some(extractor.extract(Seq(videoId)).head)
        } catch {
          case e: Throwable =>
            System.err.println(s"[EXTRACT FAILED] videoId=$videoId")
            e.printStackTrace()
            db.set_failure(videoId, e)
            None
        }
      }

      if (extracted.nonEmpty) {
        try {
          extracted.foreach(v => db.set_status(v.videoId, "PROCESSING"))

          val frames = builder.build(extracted)
          translator.translate(frames)

          extracted.foreach(v => db.set_annotation_complete(v.videoId))
        } catch {
          case e: Throwable =>
            System.err.println("[BATCH FAILED]")
            e.printStackTrace()
            extracted.foreach(v => db.set_failure(v.videoId, e))
        }
      }
    }
    spark.stop()
  }
}