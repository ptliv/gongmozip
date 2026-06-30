from __future__ import annotations

import json
import shutil
import socket
import subprocess
import tempfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import anyio
import httpx2

from utils.r2_image_migration import build_plan, content_type_for_extension, extension_from_content_type, is_external_poster_url


ROOT_DIR = Path(__file__).resolve().parents[2]
DEFAULT_BUCKET = "gongmozip-posters"
DEFAULT_PUBLIC_BASE_URL = "https://images.gongmozip.com"
PAGE_SIZE = 1000
CACHE_CONTROL = "public, max-age=31536000, immutable"
IMAGE_HEADERS = {
    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
    ),
}


@dataclass(frozen=True)
class ContestRow:
    id: str
    title: str
    poster_image_url: str


def parse_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def create_async_client() -> httpx2.AsyncClient:
    limits = httpx2.Limits(max_connections=200, max_keepalive_connections=40, keepalive_expiry=30.0)
    timeout = httpx2.Timeout(connect=5.0, read=30.0, write=10.0, pool=10.0)
    transport = httpx2.AsyncHTTPTransport(
        http2=True,
        retries=3,
        limits=limits,
        socket_options=[(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)],
    )
    return httpx2.AsyncClient(transport=transport, timeout=timeout, follow_redirects=True)


def supabase_headers(api_key: str) -> dict[str, str]:
    return {"apikey": api_key, "Authorization": f"Bearer {api_key}"}


async def fetch_rows(client: httpx2.AsyncClient, supabase_url: str, api_key: str) -> list[ContestRow]:
    rows: list[ContestRow] = []
    offset = 0
    endpoint = f"{supabase_url.rstrip('/')}/rest/v1/contests"

    while True:
        response = await client.get(
            endpoint,
            params=[
                ("select", "id,title,poster_image_url"),
                ("poster_image_url", "not.is.null"),
                ("poster_image_url", "neq."),
                ("order", "id.asc"),
                ("limit", str(PAGE_SIZE)),
                ("offset", str(offset)),
            ],
            headers=supabase_headers(api_key),
        )
        response.raise_for_status()
        batch = response.json()
        rows.extend(
            ContestRow(
                id=str(row.get("id") or ""),
                title=str(row.get("title") or ""),
                poster_image_url=str(row.get("poster_image_url") or ""),
            )
            for row in batch
        )
        if len(batch) < PAGE_SIZE:
            return rows
        offset += PAGE_SIZE


def filter_candidates(rows: list[ContestRow], only_hosts: set[str] | None) -> list[ContestRow]:
    candidates = [row for row in rows if is_external_poster_url(row.poster_image_url)]
    if only_hosts is None:
        return candidates
    return [row for row in candidates if (urlparse(row.poster_image_url).hostname or "") in only_hosts]


async def download_image(client: httpx2.AsyncClient, row: ContestRow) -> tuple[bytes, str]:
    parsed = urlparse(row.poster_image_url)
    headers = {**IMAGE_HEADERS, "Referer": f"{parsed.scheme}://{parsed.netloc}/"}
    response = await client.get(row.poster_image_url, headers=headers)
    response.raise_for_status()

    data = response.content
    content_type = response.headers.get("content-type")
    extension = extension_from_content_type(content_type, row.poster_image_url)
    upload_content_type = content_type_for_extension(extension)
    if not data:
        raise RuntimeError("empty image response")
    return data, upload_content_type


def upload_with_wrangler(bucket: str, object_key: str, file_path: Path, content_type: str) -> None:
    npm_bin = shutil.which("npm.cmd") or shutil.which("npm")
    if npm_bin is None:
        raise RuntimeError("npm executable was not found on PATH")

    completed = subprocess.run(
        [
            npm_bin,
            "exec",
            "wrangler",
            "--",
            "r2",
            "object",
            "put",
            f"{bucket}/{object_key}",
            "--file",
            str(file_path),
            "--content-type",
            content_type,
            "--cache-control",
            CACHE_CONTROL,
            "--remote",
        ],
        cwd=ROOT_DIR,
        text=True,
        encoding="utf-8",
        errors="replace",
        capture_output=True,
        check=False,
        timeout=90,
    )
    if completed.returncode != 0:
        stderr = (completed.stderr or completed.stdout or "").strip().splitlines()[-3:]
        raise RuntimeError("wrangler upload failed: " + " | ".join(stderr))


async def verify_public_url(client: httpx2.AsyncClient, public_url: str) -> None:
    last_status = 0
    for attempt in range(1, 7):
        response = await client.get(public_url, headers={**IMAGE_HEADERS, "Range": "bytes=0-0"})
        last_status = response.status_code
        if response.status_code in {200, 206}:
            return
        await anyio.sleep(min(attempt * 2, 8))
    raise RuntimeError(f"public image verify failed: HTTP {last_status}")


async def update_poster_url(client: httpx2.AsyncClient, supabase_url: str, api_key: str, contest_id: str, public_url: str) -> None:
    response = await client.patch(
        f"{supabase_url.rstrip('/')}/rest/v1/contests",
        params=[("id", f"eq.{contest_id}")],
        headers={**supabase_headers(api_key), "Content-Type": "application/json", "Prefer": "return=minimal"},
        json={"poster_image_url": public_url},
    )
    response.raise_for_status()


async def migrate_one(
    client: httpx2.AsyncClient, row: ContestRow, *, bucket: str, public_base_url: str, supabase_url: str, api_key: str, temp_dir: Path
) -> dict[str, str]:
    data, content_type = await download_image(client, row)
    plan = build_plan(contest_id=row.id, source_url=row.poster_image_url, content_type=content_type, public_base_url=public_base_url)
    extension = extension_from_content_type(content_type, row.poster_image_url)
    temp_file = temp_dir / f"{row.id}.{extension}"
    temp_file.write_bytes(data)

    upload_with_wrangler(bucket, plan.object_key, temp_file, content_type)
    await verify_public_url(client, plan.public_url)
    await update_poster_url(client, supabase_url, api_key, row.id, plan.public_url)

    return {
        "id": row.id,
        "title": row.title,
        "source_host": urlparse(row.poster_image_url).hostname or "",
        "old_url": row.poster_image_url,
        "new_url": plan.public_url,
    }


def write_report(path: Path, report: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")


def default_report_path() -> Path:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    return ROOT_DIR / "reports" / f"r2-poster-migration-{stamp}.json"


async def run_migration(
    *, apply: bool, bucket: str, public_base_url: str, limit: int | None, only_hosts: set[str] | None, env_file: Path, report_path: Path | None
) -> None:
    env = parse_env_file(env_file)
    supabase_url = env.get("NEXT_PUBLIC_SUPABASE_URL", "")
    api_key_name = "SUPABASE_SERVICE_ROLE_KEY" if apply else "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    api_key = env.get(api_key_name, "")
    if not supabase_url or not api_key:
        raise SystemExit(f"missing {api_key_name} or NEXT_PUBLIC_SUPABASE_URL")

    async with create_async_client() as client:
        rows = await fetch_rows(client, supabase_url, api_key)
        candidates = filter_candidates(rows, only_hosts)
        if limit is not None:
            candidates = candidates[: max(limit, 0)]

        migrated: list[dict[str, str]] = []
        failed: list[dict[str, str]] = []
        report: dict[str, object] = {
            "started_at": datetime.now(timezone.utc).isoformat(),
            "apply": apply,
            "bucket": bucket,
            "public_base_url": public_base_url,
            "total_rows_with_poster": len(rows),
            "candidate_count": len(candidates),
            "migrated": migrated,
            "failed": failed,
        }

        if not apply:
            report["planned"] = [
                {
                    "id": row.id,
                    "title": row.title,
                    "source_host": urlparse(row.poster_image_url).hostname or "",
                    "source_url": row.poster_image_url,
                }
                for row in candidates
            ]
            output_path = report_path or default_report_path()
            write_report(output_path, report)
            print(f"dry_run candidates={len(candidates)} report={output_path}")
            return

        with tempfile.TemporaryDirectory(prefix="gongmozip-r2-") as temp_name:
            temp_dir = Path(temp_name)
            for index, row in enumerate(candidates, start=1):
                host = urlparse(row.poster_image_url).hostname or "unknown"
                try:
                    result = await migrate_one(
                        client,
                        row,
                        bucket=bucket,
                        public_base_url=public_base_url,
                        supabase_url=supabase_url,
                        api_key=api_key,
                        temp_dir=temp_dir,
                    )
                    migrated.append(result)
                    print(f"[{index}/{len(candidates)}] migrated {row.id} {host}")
                except Exception as exc:  # noqa: BLE001
                    failed.append({"id": row.id, "title": row.title, "source_host": host, "error": str(exc)})
                    print(f"[{index}/{len(candidates)}] failed {row.id} {host}: {exc}")

        output_path = report_path or default_report_path()
        write_report(output_path, report)
        if failed:
            raise SystemExit(f"migration finished with failures; report={output_path}")
        print(f"migration complete migrated={len(migrated)} report={output_path}")
