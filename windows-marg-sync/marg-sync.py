#!/usr/bin/env python3
"""
MARG ERP 9+ Desktop to Next.js B2B App Sync Engine (Python)
Zero external dependencies for CSV files (uses standard library urllib, json, csv).
"""

import os
import sys
import json
import re
import csv
import time
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent

# 1. Load config
config_path = SCRIPT_DIR / "config.json"
if not config_path.exists():
    print(f"[ERROR] config.json not found at: {config_path}")
    sys.exit(1)

with open(config_path, "r", encoding="utf-8") as f:
    config = json.load(f)

app_url = config.get("appUrl", "http://localhost:3000").rstrip("/")
secret_key = config.get("secretKey", "").strip()
export_folder = (SCRIPT_DIR / config.get("margExportFolder", "./exports")).resolve()
archive_folder = (SCRIPT_DIR / config.get("archiveFolder", "./exports/archive")).resolve()
sync_interval = int(config.get("syncIntervalSeconds", 60))
auto_archive = config.get("autoArchive", True)

export_folder.mkdir(parents=True, exist_ok=True)
archive_folder.mkdir(parents=True, exist_ok=True)

print("========================================================")
print("   MARG ERP 9+ Desktop -> Next.js B2B Sync (Python)   ")
print("========================================================")
print(f"Target Server : {app_url}")
print(f"Export Folder : {export_folder}\n")


def clean_number(val):
    if val is None or val == "":
        return 0.0
    cleaned = re.sub(r"[^0-9.-]", "", str(val))
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def parse_date_iso(val):
    if not val or val in ("-", "--"):
        return None
    s = str(val).strip()
    if re.match(r"^\d{4}-\d{2}-\d{2}$", s):
        return s
    m_dmy = re.match(r"^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$", s)
    if m_dmy:
        d, m, y = m_dmy.groups()
        return f"{y}-{m.zfill(2)}-{d.zfill(2)}"
    m_my = re.match(r"^(\d{1,2})[-/.](\d{2})$", s)
    if m_my:
        m, y = m_my.groups()
        return f"20{y}-{m.zfill(2)}-01"
    for fmt in ("%d-%b-%y", "%d-%b-%Y", "%b-%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            pass
    return None


def send_post(endpoint, payload_dict):
    data_bytes = json.dumps(payload_dict).encode("utf-8")
    req = urllib.request.Request(
        endpoint,
        data=data_bytes,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {secret_key}",
            "x-api-key": secret_key,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"error": {"message": body}}
    except Exception as e:
        raise e


def test_connection():
    print(f"[TEST] Testing link to {app_url}/api/import/stock...")
    try:
        status, res = send_post(f"{app_url}/api/import/stock", {"ping": True})
        if status == 200 and res.get("success"):
            print(f"\033[92m[SUCCESS] {res.get('message', 'Connected')}\033[0m")
            return True
        else:
            print(f"\033[91m[FAILED] Server responded {status}: {res}\033[0m")
            return False
    except Exception as e:
        print(f"\033[91m[ERROR] Could not connect: {e}\033[0m")
        return False


def read_file_rows(file_path):
    ext = file_path.suffix.lower()
    if ext == ".csv":
        with open(file_path, "r", encoding="utf-8-sig", errors="replace") as f:
            reader = csv.DictReader(f)
            return list(reader)
    elif ext in (".xlsx", ".xls"):
        try:
            import openpyxl
            wb = openpyxl.load_workbook(file_path, data_only=True)
            sheet = wb.active
            rows = list(sheet.iter_rows(values_only=True))
            if not rows:
                return []
            headers = [str(h).strip() if h else f"col_{i}" for i, h in enumerate(rows[0])]
            result = []
            for r in rows[1:]:
                if any(r):
                    result.append({headers[i]: r[i] for i in range(len(headers))})
            return result
        except ImportError:
            print("[WARN] openpyxl not installed. Tip: pip install openpyxl to parse .xlsx")
            return []
    return []


def sync_file(file_path):
    if not file_path.exists():
        print(f"[WARN] File not found: {file_path}")
        return False

    print(f"[SYNC] Reading MARG export: {file_path.name}")
    rows = read_file_rows(file_path)
    if not rows:
        print("[WARN] No rows found.")
        return False

    headers = list(rows[0].keys())
    def find_col(pattern):
        for h in headers:
            if re.search(pattern, str(h), re.IGNORECASE):
                return h
        return None

    col_code = find_col(r"^(code|item\s*code|product\s*code|itemid)$")
    col_name = find_col(r"(name|product\s*name|item\s*name|description|particular)")
    col_company = find_col(r"(company|mfg|mfr|make|manufacturer|brand)")
    col_unit = find_col(r"(unit|pack|packing|uom)")
    col_batch = find_col(r"(batch|lot|b\.?\s*no)")
    col_exp = find_col(r"(exp|expiry|validity)")
    col_stock = find_col(r"(current\s*stock|stock|qty|closing|balance|available)")
    col_mrp = find_col(r"(m\.?r\.?p\.?|max_price)")
    col_ptr = find_col(r"(sales?\s*price|rate|ptr|sale\s*rate|net\s*rate)")

    product_map = {}
    batches = []

    for r in rows:
        code_val = str(r.get(col_code, "") or "").strip() if col_code else ""
        name_val = str(r.get(col_name, "") or "").strip() if col_name else ""
        if not code_val and not name_val:
            continue
        if name_val.lower().startswith("total") or name_val.lower().startswith("grand total"):
            continue

        p_code = code_val or re.sub(r"[^a-zA-Z0-9]", "", name_val).upper()[:15]
        p_name = name_val or p_code
        company = str(r.get(col_company, "") or "Unknown").strip() if col_company else "Unknown"
        unit = str(r.get(col_unit, "") or "PCS").strip() if col_unit else "PCS"

        if p_code not in product_map:
            product_map[p_code] = {
                "productCode": p_code,
                "productName": p_name,
                "company": company,
                "unit": unit,
            }

        batch_no = str(r.get(col_batch, "") or "DEFAULT").strip() if col_batch else "DEFAULT"
        expiry_date = parse_date_iso(r.get(col_exp)) if col_exp else None
        stock_qty = max(0.0, clean_number(r.get(col_stock))) if col_stock else 0.0
        mrp = clean_number(r.get(col_mrp)) if col_mrp else 0.0
        ptr = clean_number(r.get(col_ptr)) if col_ptr else 0.0

        batches.append({
            "productCode": p_code,
            "batchNo": batch_no or "DEFAULT",
            "stockQty": stock_qty,
            "mrp": mrp,
            "ptr": ptr,
            "expiryDate": expiry_date,
        })

    if not batches:
        print("[WARN] No valid stock items to import.")
        return False

    payload = {
        "fileName": file_path.name,
        "totalRows": len(batches),
        "products": list(product_map.values()),
        "batches": batches,
    }

    print(f"[UPLOAD] Sending {len(payload['products'])} products and {len(batches)} batches...")
    try:
        status, res = send_post(f"{app_url}/api/import/stock", payload)
        if status == 200 and res.get("success"):
            sum_info = res.get("summary", {})
            print(f"\033[92m[SUCCESS] Stock synced successfully!\033[0m")
            print(f"          Products: {sum_info.get('productsCreated', 0)} created, {sum_info.get('productsUpdated', 0)} updated")
            print(f"          Batches:  {sum_info.get('batchesCreated', 0)} created, {sum_info.get('batchesUpdated', 0)} updated")

            if auto_archive:
                time_tag = datetime.now().strftime("%Y%m%d_%H%M%S")
                dest = archive_folder / f"{file_path.stem}_{time_tag}{file_path.suffix}"
                file_path.rename(dest)
                print(f"[ARCHIVE] Archived to: {dest}")
            return True
        else:
            print(f"\033[91m[FAILED] Server rejected import ({status}): {res}\033[0m")
            return False
    except Exception as e:
        print(f"\033[91m[ERROR] Upload failed: {e}\033[0m")
        return False


def get_latest_file():
    files = [
        p for p in export_folder.iterdir()
        if p.is_file() and p.suffix.lower() in (".csv", ".xlsx", ".xls")
    ]
    if not files:
        return None
    return max(files, key=lambda p: p.stat().st_mtime)


if __name__ == "__main__":
    if "--test" in sys.argv:
        ok = test_connection()
        sys.exit(0 if ok else 1)

    if "--watch" in sys.argv:
        print(f"[WATCH] Watching {export_folder} every {sync_interval}s... (Ctrl+C to stop)")
        while True:
            latest = get_latest_file()
            if latest:
                sync_file(latest)
            time.sleep(sync_interval)
    else:
        latest = get_latest_file()
        if latest:
            ok = sync_file(latest)
            sys.exit(0 if ok else 1)
        else:
            print(f"[INFO] No export files in {export_folder}.")
            print("       Export stock from MARG ERP into this folder and run again.")
            sys.exit(0)
