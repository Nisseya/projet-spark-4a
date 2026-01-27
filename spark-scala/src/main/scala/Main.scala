import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions.desc

object Main {
  def main(args: Array[String]): Unit = {
    val spark = SparkSession.builder()
      .appName("SparkScalaWSL")
      .master("local[*]")
      .getOrCreate()

    spark.sparkContext.setLogLevel("WARN")


    import spark.implicits._  // ✅ encoders + toDF/toDS

    val text = Seq("voici une phrase complete", "voici une autre phrase")
    val df = spark.createDataset(text).toDF("line")

    val counts =
      df.selectExpr("explode(split(line, ' ')) as word")
        .groupBy("word")
        .count()
        .orderBy(desc("count"))

    counts.show(false)
    spark.stop()
  }
}
