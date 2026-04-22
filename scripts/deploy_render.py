#!/usr/bin/env python3
"""Create and deploy API server to Render from GitHub repo."""

import json
import requests
import time

import os
RENDER_TOKEN = os.environ.get("RENDER_API_KEY", "")
OWNER_ID = "tea-d7k5rd4m0tmc73ac0890"
GITHUB_REPO = "https://github.com/nandemofullness-star/ehon-maker-ai"

HEADERS = {
    "Authorization": f"Bearer {RENDER_TOKEN}",
    "Content-Type": "application/json",
}

# Environment variables for the server
ENV_VARS = [
    {"key": "NODE_ENV", "value": "production"},
    {"key": "PORT", "value": "10000"},
    {"key": "BUILT_IN_FORGE_API_URL", "value": "https://forge.manus.ai"},
    {"key": "BUILT_IN_FORGE_API_KEY", "value": "eRLYwU9gfwVXd4JFhVZzeV"},
    {"key": "OAUTH_SERVER_URL", "value": "https://api.manus.im"},
    {"key": "OWNER_OPEN_ID", "value": "BJvXGjE779GmD8fvvZJzXx"},
    {"key": "VITE_APP_ID", "value": "NvVHt8mUcZdui9JqUwg576"},
    {"key": "JWT_SECRET", "value": "KHqo4xivPMWJouzqzcY8U5"},
    {"key": "DATABASE_URL", "value": 'mysql://2T7GG5K3iT3tJu8.root:1bYuuun33S46XJBRVqQ7@gateway05.us-east-1.prod.aws.tidbcloud.com:4000/NvVHt8mUcZdui9JqUwg576?ssl={"rejectUnauthorized":true}'},
]

def create_service():
    payload = {
        "type": "web_service",
        "name": "ehon-maker-api",
        "ownerId": OWNER_ID,
        "repo": GITHUB_REPO,
        "branch": "main",
        "autoDeploy": "yes",
        "serviceDetails": {
            "runtime": "node",
            "buildCommand": "pnpm install && pnpm run build",
            "startCommand": "node dist/index.js",
            "plan": "free",
            "region": "singapore",
            "envSpecificDetails": {
                "buildCommand": "pnpm install && pnpm run build",
                "startCommand": "node dist/index.js",
            },
            "envVars": ENV_VARS,
        },
    }

    resp = requests.post(
        "https://api.render.com/v1/services",
        headers=HEADERS,
        json=payload,
    )
    return resp.json()

def get_service_status(service_id):
    resp = requests.get(
        f"https://api.render.com/v1/services/{service_id}",
        headers=HEADERS,
    )
    return resp.json()

def main():
    print("=== Render API Server Deployment ===")
    print(f"GitHub Repo: {GITHUB_REPO}")
    print(f"Owner: {OWNER_ID}")

    print("\n1. Creating Render web service...")
    result = create_service()
    print(json.dumps(result, indent=2, ensure_ascii=False)[:1000])

    if "service" in result:
        service = result["service"]
        service_id = service["id"]
        service_url = f"https://{service['serviceDetails']['url']}" if service.get('serviceDetails', {}).get('url') else "pending"
        print(f"\n=== SERVICE CREATED ===")
        print(f"ID: {service_id}")
        print(f"Name: {service['name']}")
        print(f"URL: {service_url}")
        print(f"Status: {service.get('suspended', 'unknown')}")

        # Save result
        with open("/home/ubuntu/kdp-ehon-maker/scripts/render_result.json", "w") as fp:
            json.dump({
                "service_id": service_id,
                "service_url": service_url,
                "name": service["name"],
            }, fp, indent=2)
    elif "id" in result:
        service_id = result["id"]
        print(f"\n=== SERVICE CREATED ===")
        print(f"ID: {service_id}")
        # Try to get URL
        status = get_service_status(service_id)
        url = status.get("serviceDetails", {}).get("url", "pending")
        print(f"URL: https://{url}" if url != "pending" else "URL: pending (will be assigned after first deploy)")
        with open("/home/ubuntu/kdp-ehon-maker/scripts/render_result.json", "w") as fp:
            json.dump({"service_id": service_id, "url": url}, fp, indent=2)
    else:
        print(f"\n=== ERROR ===")
        print(json.dumps(result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
