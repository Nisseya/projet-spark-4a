package lib
import java.sql.{Connection, DriverManager, PreparedStatement, ResultSet}

class Database {
  private val env = new Env()
  private val user = env.get("POSTGRES_USER")
  private val db = env.get("POSTGRES_DB")
  private val host = env.get("POSTGRES_HOST")
  private val port = env.get("POSTGRES_PORT")
  private val password = env.get("POSTGRES_PASSWORD")

  private val url = s"jdbc:postgresql://$host:$port/$db"

  private def connect(): Connection = DriverManager.getConnection(url, user, password)

  private def get_job(status: String): Option[String] = {
    val conn = this.connect()
    val query = "SELECT id from videos WHERE status=? ORDER BY updated_at LIMIT 1"
    val stmt = conn.prepareStatement(query)

    try {
      stmt.setString(1, status)
      val rs = stmt.executeQuery()
      if (rs.next()) Some(rs.getString("id")) else None
    } finally {
      stmt.close()
      conn.close()
    }
  }

  def get_pending_video_ids(): Seq[String] = {
    val conn = this.connect()
    val stmt = conn.prepareStatement(
      "SELECT id FROM videos WHERE status='UPLOAD_COMPLETE' ORDER BY created_at"
    )

    try {
      val rs = stmt.executeQuery()
      val buffer = scala.collection.mutable.ArrayBuffer.empty[String]
      while (rs.next()) {
        buffer += rs.getString("id")
      }
      buffer.toSeq
    } finally {
      stmt.close()
      conn.close()
    }
  }

  def get_user_id(videoId: String): Option[String] = {
    val conn = this.connect()
    val stmt = conn.prepareStatement(
      "SELECT created_by FROM videos WHERE id=?"
    )

    try {
      stmt.setString(1, videoId)
      val rs = stmt.executeQuery()
      if (rs.next()) Some(rs.getString("created_by")) else None
    } finally {
      stmt.close()
      conn.close()
    }
  }

  def get_video_key(videoId: String): Option[String] = {
    val conn = this.connect()
    val stmt = conn.prepareStatement(
      "SELECT video_key FROM videos WHERE id=?"
    )

    try {
      stmt.setString(1, videoId)
      val rs = stmt.executeQuery()
      if (rs.next()) Some(rs.getString("video_key")) else None
    } finally {
      stmt.close()
      conn.close()
    }
  }

  def set_status(videoId: String, status: String): Unit = {
    val conn = this.connect()
    val stmt = conn.prepareStatement(
      "UPDATE videos SET status=?, updated_at=now() WHERE id=?"
    )

    try {
      stmt.setString(1, status)
      stmt.setString(2, videoId)
      stmt.executeUpdate()
    } finally {
      stmt.close()
      conn.close()
    }
  }

  def set_failure(videoId: String, error: Throwable): Unit = {
    val conn = this.connect()
    val stmt = conn.prepareStatement(
      "UPDATE videos SET status='FAILED', error=?, updated_at=now() WHERE id=?"
    )

    try {
      stmt.setString(1, Option(error.getMessage).getOrElse(error.toString))
      stmt.setString(2, videoId)
      stmt.executeUpdate()
    } finally {
      stmt.close()
      conn.close()
    }
  }

  def set_annotation_complete(videoId: String): Unit = {
    val conn = this.connect()
    val stmt = conn.prepareStatement(
      "UPDATE videos SET status='DONE', error=null, updated_at=now() WHERE id=?"
    )

    try {
      stmt.setString(1, videoId)
      stmt.executeUpdate()
    } finally {
      stmt.close()
      conn.close()
    }
  }

  def set_frames_prefix(videoId: String, prefix: String): Unit = {
    val conn = this.connect()
    val stmt = conn.prepareStatement(
      "UPDATE videos SET frames_prefix=?, updated_at=now() WHERE id=?"
    )

    try {
      stmt.setString(1, prefix)
      stmt.setString(2, videoId)
      stmt.executeUpdate()
    } finally {
      stmt.close()
      conn.close()
    }
  }

  def set_result_key(videoId: String, key: String): Unit = {
    val conn = this.connect()
    val stmt = conn.prepareStatement(
      "UPDATE videos SET result_key=?, updated_at=now() WHERE id=?"
    )

    try {
      stmt.setString(1, key)
      stmt.setString(2, videoId)
      stmt.executeUpdate()
    } finally {
      stmt.close()
      conn.close()
    }
  }
}