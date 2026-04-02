import hashlib
import io
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


def deploy_to_netlify(html_content, token, site_id):
    resolved_id = _resolve_site_id(site_id, token)

    html_bytes = html_content.encode('utf-8')
    file_hash = hashlib.sha1(html_bytes).hexdigest()

    # Step 1: create deploy with file hashes
    response = requests.post(
        f'https://api.netlify.com/api/v1/sites/{resolved_id}/deploys',
        headers={
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
        },
        json={'files': {'/index.html': file_hash}},
        timeout=30,
    )

    if response.status_code not in (200, 201):
        raise Exception(f"Netlify erro {response.status_code}: {response.text}")

    deploy_data = response.json()
    deploy_id = deploy_data['id']
    required = deploy_data.get('required', [])

    # Step 2: upload the file if needed
    if file_hash in required:
        upload = requests.put(
            f'https://api.netlify.com/api/v1/deploys/{deploy_id}/files/index.html',
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/octet-stream',
            },
            data=html_bytes,
            timeout=30,
        )
        if upload.status_code not in (200, 201):
            raise Exception(f"Upload erro {upload.status_code}: {upload.text}")

    return f"https://{site_id}.netlify.app"
