package app

import workers.ExtractWorker

object Main {
  def main(args: Array[String]): Unit = {
    new ExtractWorker().run()
  }
}
