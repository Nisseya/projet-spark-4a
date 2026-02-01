package rustfs

import software.amazon.awssdk.auth.credentials._
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3._
import software.amazon.awssdk.services.s3.model._
import io.github.cdimascio.dotenv.Dotenv

import java.net.URI
import scala.jdk.CollectionConverters._

final case class S3Object(key: String, size: Long)

object Env {
  private val dotenv = Dotenv.configure().ignoreIfMissing().load()

  def get(name: String, default: => String = null): String = {
    val v = Option(System.getenv(name))
      .orElse(Option(dotenv.get(name, null)))
      .map(_.trim)
      .filter(_.nonEmpty)
      .orNull
    if (v != null) v
    else if (default != null) default
    else throw new IllegalArgumentException(s"Missing env var: $name")
  }
}

final class RustFS(
                    bucket: String = Env.get("AWS_S3_BUCKET"),
                    endpoint: String = Env.get("AWS_S3_ENDPOINT", "http://localhost:9000"),
                    region: String = Env.get("AWS_REGION", "us-east-1"),
                    accessKeyId: String = Env.get("AWS_ACCESS_KEY_ID"),
                    secretAccessKey: String = Env.get("AWS_SECRET_ACCESS_KEY")
                  ) {
  private val client: S3Client =
    S3Client.builder()
      .endpointOverride(URI.create(endpoint))
      .region(Region.of(region))
      .credentialsProvider(
        StaticCredentialsProvider.create(
          AwsBasicCredentials.create(accessKeyId, secretAccessKey)
        )
      )
      .forcePathStyle(true)
      .build()

  def list(prefix: String = ""): Seq[S3Object] = {
    val req = ListObjectsV2Request.builder().bucket(bucket).prefix(prefix).build()
    client.listObjectsV2Paginator(req).contents().asScala.map(o => S3Object(o.key(), o.size())).toSeq
  }

  def read(key: String): Array[Byte] = {
    val req = GetObjectRequest.builder().bucket(bucket).key(key).build()
    client.getObjectAsBytes(req).asByteArray()
  }

  def put(key: String, bytes: Array[Byte], contentType: String = "application/octet-stream"): Unit = {
    val req = PutObjectRequest.builder().bucket(bucket).key(key).contentType(contentType).build()
    client.putObject(req, software.amazon.awssdk.core.sync.RequestBody.fromBytes(bytes))
    ()
  }
}
