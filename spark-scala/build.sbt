import sbt.Keys.libraryDependencySchemes

ThisBuild / scalaVersion := "2.12.18"
ThisBuild / version := "0.1.0"
ThisBuild / organization := "com.esgi"

lazy val awsSdkVersion = "2.25.62"
lazy val sparkVersion  = "3.5.6"

lazy val root = (project in file("."))
  .settings(
    name := "spark-scala",
    libraryDependencies ++= Seq(
      "org.apache.spark" %% "spark-core" % sparkVersion,
      "org.apache.spark" %% "spark-sql"  % sparkVersion,

      "software.amazon.awssdk" % "s3" % awsSdkVersion,
      "org.apache.hadoop" % "hadoop-aws" % "3.3.6",

      "io.github.cdimascio" % "dotenv-java" % "3.0.0",
      "org.postgresql" % "postgresql" % "42.7.4",

    )
  )
