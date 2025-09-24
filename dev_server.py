import os
import time
import threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial


ROOT_DIRECTORY = '/workspace'
WATCH_EXTENSIONS = ('.html', '.css', '.js')
VERSION_LOCK = threading.Lock()
CURRENT_VERSION = '0'


def compute_snapshot_version(root: str) -> str:
    latest_mtime = 0.0
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if not d.startswith('.')]  # skip dot-dirs
        for filename in filenames:
            if filename.endswith(WATCH_EXTENSIONS):
                full_path = os.path.join(dirpath, filename)
                try:
                    mtime = os.path.getmtime(full_path)
                    if mtime > latest_mtime:
                        latest_mtime = mtime
                except FileNotFoundError:
                    pass
    return str(latest_mtime)


def watch_files_forever() -> None:
    global CURRENT_VERSION
    current = compute_snapshot_version(ROOT_DIRECTORY)
    with VERSION_LOCK:
        CURRENT_VERSION = current
    while True:
        time.sleep(0.8)
        new_version = compute_snapshot_version(ROOT_DIRECTORY)
        if new_version != current:
            current = new_version
            with VERSION_LOCK:
                CURRENT_VERSION = current


class LiveReloadHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        if self.path.startswith('/__lr_version'):
            with VERSION_LOCK:
                value = CURRENT_VERSION
            body = value.encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        return super().do_GET()

    def send_head(self):
        path = self.translate_path(self.path)
        file_obj = None
        if os.path.isdir(path):
            for index_name in ('index.html', 'index.htm'):
                candidate = os.path.join(path, index_name)
                if os.path.exists(candidate):
                    path = candidate
                    break

        content_type = self.guess_type(path)
        try:
            file_obj = open(path, 'rb')
        except OSError:
            return super().send_head()

        try:
            if content_type.startswith('text/html'):
                raw = file_obj.read().decode('utf-8', errors='replace')
                injection = (
                    "<script>(function(){var v='',u='/__lr_version';async function p(){try{var r=await fetch(u,{cache:'no-store'}),n=await r.text();if(v&&v!==n){location.reload()}else{v=n}}catch(e){}setTimeout(p,800)}p()})();</script>"
                )
                lower = raw.lower()
                insert_at = lower.rfind('</body>')
                if insert_at != -1:
                    output = raw[:insert_at] + injection + raw[insert_at:]
                else:
                    output = raw + injection
                encoded = output.encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.send_header('Content-Length', str(len(encoded)))
                self.end_headers()
                self.wfile.write(encoded)
                file_obj.close()
                return None
            else:
                self.send_response(200)
                self.send_header('Content-Type', content_type)
                stats = os.fstat(file_obj.fileno())
                self.send_header('Content-Length', str(stats.st_size))
                self.end_headers()
                return file_obj
        except Exception:
            if file_obj:
                file_obj.close()
            raise


def main() -> None:
    os.chdir(ROOT_DIRECTORY)
    watcher_thread = threading.Thread(target=watch_files_forever, daemon=True)
    watcher_thread.start()
    handler_class = partial(LiveReloadHandler, directory=ROOT_DIRECTORY)
    server = ThreadingHTTPServer(('0.0.0.0', 5500), handler_class)
    print('Live-reload server running at http://localhost:5500')
    print(f'Watching for changes in {ROOT_DIRECTORY}')
    server.serve_forever()


if __name__ == '__main__':
    main()

