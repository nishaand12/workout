import os
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
import email
from email.policy import default

SAVE_DIR = os.path.dirname(os.path.abspath(__file__))

HTML_PAGE = """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Workout File Upload</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; background: #0f172a; color: #f8fafc; }
        .box { border: 2px dashed #3b82f6; border-radius: 12px; padding: 40px; text-align: center; background: #1e293b; cursor: pointer; }
        .box:hover { border-color: #60a5fa; background: #334155; }
        input[type="file"] { display: none; }
        button { background: #3b82f6; color: white; border: none; padding: 12px 24px; font-size: 16px; border-radius: 8px; cursor: pointer; margin-top: 20px; }
        button:hover { background: #2563eb; }
        #status { margin-top: 20px; color: #10b981; font-weight: bold; }
        #file-list { margin-top: 15px; text-align: left; font-size: 14px; color: #94a3b8; }
    </style>
</head>
<body>
    <h2>Upload Workout PDFs & Screenshots</h2>
    <p>Select or drag and drop your PDFs and screenshots below.</p>
    <form id="uploadForm" method="post" enctype="multipart/form-data" action="/upload">
        <div class="box" onclick="document.getElementById('fileInput').click()">
            <p><strong>Click to choose files</strong> or drag and drop them here</p>
            <input type="file" id="fileInput" name="files" multiple>
            <div id="file-list"></div>
        </div>
        <button type="submit">Upload Files</button>
    </form>
    <div id="status"></div>
    <script>
        const fileInput = document.getElementById('fileInput');
        const fileList = document.getElementById('file-list');
        fileInput.addEventListener('change', () => {
            fileList.innerHTML = Array.from(fileInput.files).map(f => `<div>• ${f.name} (${(f.size/1024).toFixed(1)} KB)</div>`).join('');
        });
    </script>
</body>
</html>
"""

class UploadHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(HTML_PAGE.encode("utf-8"))

    def do_POST(self):
        content_type = self.headers.get("Content-Type", "")
        if "multipart/form-data" not in content_type:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b"Expected multipart/form-data")
            return

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)

        # Parse multipart body
        msg = email.message_from_bytes(
            b"Content-Type: " + content_type.encode("utf-8") + b"\r\n\r\n" + body,
            policy=default
        )

        saved_files = []
        for part in msg.iter_parts():
            filename = part.get_filename()
            if filename:
                payload = part.get_payload(decode=True)
                target_path = os.path.join(SAVE_DIR, os.path.basename(filename))
                with open(target_path, "wb") as f:
                    f.write(payload)
                saved_files.append(filename)

        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        success_msg = f"<h3>Uploaded {len(saved_files)} file(s) successfully!</h3><ul>" + "".join(f"<li>{f}</li>" for f in saved_files) + "</ul><p><a href='/'>Upload more</a></p>"
        self.wfile.write(success_msg.encode("utf-8"))

if __name__ == "__main__":
    port = 8000
    server = HTTPServer(("0.0.0.0", port), UploadHandler)
    print(f"Serving upload on http://0.0.0.0:{port}")
    server.serve_forever()
