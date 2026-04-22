#!/usr/bin/env python3
"""Deploy web-build directory to Vercel via API."""

import os
import sys
import json
import hashlib
import base64
import mimetypes
import requests
from pathlib import Path

TOKEN = os.environ.get("VERCEL_TOKEN", "")
TEAM_ID = "team_b7NXilxnIipj6xHl9qUeCywR"
PROJECT_ID = "prj_ClXIgpJjcth8m6AkJyy9sCDzCrwq"
WEB_BUILD_DIR = Path("/home/ubuntu/kdp-ehon-maker/web-build")

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
}

def get_file_sha1(content: bytes) -> str:
    return hashlib.sha1(content).hexdigest()

def collect_files():
    """Collect all files from web-build directory."""
    files = []
    for path in WEB_BUILD_DIR.rglob("*"):
        if path.is_file():
            rel_path = path.relative_to(WEB_BUILD_DIR)
            content = path.read_bytes()
            sha1 = get_file_sha1(content)
            files.append({
                "path": str(rel_path).replace("\\", "/"),
                "content": content,
                "sha1": sha1,
                "size": len(content),
            })
    return files

def upload_file(content: bytes, sha1: str) -> bool:
    """Upload a single file to Vercel."""
    mime_type = "application/octet-stream"
    resp = requests.post(
        f"https://api.vercel.com/v2/files?teamId={TEAM_ID}",
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": mime_type,
            "x-vercel-digest": sha1,
            "x-vercel-size": str(len(content)),
        },
        data=content,
    )
    return resp.status_code in (200, 201, 409)  # 409 = already uploaded

def create_deployment(files):
    """Create a Vercel deployment."""
    file_refs = [{"file": f["path"], "sha": f["sha1"]} for f in files]
    
    payload = {
        "name": "ehon-maker-ai",
        "project": PROJECT_ID,
        "target": "production",
        "files": file_refs,
        "projectSettings": {
            "framework": None,
            "outputDirectory": ".",
        },
    }
    
    resp = requests.post(
        f"https://api.vercel.com/v13/deployments?teamId={TEAM_ID}",
        headers=HEADERS,
        json=payload,
    )
    return resp.json()

def main():
    print("=== Vercel Deployment ===")
    print(f"Source: {WEB_BUILD_DIR}")
    
    # Collect files
    print("\n1. Collecting files...")
    files = collect_files()
    print(f"   Found {len(files)} files")
    
    # Upload files
    print("\n2. Uploading files...")
    success_count = 0
    for i, f in enumerate(files):
        ok = upload_file(f["content"], f["sha1"])
        if ok:
            success_count += 1
        else:
            print(f"   WARNING: Failed to upload {f['path']}")
        if (i + 1) % 20 == 0:
            print(f"   Uploaded {i+1}/{len(files)}...")
    print(f"   Uploaded {success_count}/{len(files)} files")
    
    # Create deployment
    print("\n3. Creating deployment...")
    result = create_deployment(files)
    
    if "url" in result:
        url = result["url"]
        deployment_id = result.get("id", "")
        print(f"\n=== DEPLOYMENT SUCCESSFUL ===")
        print(f"URL: https://{url}")
        print(f"ID: {deployment_id}")
        print(f"State: {result.get('readyState', 'unknown')}")
        
        # Save result
        with open("/home/ubuntu/kdp-ehon-maker/scripts/deploy_result.json", "w") as fp:
            json.dump({"url": f"https://{url}", "id": deployment_id, "state": result.get("readyState")}, fp, indent=2)
    else:
        print(f"\n=== DEPLOYMENT FAILED ===")
        print(json.dumps(result, indent=2, ensure_ascii=False))
        sys.exit(1)

if __name__ == "__main__":
    main()
