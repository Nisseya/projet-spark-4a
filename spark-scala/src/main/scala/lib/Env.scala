package lib

import io.github.cdimascio.dotenv.Dotenv

class Env {
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