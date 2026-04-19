package workers

import lib.{Database, RustFs}
import software.amazon.awssdk.core.ResponseInputStream
import software.amazon.awssdk.services.s3.model.GetObjectResponse

import java.nio.file.{Files, Path, Paths, StandardCopyOption}

final case class ExtractedVideo(
                                 userId: String,
                                 videoId: String,
                                 framesDir: Path
                               )

class VideoExtractor(fps: Int = 5) {
  private val db = new Database()
  private val objectStore = new RustFs()

  def extract(videoIds: Seq[String]): Seq[ExtractedVideo] = {
    println(s"[Extractor] start batch size=${videoIds.size}")

    videoIds.map { videoId =>
      println(s"[Extractor] processing videoId=$videoId")

      val userId = db
        .get_user_id(videoId)
        .getOrElse(throw new NoSuchElementException(s"user not found for video $videoId"))

      val videoKey = db
        .get_video_key(videoId)
        .getOrElse(throw new NoSuchElementException(s"video not found: $videoId"))

      println(s"[Extractor] userId=$userId videoKey=$videoKey")

      val framesDir = Paths.get(s"/tmp/extract/$videoId")
      Files.createDirectories(framesDir)

      println(s"[Extractor] framesDir=$framesDir")

      val videoStream = objectStore.get_raw_video_stream(videoKey)
      println(s"[Extractor] stream opened")

      try {
        extractFrames(videoStream, framesDir)
        println(s"[Extractor] extraction done videoId=$videoId")
      } finally {
        videoStream.close()
        println(s"[Extractor] stream closed")
      }

      ExtractedVideo(userId = userId, videoId = videoId, framesDir = framesDir)
    }
  }

  private def extractFrames(
                             videoStream: ResponseInputStream[GetObjectResponse],
                             framesDir: Path
                           ): Unit = {
    val tmpFile = Files.createTempFile("video_", ".bin")
    println(s"[Extractor] tmpFile=$tmpFile")

    try {
      Files.copy(videoStream, tmpFile, StandardCopyOption.REPLACE_EXISTING)
      println(s"[Extractor] file copied")

      val outputPattern = framesDir.resolve("frame_%06d.jpg").toString
      println(s"[Extractor] running ffmpeg -> $outputPattern")

      val process = new ProcessBuilder(
        "ffmpeg",
        "-hide_banner",
        "-loglevel", "error",
        "-i", tmpFile.toString,
        "-vf", s"fps=$fps",
        "-q:v", "2",
        outputPattern
      ).start()

      val stderr = scala.io.Source.fromInputStream(process.getErrorStream).mkString
      val exitCode = process.waitFor()

      println(s"[Extractor] ffmpeg exitCode=$exitCode")

      if (exitCode != 0) {
        println(s"[Extractor] ffmpeg error=$stderr")
        throw new RuntimeException(s"ffmpeg failed: $stderr")
      }
    } finally {
      Files.deleteIfExists(tmpFile)
      println(s"[Extractor] tmpFile deleted")
    }
  }
}