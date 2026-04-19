package lib

import org.apache.spark.ml.linalg.{Vector, Vectors}
import org.apache.spark.sql.expressions.UserDefinedFunction
import org.apache.spark.sql.functions

import java.awt.image.BufferedImage
import java.io.ByteArrayInputStream
import javax.imageio.ImageIO

class ImageDecoder(imgSize: Int = 16) extends Serializable {
  private val size = imgSize

  val decodeUdf: UserDefinedFunction = functions.udf { bytes: Array[Byte] =>
    if (bytes == null || bytes.isEmpty) null.asInstanceOf[Vector]
    else {
      try {
        val src = ImageIO.read(new ByteArrayInputStream(bytes))
        if (src == null) null.asInstanceOf[Vector]
        else {
          val resized = new BufferedImage(size, size, BufferedImage.TYPE_BYTE_GRAY)
          val g = resized.createGraphics()
          try {
            g.drawImage(src.getScaledInstance(size, size, java.awt.Image.SCALE_FAST), 0, 0, null)
          } finally g.dispose()

          val raster = resized.getRaster
          val pixels = Array.tabulate(size * size) { i =>
            raster.getSample(i % size, i / size, 0) / 255.0
          }
          Vectors.dense(pixels)
        }
      } catch {
        case _: Throwable => null.asInstanceOf[Vector]
      }
    }
  }
}