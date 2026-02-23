package app

import workers.{ExtractWorker, ProcessWorker}

object Main {
  def main(args: Array[String]): Unit = {
    new ExtractWorker().run()
//    new ProcessWorker().run()
  }
}
