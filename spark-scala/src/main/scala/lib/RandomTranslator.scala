package lib

import org.apache.spark.sql.Column
import org.apache.spark.sql.functions._

class RandomTranslator {
  def translate(): Column = {
    when(rand() < 0.5, lit("undefined"))
      .otherwise(expr("char(ascii('A') + cast(floor(rand() * 26) as int))"))
  }
}