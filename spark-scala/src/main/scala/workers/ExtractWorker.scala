package workers

import lib.Database
import lib.RustFs
import software.amazon.awssdk.core.ResponseInputStream
import software.amazon.awssdk.services.s3.model.GetObjectResponse

import java.nio.file.{Files, Path, Paths}
import scala.jdk.CollectionConverters.asScalaIteratorConverter


class ExtractWorker(fps: Int = 5) {
  private val db = new Database()
  private val object_store = new RustFs()


  def run():Unit= {
    while (true) {
      db.get_extraction_job() match{
        case None => Thread.sleep(1000)
        case Some(video_id)=>
          println("Found a job")
          try {
            println(video_id)
            this.process(video_id)
          }
          catch {
            case e: Throwable =>
              println(e.getMessage)
              Thread.sleep(10000)
          }
      }
    }
  }

  private def process(video_id: String): Unit={
    val outDir = Paths.get(s"/tmp/extract/$video_id")
    Files.createDirectories(outDir)

    val video_in: ResponseInputStream[GetObjectResponse] = this.object_store.get_raw_video_stream(video_id)
    try {
      val n = extract_images_ffmpeg(video_in, outDir, fps = this.fps)
      println(s"Extracted $n frames into $outDir")
    } finally {
      video_in.close()
    }
    
    this.db.set_processing_success(video_id)
  }

  private def extract_images_ffmpeg(
                                     videoStream: ResponseInputStream[GetObjectResponse],
                                     outDir: Path,
                                     fps: Int
                                   ): Int = {

    Files.createDirectories(outDir)

    // 1) écrire le flux dans un fichier temp
    val tmp = Files.createTempFile("video_", ".bin")
    try {
      Files.copy(videoStream, tmp, java.nio.file.StandardCopyOption.REPLACE_EXISTING)

      // 2) lancer ffmpeg sur le fichier temp
      val outputPattern = outDir.resolve("frame_%06d.jpg").toString
      val cmd = List(
        "ffmpeg",
        "-hide_banner",
        "-loglevel", "error",
        "-i", tmp.toString,
        "-vf", s"fps=$fps",
        "-q:v", "2",
        outputPattern
      )

      val pb = new ProcessBuilder(cmd: _*)
      val p = pb.start()

      val stderr = scala.io.Source.fromInputStream(p.getErrorStream).mkString
      val exit = p.waitFor()

      if (exit != 0) {
        throw new RuntimeException(s"ffmpeg failed (exit=$exit):\n$stderr")
      }

      val count = Files.list(outDir).iterator().asScala.count { p =>
        val n = p.getFileName.toString
        n.startsWith("frame_") && n.endsWith(".jpg")
      }
      count
    } finally {
      try Files.deleteIfExists(tmp) catch { case _: Throwable => () }
    }
  }
}
