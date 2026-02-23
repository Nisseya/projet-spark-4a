# app.py
from __future__ import annotations

import io
import os
from dataclasses import dataclass
from typing import Any, Dict, Tuple
from urllib.parse import parse_qs, urlparse

import requests
import streamlit as st


@dataclass(frozen=True)
class PresignResponse:
    video_id: str
    key: str
    upload_url: str
    video_name: str
    content_type: str
    expires_in: int

from typing import Any, Dict, Optional
import requests


def _req_json(
    method: str,
    url: str,
    *,
    params: Optional[Dict[str, Any]] = None,
    json: Optional[Any] = None,
    timeout: int = 30,
) -> Dict[str, Any]:
    r = requests.request(
        method,
        url,
        params=params,
        json=json,      # ← support du body JSON
        timeout=timeout,
    )
    r.raise_for_status()
    return r.json()


def get_presigned_put(*, api_base: str, user_id: str, video_name: str, expires_in: int) -> PresignResponse:
    data = _req_json(
        "GET",
        f"{api_base.rstrip('/')}/post_url",
        params={"user_id": user_id, "video_name": video_name, "expires_in": expires_in},
        timeout=30,
    )
    return PresignResponse(
        video_id=str(data["video_id"]),
        key=str(data["key"]),
        upload_url=str(data["upload_url"]),
        video_name=str(data.get("video_name") or video_name),
        content_type=str(data.get("content_type") or "video/mp4"),
        expires_in=int(data.get("expires_in") or expires_in),
    )


def upload_put_presigned(
    *,
    upload_url: str,
    file_bytes: bytes,
    content_type: str,
    timeout_seconds: int,
) -> Tuple[int, str, Dict[str, str]]:
    headers = {
        "Content-Type": content_type,
        "Content-Length": str(len(file_bytes)),
    }
    r = requests.put(
        upload_url,
        data=io.BytesIO(file_bytes),
        headers=headers,
        timeout=timeout_seconds,
        allow_redirects=False,
    )
    resp_headers = {k: v for k, v in r.headers.items()}
    body = r.text[:4000] if r.text else ""
    return r.status_code, body, resp_headers


def parse_presigned_debug(upload_url: str) -> Dict[str, str]:
    u = urlparse(upload_url)
    qs = parse_qs(u.query)
    cred = (qs.get("X-Amz-Credential") or [""])[0]
    signed_headers = (qs.get("X-Amz-SignedHeaders") or [""])[0]
    expires = (qs.get("X-Amz-Expires") or [""])[0]
    return {
        "host": u.netloc,
        "path": u.path,
        "x_amz_credential": cred,
        "x_amz_signedheaders": signed_headers,
        "x_amz_expires": expires,
    }


st.set_page_config(page_title="Presigned Upload", layout="centered")
st.title("Upload vidéo via URL présignée (FastAPI → RustFS)")

with st.sidebar:
    st.subheader("Config")
    api_base = st.text_input(
        "FastAPI base URL",
        value=os.getenv("PRESIGN_API_BASE", "http://localhost:8000"),
    )
    user_id = st.text_input("user_id", value=os.getenv("USER_ID", "845132156"))
    expires_in = st.number_input("expires_in (sec)", min_value=60, max_value=3600, value=900, step=30)
    timeout_seconds = st.number_input("timeout upload (sec)", min_value=30, max_value=3600, value=600, step=30)
    debug = st.checkbox("Debug", value=True)

st.divider()
st.subheader("1) Choisir un fichier")
uploaded = st.file_uploader("Fichier vidéo", type=None, accept_multiple_files=False)

if uploaded is None:
    st.info("Choisis une vidéo pour commencer.")
    st.stop()

video_name = uploaded.name
file_bytes = uploaded.getvalue()

st.write("Fichier:", f"`{video_name}`")
st.write("Taille:", f"`{len(file_bytes) / (1024 * 1024):.2f} MB`")

st.divider()
st.subheader("2) Presign")
col1, col2 = st.columns([1, 1])

with col1:
    do_presign = st.button("Générer URL présignée", type="primary")

with col2:
    do_presign_upload = st.button("Presign + Upload", type="secondary")

if "presigned" not in st.session_state:
    st.session_state.presigned = None

if do_presign or do_presign_upload:
    if not api_base.strip():
        st.error("api_base manquant.")
        st.stop()
    if not user_id.strip():
        st.error("user_id manquant.")
        st.stop()

    with st.spinner("Appel FastAPI /post_url ..."):
        try:
            presigned = get_presigned_put(
                api_base=api_base.strip(),
                user_id=user_id.strip(),
                video_name=video_name,
                expires_in=int(expires_in),
            )
        except requests.RequestException as e:
            st.error(f"Erreur presign: {e}")
            st.stop()

    st.session_state.presigned = presigned

presigned: PresignResponse | None = st.session_state.presigned

if presigned is not None:
    st.success("URL présignée reçue.")
    st.code(presigned.upload_url, language="text")
    st.write("video_id:", f"`{presigned.video_id}`")
    st.write("key:", f"`{presigned.key}`")
    st.write("content_type signé:", f"`{presigned.content_type}`")
    st.write("expires_in:", f"`{presigned.expires_in}`")

    if debug:
        dbg = parse_presigned_debug(presigned.upload_url)
        st.subheader("Debug presign")
        st.write("upload host:", f"`{dbg['host']}`")
        st.write("path:", f"`{dbg['path']}`")
        st.write("X-Amz-Credential:", f"`{dbg['x_amz_credential']}`")
        st.write("X-Amz-SignedHeaders:", f"`{dbg['x_amz_signedheaders']}`")
        st.write("X-Amz-Expires:", f"`{dbg['x_amz_expires']}`")

st.divider()
st.subheader("3) Upload (PUT brut, pas multipart)")

can_upload = presigned is not None
if not can_upload:
    st.info("Génère d’abord une URL présignée.")
    st.stop()

content_type = presigned.content_type or "video/mp4"

st.write("Le PUT enverra:")
st.code(f"Content-Type: {content_type}\nContent-Length: {len(file_bytes)}", language="text")

do_upload = st.button("Uploader vers RustFS", type="primary")

if do_presign_upload:
    do_upload = True

if do_upload:
    with st.spinner("Upload en cours (PUT vers URL présignée) ..."):
        try:
            status, body, resp_headers = upload_put_presigned(
                upload_url=presigned.upload_url,
                file_bytes=file_bytes,
                content_type=content_type,
                timeout_seconds=int(timeout_seconds),
            )
            
        except requests.RequestException as e:
            st.error(f"Erreur upload: {e}")
            st.stop()

    if status in (200, 201, 204):
        st.success(f"Upload OK ✅ (HTTP {status})")
        st.write("Objet:", f"`{presigned.key}`")
        
        if presigned is not None:
            _req_json(
            "POST",
            f"{api_base.rstrip('/')}/complete",
            json={"video_id":presigned.video_id},
            timeout=30,
        )
        
    else:
        st.error(f"Upload KO ❌ (HTTP {status})")
        if body:
            st.code(body, language="xml" if body.strip().startswith("<") else "text")

    if debug:
        st.subheader("Debug réponse PUT")
        st.write("Status:", status)
        st.json(resp_headers)

st.caption(
    "Notes: on envoie un PUT brut (pas multipart). L’URL présignée signe souvent le Content-Type, donc il doit matcher "
    "exactement. On force aussi Content-Length et on désactive les redirects."
)