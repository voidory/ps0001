"""Serve dist at both / and /ps0001/ for realistic repository-subpath tests."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/ps0001/'):
            self.path=self.path[len('/ps0001'):]
        super().do_GET()
    def log_message(self,*args):
        pass
os.chdir(Path(__file__).resolve().parents[1]/'dist')
ThreadingHTTPServer(('127.0.0.1',4173),Handler).serve_forever()
