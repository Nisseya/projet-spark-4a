package workers

import lib.{Env, ImageDecoder}
import org.apache.spark.ml.classification.RandomForestClassifier
import org.apache.spark.ml.evaluation.MulticlassClassificationEvaluator
import org.apache.spark.ml.feature.StringIndexer
import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions.col

class Trainer(spark: SparkSession) {
  private val env = new Env()
  private val bucket = env.get("AWS_S3_BUCKET")
  private val decoder = new ImageDecoder(imgSize = 16)

  def run(): Unit = {
    val trainPath = s"s3a://$bucket/datasets/asl/train/"
    println(s"[Trainer] loading from $trainPath")

    val decodedDf = spark.read.parquet(trainPath)
      .withColumn("features", decoder.decodeUdf(col("image_bytes")))
      .select("label", "features")
      .filter(col("features").isNotNull)

    val Array(trainDf, validationDf) =
      decodedDf.randomSplit(Array(0.8, 0.2), seed = 42L)

    val indexer = new StringIndexer()
      .setInputCol("label")
      .setOutputCol("labelIdx")
      .fit(decodedDf)

    val trainReady      = indexer.transform(trainDf).select("features", "labelIdx")
    val validationReady = indexer.transform(validationDf).select("features", "labelIdx")

    println("[Trainer] training RF (50 trees, depth 8)")
    val rf = new RandomForestClassifier()
      .setLabelCol("labelIdx")
      .setFeaturesCol("features")
      .setNumTrees(50)
      .setMaxDepth(8)
      .setSeed(42L)

    val model = rf.fit(trainReady)

    val predictions = model.transform(validationReady)
    val accuracy = new MulticlassClassificationEvaluator()
      .setLabelCol("labelIdx")
      .setPredictionCol("prediction")
      .setMetricName("accuracy")
      .evaluate(predictions)

    println(f"[Trainer] validation accuracy = ${accuracy * 100}%.2f%%")

    val modelPath   = s"s3a://$bucket/models/asl-rf"
    val indexerPath = s"s3a://$bucket/models/asl-indexer"
    model.write.overwrite().save(modelPath)
    indexer.write.overwrite().save(indexerPath)
    println(s"[Trainer] saved model   -> $modelPath")
    println(s"[Trainer] saved indexer -> $indexerPath")
  }
}