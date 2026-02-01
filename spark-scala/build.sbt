ThisBuild / scalaVersion := "2.12.18"
ThisBuild / version := "0.1.0"
ThisBuild / organization := "com.esgi"
ThisBuild / classLoaderLayeringStrategy := ClassLoaderLayeringStrategy.Flat

lazy val root = (project in file("."))
  .settings(
    name := "spark-scala",
    libraryDependencies ++= Seq(
      "org.apache.spark" %% "spark-core" % "3.5.6",
      "org.apache.spark" %% "spark-sql"  % "3.5.6",
      "software.amazon.awssdk" % "s3" % "2.25.52",
      "io.github.cdimascio" % "dotenv-java" % "3.0.0",
      "com.lihaoyi" %% "cask" % "0.10.2",

    ),
    Compile / run / fork := true,
    javaOptions ++= Seq(
      "--add-exports=java.base/sun.nio.ch=ALL-UNNAMED",
      "--add-opens=java.base/java.nio=ALL-UNNAMED",
      "--add-opens=java.base/sun.nio.ch=ALL-UNNAMED"
    )
  )
