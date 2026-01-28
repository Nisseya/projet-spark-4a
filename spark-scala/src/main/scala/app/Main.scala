package app
import org.apache.spark.sql.SparkSession
import rustfs.RustFS

object Main {
  def main(args: Array[String]): Unit = {
    val spark = SparkSession.builder()
      .appName("asl-spark")
      .master("local[*]")
      .getOrCreate()

    val fs = new RustFS()

    fs.list("train/A").take(5).foreach(println)

    // Spark côté data:
    // val rdd = spark.sparkContext.binaryFiles("s3a://asl-spark/train")
    // ...

    spark.stop()
  }
}
