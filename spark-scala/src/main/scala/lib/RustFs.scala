package lib

import software.amazon.awssdk.auth.credentials.{AwsBasicCredentials, StaticCredentialsProvider}
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model._
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.core.ResponseInputStream
import java.net.URI
import scala.jdk.CollectionConverters._

final class RustFs {

  final case class S3Object(key: String, size: Long)

  private val env = new Env()

  private val bucket = env.get("AWS_S3_BUCKET")
  private val endpoint = env.get("AWS_S3_ENDPOINT")
  private val region = env.get("AWS_REGION", "us-east-1")
  private val accessKeyId = env.get("AWS_ACCESS_KEY_ID")
  private val secretAccessKey = env.get("AWS_SECRET_ACCESS_KEY")

  private val client: S3Client = {
    val b =
      S3Client.builder()
        .region(Region.of(region))
        .credentialsProvider(
          StaticCredentialsProvider.create(
            AwsBasicCredentials.create(accessKeyId, secretAccessKey)
          )
        )
        .forcePathStyle(true)

    if (endpoint != null && endpoint.nonEmpty)
      b.endpointOverride(URI.create(endpoint))

    b.build()
  }

  private def list(prefix: String = ""): Seq[S3Object] = {
    val req = ListObjectsV2Request.builder().bucket(bucket).prefix(prefix).build()
    client
      .listObjectsV2Paginator(req)
      .contents()
      .asScala
      .map(o => S3Object(o.key(), o.size()))
      .toSeq
  }

  private def read(key: String): Array[Byte] = {
    val req = GetObjectRequest.builder().bucket(bucket).key(key).build()
    client.getObjectAsBytes(req).asByteArray()
  }

  private def put(
           key: String,
           bytes: Array[Byte],
           contentType: String = "application/octet-stream"
         ): Unit = {
    val req = PutObjectRequest.builder().bucket(bucket).key(key).contentType(contentType).build()
    client.putObject(req, RequestBody.fromBytes(bytes))
    ()
  }

  private def getObjectStream(key: String): ResponseInputStream[GetObjectResponse] = {
    val req = GetObjectRequest.builder().bucket(bucket).key(key).build()
    client.getObject(req)
  }

  def get_raw_video_stream(video_id: String):ResponseInputStream[GetObjectResponse] = {
    val video_key: String = s"raw-video/$video_id.mp4"
    println(video_key)
    getObjectStream(video_key)
  }
}
