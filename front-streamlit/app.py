import os
import uuid

import boto3
import psycopg2
import streamlit as st


# ===== ENV =====
# Object Store (Rustfs)
AWS_ACCESS_KEY_ID="nisseya"
AWS_SECRET_ACCESS_KEY="123456"
AWS_S3_BUCKET="asl-spark"
AWS_S3_ENDPOINT="http://localhost:9000"
AWS_REGION="us-east-1"

# Postgres
POSTGRES_HOST="localhost"
POSTGRES_PORT="5432"
POSTGRES_DB="asl-spark"
POSTGRES_USER="nisseya"
POSTGRES_PASSWORD="123456"

# ===== CLIENTS =====
def get_s3():
    return boto3.client(
        "s3",
        endpoint_url=AWS_S3_ENDPOINT,
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        region_name=AWS_REGION,
    )


def get_conn():
    return psycopg2.connect(
        host=POSTGRES_HOST,
        port=POSTGRES_PORT,
        dbname=POSTGRES_DB,
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD,
    )


# ===== DB =====
def get_users():
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, name FROM users ORDER BY name")
            return cur.fetchall()
    finally:
        conn.close()


def create_user(user_id, name):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO users (id, name) VALUES (%s, %s)",
                (user_id, name),
            )
        conn.commit()
    finally:
        conn.close()


def insert_video(video_id, user_id, name, extension, video_key):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO videos (
                    id, created_by, name, extension,
                    video_key, status, created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
                """,
                (
                    video_id,
                    user_id,
                    name,
                    extension,
                    video_key,
                    "UPLOAD_COMPLETE",
                ),
            )
        conn.commit()
    finally:
        conn.close()


# ===== UI =====
st.set_page_config(page_title="ASL Upload", page_icon="🎥")
st.title("Upload video")

# --- USERS ---
st.subheader("User")

users = get_users()
user_options = {f"{name} ({uid})": uid for uid, name in users}

selected_user_label = st.selectbox(
    "Select user",
    list(user_options.keys()) if user_options else []
)

selected_user_id = user_options[selected_user_label] if users else None

# create user
with st.expander("Create new user"):
    new_name = st.text_input("Name")
    if st.button("Create user"):
        if new_name:
            user_id = str(uuid.uuid4())
            create_user(user_id, new_name)
            st.success("User created, reload page")
        else:
            st.error("Enter a name")

# --- UPLOAD ---
st.subheader("Upload")

uploaded_file = st.file_uploader(
    "Video file",
    type=["mp4", "mov", "avi", "mkv", "webm"],
)

if st.button("Upload"):
    if not selected_user_id:
        st.error("Select a user")
    elif uploaded_file is None:
        st.error("Add a file")
    else:
        video_id = str(uuid.uuid4())

        filename = uploaded_file.name.replace(" ", "_")
        name, ext = filename.rsplit(".", 1)
        extension = ext.lower()

        video_key = f"raw/{selected_user_id}/{video_id}/{filename}"

        try:
            s3 = get_s3()
            s3.upload_fileobj(uploaded_file, AWS_S3_BUCKET, video_key)

            insert_video(
                video_id=video_id,
                user_id=selected_user_id,
                name=name,
                extension=extension,
                video_key=video_key,
            )

            st.success("Uploaded")
            st.write("video_id:", video_id)

        except Exception as e:
            st.error(str(e))