package lib

import org.apache.spark.ml.classification.RandomForestClassificationModel
import org.apache.spark.ml.feature.{IndexToString, StringIndexerModel}
import org.apache.spark.sql.{DataFrame, SparkSession}
import org.apache.spark.sql.functions.col

class Translator(spark: SparkSession) {
  private val env = new Env()
  private val bucket = env.get("AWS_S3_BUCKET")
  private val decoder = new ImageDecoder(imgSize = 16)

  private val model: RandomForestClassificationModel =
    RandomForestClassificationModel.load(s"s3a://$bucket/models/asl-rf")

  private val indexerModel: StringIndexerModel =
    StringIndexerModel.load(s"s3a://$bucket/models/asl-indexer")

  private val converter = new IndexToString()
    .setInputCol("prediction")
    .setOutputCol("translation")
    .setLabels(indexerModel.labelsArray(0))

  /** Ajoute une colonne `translation: String` au DataFrame d'entrée.
   *  Attend une colonne `jpeg: Array[Byte]`. */
  def translate(frames: DataFrame): DataFrame = {
    val withFeatures = frames
      .withColumn("features", decoder.decodeUdf(col("jpeg")))
      .filter(col("features").isNotNull)

    val withPrediction = model.transform(withFeatures)

    converter.transform(withPrediction)
      .drop("features", "rawPrediction", "probability", "prediction")
  }
}