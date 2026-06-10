#!/usr/bin/env python3
"""BioCarbon Dashboard Server - Serves static HTML dashboard and API routes"""

import http.server
import json
import os
import socketserver
from urllib.parse import urlparse, parse_qs

PORT = 3430
PUBLIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public')

MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
}

class BioCarbonHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # API routes
        if path.startswith('/api/bio/'):
            self.handle_api(path)
            return

        # Root URL - serve biocarbon dashboard directly
        if path == '/' or path == '':
            try:
                with open(os.path.join(PUBLIC_DIR, 'biocarbon', 'index.html'), 'rb') as f:
                    content = f.read()
                self.send_response(200)
                self.send_header('Content-Type', 'text/html')
                self.send_header('Content-Length', len(content))
                self.end_headers()
                self.wfile.write(content)
            except FileNotFoundError:
                self.send_error(404)
            return

        # Try to serve static file
        super().do_GET()

    def handle_api(self, path):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

        if path == '/api/bio/overview':
            data = {
                "totalCo2Reduction": 12458.7,
                "ch4Oxidized": 8923.4,
                "microorganismTypes": 47,
                "activeBioreactors": 12,
                "carbonCreditsGenerated": 3421,
                "biofuelProduced": 5678.9,
                "trendData": [
                    {"month":"Jan","co2":980,"ch4":720,"biofuel":450},
                    {"month":"Feb","co2":1050,"ch4":780,"biofuel":480},
                    {"month":"Mar","co2":1120,"ch4":830,"biofuel":510},
                    {"month":"Apr","co2":1080,"ch4":790,"biofuel":490},
                    {"month":"May","co2":1200,"ch4":870,"biofuel":530},
                    {"month":"Jun","co2":1150,"ch4":850,"biofuel":520},
                    {"month":"Jul","co2":1280,"ch4":920,"biofuel":560},
                    {"month":"Aug","co2":1320,"ch4":950,"biofuel":580},
                    {"month":"Sep","co2":1180,"ch4":860,"biofuel":510},
                    {"month":"Oct","co2":1090,"ch4":800,"biofuel":470},
                    {"month":"Nov","co2":1020,"ch4":750,"biofuel":440},
                    {"month":"Dec","co2":988,"ch4":703,"biofuel":458},
                ]
            }
        elif path == '/api/bio/methanotrophs':
            data = {
                "organisms": [
                    {"id":1,"name":"Methylococcus capsulatus","type":"Type I","optimalTemp":"45°C","optimalPH":"6.8","ch4OxidationRate":12.5,"biomassYield":0.85,"lipidContent":22.3,"product":"Biofuel, Lipids","status":"Active","habitat":"Soil, Landfill"},
                    {"id":2,"name":"Methylosinus trichosporium","type":"Type II","optimalTemp":"30°C","optimalPH":"6.5","ch4OxidationRate":9.8,"biomassYield":0.72,"lipidContent":28.5,"product":"PHB Biopolymer","status":"Active","habitat":"Soil, Rice paddies"},
                    {"id":3,"name":"Methylobacter luteus","type":"Type I","optimalTemp":"35°C","optimalPH":"7.0","ch4OxidationRate":11.2,"biomassYield":0.78,"lipidContent":18.7,"product":"Single-cell protein","status":"Active","habitat":"Freshwater sediment"},
                ],
                "processData": [{"hour":i,"ch4Concentration":max(5,round(100-i*3.5+__import__('math').sin(i*0.5)*5,1)),"oxidationRate":0 if i==0 else round(min(15,i*0.8+__import__('math').sin(i*0.3)*1.2),2),"biomassGrowth":0 if i==0 else round(min(0.85,i*0.035+__import__('math').cos(i*0.2)*0.02),3)} for i in range(0,25,2)],
                "speciesDistribution": [{"name":"Type I (γ-proteobacteria)","value":45},{"name":"Type II (α-proteobacteria)","value":30},{"name":"Type X (Verrucomicrobia)","value":15},{"name":"ANME (Archaea)","value":10}]
            }
        elif path == '/api/bio/synmec':
            data = {"consortiumData":{"name":"SynMEC","description":"Syntrophic Methanogenic Consortium"},"functions":[{"name":"H₂ Prevention","efficiency":94},{"name":"CH₄ Production","efficiency":87},{"name":"pH Maintenance","efficiency":91},{"name":"Resilience","efficiency":88}]}
        elif path == '/api/bio/ccu':
            data = {"processes":[{"id":1,"name":"Microbial CO₂ Capture","efficiency":78,"co2Captured":2340,"scale":"Pilot"},{"id":2,"name":"Algae Biofuel","efficiency":65,"co2Captured":1870,"scale":"Commercial"}]}
        elif path == '/api/bio/waste-to-value':
            data = {"pathways":[{"id":1,"name":"Anaerobic Digestion","impact":-2.5,"scale":"Industrial","yield":850},{"id":2,"name":"Gas Fermentation","impact":-1.8,"scale":"Commercial","yield":620}]}
        else:
            data = {"status": "ok", "message": "BioCarbon API"}

        self.wfile.write(json.dumps(data).encode())

    def log_message(self, format, *args):
        pass  # Suppress logging

if __name__ == '__main__':
    with socketserver.TCPServer(("", PORT), BioCarbonHandler) as httpd:
        print(f"BioCarbon server running on port {PORT}")
        httpd.serve_forever()
