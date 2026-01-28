package rustfs

import software.amazon.awssdk.auth.credentials._
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3._
import software.amazon.awssdk.services.s3.model._

import java.net.URI
import scala.jdk.CollectionConverters._

final case class S3Object(key: String, size: Long)

final class RustFS(
                    bucket: String = sys.env("AWS_S3_BUCKET"),
                    endpoint: String = sys.env.getOrElse("AWS_S3_ENDPOINT", "http://localhost:9000"),
                    region: String = sys.env.getOrElse("AWS_REGION", "us-east-1")
                  ) {
  private val client: S3Client =
    S3Client.builder()
      .endpointOverride(URI.create(endpoint))
      .region(Region.of(region))
      .credentialsProvider(
        StaticCredentialsProvider.create(
          AwsBasicCredentials.create(
            sys.env("AWS_ACCESS_KEY_ID"),
            sys.env("AWS_SECRET_ACCESS_KEY")
          )
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
}
