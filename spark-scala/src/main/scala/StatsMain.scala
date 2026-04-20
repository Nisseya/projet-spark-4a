import lib.Env
import org.apache.spark.sql.SparkSession
import workers.Stats

object StatsMain {
  def main(args: Array[String]): Unit = {
    val env = new Env()

    val spark = SparkSession.builder()
      .appName("Stats")
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


    try new Stats(spark).run()
    finally spark.stop()
  }
}