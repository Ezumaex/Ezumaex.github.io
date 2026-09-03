"""Local preview with explicit fault-injection routes. Not part of GitHub Pages runtime."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import argparse
import os
import re

ROOT = Path(__file__).resolve().parent.parent
MODES = ("no-js", "no-three", "no-webgl", "data-failure")

class Preview(SimpleHTTPRequestHandler):
    def mode_path(self):
        route = urlsplit(self.path).path
        for mode in MODES:
            prefix = "/__qa__/" + mode + "/"
            if route.startswith(prefix):
                return mode, "/" + route[len(prefix):]
        return None, route

    def translate_path(self, path):
        for mode in MODES:
            path = path.replace("/__qa__/" + mode + "/", "/", 1)
        return super().translate_path(path)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        mode, route = self.mode_path()
        if mode == "no-three" and "/vendor/three-" in route:
            self.send_error(404, "Intentional Three.js loading failure")
            return
        if mode == "data-failure" and route.startswith("/data/"):
            self.send_error(503, "Intentional content loading failure")
            return
        if mode in ("no-js", "no-webgl") and (route.endswith("/") or route.endswith(".html")):
            name = self.translate_path(self.path)
            file = Path(name) / "index.html" if route.endswith("/") else Path(name)
            if file.is_file():
                html = file.read_text(encoding="utf-8")
                if mode == "no-js":
                    html = re.sub(r"<script\b[^>]*>[\s\S]*?</script>", "", html, flags=re.I)
                else:
                    stub = "<script>const originalContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return kind.startsWith('webgl')?null:originalContext.call(this,kind,...args)};</script>"
                    html = html.replace("<head>", "<head>" + stub, 1)
                data = html.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
                return
        super().do_GET()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=4173)
    args = parser.parse_args()
    os.chdir(ROOT)
    print(f"Portfolio preview: http://127.0.0.1:{args.port}/", flush=True)
    ThreadingHTTPServer(("127.0.0.1", args.port), Preview).serve_forever()
