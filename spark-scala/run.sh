#!/usr/bin/env bash
set -euo pipefail

SPARK="/mnt/c/Users/AIO/Downloads/spark-3.5.6-bin-hadoop3/spark-3.5.6-bin-hadoop3"

export SPARK_LOCAL_IP=127.0.0.1

sbt clean assembly
"$SPARK/bin/spark-submit" --class Main target/scala-2.12/spark-scala-assembly-0.1.0.jar