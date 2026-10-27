#!/usr/bin/env python3
"""
Downloads every product image listed in the "الصور" sheet of the catalogue workbook.

Usage:
    pip install openpyxl
    python3 download-images.py ElectroSalam_Catalog_Complete.xlsx

Result: a folder  images/<product id>/01.jpg, 02.webp ...  (numbered in the sheet's image order)
and a zip  images.zip  ready to upload. Re-running skips files already downloaded.
"""
import sys, os, re, time, zipfile, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
import openpyxl

if len(sys.argv) != 2:
    sys.exit(__doc__)

ws = openpyxl.load_workbook(sys.argv[1], read_only=True, data_only=True)["الصور"]
jobs = []
for r in ws.iter_rows(min_row=10, values_only=True):
    if not r[0] or not r[7]:
        continue
    pid, order, url = str(r[0]), int(r[2]), str(r[7])
    ext = os.path.splitext(url.split("?")[0])[1].lower() or ".jpg"
    sep = "&" if "?" in url else "?"
    jobs.append((pid, f"{order:02d}{ext}", f"{url}{sep}width=1400"))  # 1400 px is plenty for a product page

print(f"{len(jobs)} images")
failed = []

def fetch(job):
    pid, name, url = job
    path = os.path.join("images", pid, name)
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=40) as resp, open(path, "wb") as out:
                out.write(resp.read())
            return
        except (urllib.error.URLError, TimeoutError, ConnectionError):
            time.sleep(2 * (attempt + 1))
    failed.append(job)

with ThreadPoolExecutor(max_workers=6) as pool:
    for i, _ in enumerate(pool.map(fetch, jobs), 1):
        if i % 100 == 0:
            print(f"{i}/{len(jobs)}")

with zipfile.ZipFile("images.zip", "w", zipfile.ZIP_STORED) as z:
    for root, _, files in os.walk("images"):
        for f in files:
            p = os.path.join(root, f)
            z.write(p, os.path.relpath(p, "images"))

print(f"Done. Failed: {len(failed)}")
for pid, name, url in failed:
    print("  ", pid, name)
print("Upload images.zip")
