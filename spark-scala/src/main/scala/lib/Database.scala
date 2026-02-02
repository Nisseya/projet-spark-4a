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
    val query: String = "SELECT video_id from jobs WHERE status=? ORDER BY updated_at LIMIT 1"
    val stmt = conn.prepareStatement(query)
    stmt.setString(1, status)
    val rs   = stmt.executeQuery()
    var video_id: Option[String]= None
    if (rs.next())
      video_id = Some(rs.getString("video_id"))
    rs.close()
    stmt.close()
    conn.close()
    video_id

  }

  def get_extraction_job(): Option[String] = {
    get_job("QUEUED_EXTRACT")
  }

  def get_processing_job(): Option[String] = {
    get_job("EXTRACTION_COMPLETE")
  }

  private def set_job(video_id:String, status:String): Unit={
    val conn: Connection = this.connect()
    val sql =
      "UPDATE jobs SET status = ? WHERE video_id = ?"
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
    this.set_job(video_id=video_id, status="DONE")
  }

  def set_failure(video_id:String,error: Throwable): Unit = {
    val error_message = error.getMessage
    this.set_job(video_id = video_id, status = "FAILED")
  }
}