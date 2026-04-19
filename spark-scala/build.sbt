ThisBuild / scalaVersion := "2.12.18"
ThisBuild / version := "0.1.0"
ThisBuild / organization := "com.esgi"

lazy val sparkVersion = "3.5.0"
lazy val hadoopVersion = "3.3.4"
lazy val awsSdkVersion = "2.25.62"

lazy val root = (project in file("."))
  .settings(
    name := "spark-scala",

    libraryDependencies ++= Seq(
      "org.apache.spark" %% "spark-core"         % sparkVersion % "provided",
      "org.apache.spark" %% "spark-sql"          % sparkVersion % "provided",
      "org.apache.spark" %% "spark-mllib"        % sparkVersion % "provided",
      "org.apache.spark" %% "spark-hadoop-cloud" % sparkVersion,

      "org.apache.hadoop" % "hadoop-aws"          % hadoopVersion,
      "com.amazonaws"     % "aws-java-sdk-bundle" % "1.12.262",

      "software.amazon.awssdk" % "s3" % awsSdkVersion,

      "io.github.cdimascio" % "dotenv-java" % "3.0.0",
      "org.postgresql" % "postgresql" % "42.7.4"
    ),

    dependencyOverrides ++= Seq(
      "org.apache.hadoop" % "hadoop-client-api"     % hadoopVersion,
      "org.apache.hadoop" % "hadoop-client-runtime" % hadoopVersion,
      "org.apache.hadoop" % "hadoop-aws"            % hadoopVersion
    ),

    // Fork pour TOUTES les tasks run-like (run, runMain, test…)
    fork := true,

    // javaOptions globales → appliquées à tous les fork
    javaOptions ++= Seq(
      "--add-exports=java.base/sun.nio.ch=ALL-UNNAMED",
      "--add-opens=java.base/java.nio=ALL-UNNAMED",
      "--add-opens=java.base/sun.nio.ch=ALL-UNNAMED",
      "--add-opens=java.base/java.lang=ALL-UNNAMED",
      "--add-opens=java.base/java.lang.invoke=ALL-UNNAMED",
      "--add-opens=java.base/java.util=ALL-UNNAMED",
      "--add-opens=java.base/java.util.concurrent=ALL-UNNAMED",
      "--add-opens=java.base/java.io=ALL-UNNAMED",
      "--add-opens=java.base/java.net=ALL-UNNAMED"
    ),

    // Inclure les deps "provided" dans le classpath de `run` et `runMain`
    Compile / run := Defaults.runTask(
      Compile / fullClasspath,
      Compile / run / mainClass,
      Compile / run / runner
    ).evaluated,

    Compile / runMain := Defaults.runMainTask(
      Compile / fullClasspath,
      Compile / runMain / runner
    ).evaluated
  )