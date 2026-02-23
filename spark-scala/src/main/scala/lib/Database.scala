package lib
import java.sql.{Connection, DriverManager}


class Database {
  private val env = new Env()
  private val user = env.get("POSTGRES_USER")
  private val db = env.get("POSTGRES_DB")
  private val host = env.get("POSTGRES_HOST")
  private val port = env.get("POSTGRES_PORT")
  private val password = env.get("POSTGRES_PASSWORD")

  private val url =s"jdbc:postgresql://$host:$port/$db"

  private def connect(): Connection = DriverManager.getConnection(url, user, password)


  private def get_job(status:String): Option[String] = {
    val conn: Connection = this.connect()
    val query: String = "SELECT id from videos WHERE status=? ORDER BY updated_at LIMIT 1"
    val stmt = conn.prepareStatement(query)
    stmt.setString(1, status)
    val rs   = stmt.executeQuery()
    var video_id: Option[String]= None
    if (rs.next())
      video_id = Some(rs.getString("id"))
    rs.close()
    stmt.close()
    conn.close()
    video_id

  }

  def get_extraction_job(): Option[String] = {
    get_job("UPLOAD_COMPLETE")
  }

  def get_processing_job(): Option[String] = {
    get_job("EXTRACTION_COMPLETE")
  }

  def get_annotation_job(): Option[String] = {
    get_job("PROCESSING_COMPLETE")
  }

  private def set_job(video_id:String, status:String): Unit={
    val conn: Connection = this.connect()
    val sql =
      "UPDATE videos SET status = ? WHERE id = ?"
    val ps = conn.prepareStatement(sql)
    ps.setString(1, status)
    ps.setString(2, video_id)
    ps.executeUpdate()
    ps.close()
    conn.close()
  }

  def set_extraction_success(video_id: String): Unit={
    this.set_job(video_id=video_id,status= "EXTRACTION_COMPLETE")
  }

  def set_processing_success(video_id: String): Unit={
    this.set_job(video_id=video_id, status="PROCESSING_COMPLETE")
  }

  def set_annotation_complete(video_id: String): Unit = {
    this.set_job(video_id = video_id , status="ANNOTATION_COMPLETE")
  }

  def set_failure(video_id:String,error: Throwable): Unit = {
    val error_message = error.getMessage
    this.set_job(video_id = video_id, status = "FAILED")
  }

  def getVideoKey(videoId: String): Option[String] = {
    val conn = this.connect()
    val sql = "SELECT video_key FROM videos WHERE id = ?"
    val ps = conn.prepareStatement(sql)
    ps.setString(1, videoId)

    val rs = ps.executeQuery()
    val result =
      if (rs.next()) Some(rs.getString("video_key"))
      else None

    rs.close()
    ps.close()
    conn.close()

    result
  }
}