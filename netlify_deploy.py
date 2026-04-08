import hashlib
import os
import requests


def _resolve_site_id(site_name_or_id, token):
    response = requests.get(
        'https://api.netlify.com/api/v1/sites',
        headers={'Authorization': f'Bearer {token}'},
        timeout=15,
    )
    if response.status_code == 200:
        for site in response.json():
            if site.get('name') == site_name_or_id or site.get('id') == site_name_or_id:
                return site['id']
    return site_name_or_id


def _make_redirect_html(today_slug):
    return f"""<!DOCTYPE html>
<html>
<head>
<meta http-equiv="refresh" content="0; url=/{today_slug}/">
<title>Daily Briefing</title>
</head>
<body>
<script>window.location.replace("/{today_slug}/");</script>
</body>
</html>""".encode('utf-8')


def deploy_to_netlify(output_base_dir, today_slug, token, site_id):
    resolved_id = _resolve_site_id(site_id, token)

    # Collect all index.html files from output subdirectories
    files = {}  # netlify_path -> bytes

    for entry in os.scandir(output_base_dir):
        if entry.is_dir():
            page_path = os.path.join(entry.path, 'index.html')
            if os.path.exists(page_path):
                with open(page_path, 'rb') as f:
                    content = f.read()
                netlify_path = f'/{entry.name}/index.html'
                files[netlify_path] = content

    # Root redirect to today
    files['/index.html'] = _make_redirect_html(today_slug)

    if not files:
        raise Exception("Nenhuma página encontrada em output/")

    # Build hash map
    file_hashes = {path: hashlib.sha1(content).hexdigest() for path, content in files.items()}

    # Step 1: create deploy
    response = requests.post(
        f'https://api.netlify.com/api/v1/sites/{resolved_id}/deploys',
        headers={
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
        },
        json={'files': file_hashes},
        timeout=30,
    )

    if response.status_code not in (200, 201):
        raise Exception(f"Netlify erro {response.status_code}: {response.text}")

    deploy_data = response.json()
    deploy_id = deploy_data['id']
    required = set(deploy_data.get('required', []))

    # Step 2: upload files that netlify needs
    for path, content in files.items():
        file_hash = file_hashes[path]
        if file_hash not in required:
            continue
        netlify_upload_path = path.lstrip('/')
        upload = requests.put(
            f'https://api.netlify.com/api/v1/deploys/{deploy_id}/files/{netlify_upload_path}',
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/octet-stream',
            },
            data=content,
            timeout=30,
        )
        if upload.status_code not in (200, 201):
            raise Exception(f"Upload erro {upload.status_code} para {path}: {upload.text}")

    return f"https://{site_id}.netlify.app/{today_slug}/"
