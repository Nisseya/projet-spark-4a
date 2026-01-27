ThisBuild / scalaVersion := "2.12.18"
ThisBuild / version := "0.1.0"
ThisBuild / organization := "com.esgi"
ThisBuild / classLoaderLayeringStrategy := ClassLoaderLayeringStrategy.Flat


lazy val root = (project in file("."))
  .settings(
    name := "spark-scala",
    libraryDependencies ++= Seq(
      "org.apache.spark" %% "spark-sql" % "3.5.6"
    ),
    javaOptions ++= Seq(
      "--add-exports=java.base/sun.nio.ch=ALL-UNNAMED",
      "--add-opens=java.base/java.nio=ALL-UNNAMED",
      "--add-opens=java.base/sun.nio.ch=ALL-UNNAMED"
    )
  )
