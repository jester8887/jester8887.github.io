import os
import re
import shutil
import tempfile
from pathlib import Path

from flask import Flask, after_this_request, flash, redirect, render_template_string, request, send_file, session, url_for
import yt_dlp

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "change-this-in-render")
WEB_PASSWORD = os.environ.get("WEB_PASSWORD", "")

PAGE = r"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>YouTube Audio Downloader</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f5f5f7;margin:0;color:#111}
    .card{max-width:720px;margin:8vh auto;background:#fff;padding:28px;border-radius:18px;box-shadow:0 10px 30px rgba(0,0,0,.08)}
    h1{margin-top:0} label{font-weight:600}
    input,select,button{font-size:16px;box-sizing:border-box}
    input[type=text],input[type=password],select{width:100%;padding:12px;margin:8px 0 16px;border:1px solid #ccc;border-radius:10px}
    button{padding:12px 18px;border:0;border-radius:10px;background:#111;color:#fff;cursor:pointer}
    .small{color:#666;font-size:13px;line-height:1.4}.err{color:#b00020;margin-bottom:12px}
    a{color:inherit}
  </style>
</head>
<body>
<div class="card">
{% if not authed %}
  <h1>Private Downloader</h1>
  {% with messages = get_flashed_messages() %}{% if messages %}<div class="err">{{ messages[0] }}</div>{% endif %}{% endwith %}
  <form method="post" action="/login">
    <label>Password</label>
    <input type="password" name="password" autofocus required>
    <button type="submit">Sign in</button>
  </form>
{% else %}
  <h1>YouTube Audio Downloader</h1>
  {% with messages = get_flashed_messages() %}{% if messages %}<div class="err">{{ messages[0] }}</div>{% endif %}{% endwith %}
  <form method="post" action="/download">
    <label>YouTube URL</label>
    <input type="text" name="url" placeholder="https://www.youtube.com/watch?v=..." required>
    <label>Format</label>
    <select name="mode">
      <option value="mp3">MP3 — highest quality</option>
      <option value="original">Best original audio — no re-encode</option>
    </select>
    <button type="submit">Download Audio</button>
  </form>
  <p class="small">Use only for media you own or have permission to download. MP3 requires a lossy conversion from YouTube's source audio.</p>
  <p class="small"><a href="/logout">Sign out</a></p>
{% endif %}
</div>
</body>
</html>"""

def authed():
    return bool(session.get("ok"))

def allowed_youtube_url(url: str) -> bool:
    return bool(re.match(r"^https?://([^/]+\.)?(youtube\.com|youtu\.be)/", url, re.I))

@app.get("/")
def index():
    return render_template_string(PAGE, authed=authed())

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/login")
def login():
    if not WEB_PASSWORD:
        flash("WEB_PASSWORD is not configured on the server.")
        return redirect(url_for("index"))
    if request.form.get("password") == WEB_PASSWORD:
        session["ok"] = True
    else:
        flash("Incorrect password.")
    return redirect(url_for("index"))

@app.get("/logout")
def logout():
    session.clear()
    return redirect(url_for("index"))

@app.post("/download")
def download():
    if not authed():
        return redirect(url_for("index"))

    url = (request.form.get("url") or "").strip()
    mode = request.form.get("mode") or "mp3"

    if not allowed_youtube_url(url):
        flash("Please enter a YouTube URL.")
        return redirect(url_for("index"))

    workdir = Path(tempfile.mkdtemp(prefix="ytmgb_"))
    outtmpl = str(workdir / "%(title).180B [%(id)s].%(ext)s")

    ydl_opts = {
        "outtmpl": outtmpl,
        "noplaylist": True,
        "quiet": False,
        "no_warnings": False,
        "js_runtimes": {"deno": {}},
    }

    if mode == "mp3":
        ydl_opts.update({
            "format": "bestaudio/best",
            "postprocessors": [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "0",
            }],
        })
    else:
        ydl_opts["format"] = "bestaudio/best"

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)

        candidates = list(workdir.glob("*.mp3")) if mode == "mp3" else [p for p in workdir.iterdir() if p.is_file()]
        if not candidates:
            raise RuntimeError("The output file was not created.")

        output = max(candidates, key=lambda p: p.stat().st_mtime)

        @after_this_request
        def cleanup(response):
            try:
                shutil.rmtree(workdir, ignore_errors=True)
            finally:
                return response

        return send_file(output, as_attachment=True, download_name=output.name)

    except Exception as exc:
        shutil.rmtree(workdir, ignore_errors=True)
        flash(f"Download failed: {exc}")
        return redirect(url_for("index"))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "10000"))
    app.run(host="0.0.0.0", port=port)
