"""Local preview with explicit fault-injection routes. Not part of GitHub Pages runtime."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit
import argparse
from functools import partial
import re

ROOT = Path(__file__).resolve().parent.parent
MODES = ("no-js", "no-three", "no-webgl", "data-failure")

class Preview(SimpleHTTPRequestHandler):
    def __init__(self, *args, directory=str(ROOT), base_path="/", **kwargs):
        self.base_path = base_path
        super().__init__(*args, directory=directory, **kwargs)

    def local_route(self, path):
        route = urlsplit(path).path
        if self.base_path == "/":
            return route
        if route.startswith(self.base_path):
            return "/" + route[len(self.base_path):]
        return None

    def mode_path(self):
        route = self.local_route(self.path)
        if route is None:
            return None, None
        for mode in MODES:
            prefix = "/__qa__/" + mode + "/"
            if route.startswith(prefix):
                return mode, "/" + route[len(prefix):]
        return None, route

    def translate_path(self, path):
        parts = urlsplit(path)
        route = self.local_route(path)
        if route is None:
            return str(Path(self.directory) / "__outside_preview_base__")
        for mode in MODES:
            prefix = "/__qa__/" + mode + "/"
            if route.startswith(prefix):
                route = "/" + route[len(prefix):]
                break
        return super().translate_path(urlunsplit(("", "", route, parts.query, parts.fragment)))

    def check_base_path(self):
        parts = urlsplit(self.path)
        if self.base_path != "/" and parts.path == self.base_path.rstrip("/"):
            self.send_response(308)
            self.send_header("Location", urlunsplit(("", "", self.base_path, parts.query, "")))
            self.send_header("Content-Length", "0")
            self.end_headers()
            return False
        if self.local_route(self.path) is None:
            self.send_error(404, "Path is outside the configured preview base")
            return False
        return True

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        if not self.check_base_path():
            return
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

    def do_HEAD(self):
        if self.check_base_path():
            super().do_HEAD()


def base_path(value):
    parts = urlsplit(value)
    if parts.scheme or parts.netloc or parts.query or parts.fragment or not value.startswith("/"):
        raise argparse.ArgumentTypeError("Base path must be an absolute URL path, for example /portfolio/")
    if "\\" in value or "%" in value or any(part in (".", "..") for part in value.split("/")):
        raise argparse.ArgumentTypeError("Base path cannot contain traversal, encoded paths, or backslashes")
    return "/" + value.strip("/") + "/" if value.strip("/") else "/"

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=4173)
    parser.add_argument("--directory", type=Path, default=ROOT, help="Static directory to serve (default: repository root)")
    parser.add_argument("--base-path", type=base_path, default="/", help="URL prefix, for example /portfolio/")
    args = parser.parse_args()
    directory = args.directory.resolve()
    if not directory.is_dir():
        parser.error(f"Static directory does not exist: {directory}")
    if not 0 <= args.port <= 65535:
        parser.error("Port must be between 0 and 65535")
    handler = partial(Preview, directory=str(directory), base_path=args.base_path)
    server = ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    print(f"Portfolio preview: http://127.0.0.1:{server.server_port}{args.base_path} ({directory})", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
