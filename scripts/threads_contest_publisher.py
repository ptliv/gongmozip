"""
Gongmozip Threads publisher.

This one-shot script reuses the existing Threads automator profile database when
available, builds a short contest roundup, posts it to Threads, and adds the
shortened Gongmozip link as the first reply.

Dry-run is the default. Add --publish to actually post.
"""

from __future__ import annotations

import argparse
import json
import os
import random
import re
import sqlite3
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

import requests
from dotenv import load_dotenv

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT_DIR = SCRIPT_DIR.parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from utils.supabase_client import get_supabase_client  # noqa: E402


KST = ZoneInfo("Asia/Seoul")
THREADS_GRAPH_BASE_URL = "https://graph.threads.net/v1.0"
THREADS_REFRESH_URL = "https://graph.threads.net/refresh_access_token"
THREADS_EXCHANGE_URL = "https://graph.threads.net/access_token"
THREADS_MAX_TEXT_LEN = 500
LOCAL_DAILY_PUBLISH_LIMIT = 10
PUBLISH_UNITS_PER_RUN = 2
DEFAULT_TOKEN_REFRESH_WINDOW_DAYS = 14
DEFAULT_SITE_URL = "https://www.gongmozip.com"
DEFAULT_THREADS_DB_PATH = Path(r"C:\madeinmine\threads auto\threads_automator\data\app.db")
DEFAULT_HISTORY_PATH = SCRIPT_DIR / "data" / "threads_contest_history.json"
THREADS_KEYRING_APP_NAME = "threads_automator"

SELECT_COLUMNS = (
    "id, slug, title, organizer, summary, description, type, category, field, target, "
    "apply_end_at, benefit, review_score, verified_level, poster_image_url, status, "
    "official_source_url, aggregator_source_url, source_site"
)

CTA_TEXT = "더 자세한 조건을 알고 싶으면 아래 링크를 눌러서 확인하세요."

HOOKS: dict[str, list[str]] = {
    "1020": [
        "1020이 방학 전에 스펙을 효율적으로 쌓으려면, 지금 열려 있는 공모전부터 빠르게 골라야 합니다.",
        "1020 첫 스펙은 오래 고민하는 것보다, 마감 남은 공모전 몇 개를 바로 비교하는 게 빠릅니다.",
        "1020이 포트폴리오 첫 줄을 만들고 싶다면, 오늘은 이 공모전들부터 확인해보세요.",
    ],
    "2030": [
        "2030이 퇴근 후 스펙을 효율적으로 쌓으려면, 시간 대비 남는 공모전만 추려보면 됩니다.",
        "2030 커리어에 한 줄 더 얹고 싶다면, 이번 주에는 이 공모전들이 먼저입니다.",
        "2030이 사이드 프로젝트처럼 도전하기 좋은 공모전만 골라보면 이 정도입니다.",
    ],
    "3040": [
        "3040이 커리어 전환용 이력 한 줄을 만들려면, 준비 대비 남는 공모전부터 봐야 합니다.",
        "3040에게 필요한 건 많은 공고가 아니라, 경력에 연결될 만한 공모전을 빠르게 고르는 일입니다.",
        "3040이 새 분야 감각을 만들고 싶다면, 마감 전 검토할 공모전은 이렇게 추릴 수 있습니다.",
    ],
}


@dataclass
class ThreadsCredentials:
    access_token: str
    user_id: str
    profile: dict[str, Any] | None
    source: str


class ThreadsPublishError(RuntimeError):
    """Raised when the Threads Graph API rejects a publish request."""


def load_env() -> None:
    load_dotenv(ROOT_DIR / ".env.local")
    load_dotenv(ROOT_DIR / ".env")


def today_key() -> str:
    return datetime.now(KST).date().isoformat()


def now_iso() -> str:
    return datetime.now(KST).isoformat(timespec="seconds")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso_utc(value: datetime | None = None) -> str:
    dt = value or utc_now()
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def parse_date_key(value: Any) -> datetime | None:
    if not value:
        return None
    text = str(value).strip()
    if not text:
        return None
    for fmt in ("%Y-%m-%d", "%Y.%m.%d", "%Y/%m/%d"):
        try:
            return datetime.strptime(text[:10], fmt).replace(tzinfo=KST)
        except ValueError:
            pass
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).astimezone(KST)
    except ValueError:
        return None


def parse_datetime_any(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    text = str(value).strip()
    if not text:
        return None
    normalized = text.replace("Z", "+00:00").replace(" ", "T")
    try:
        parsed = datetime.fromisoformat(normalized)
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except ValueError:
        pass
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d"):
        try:
            parsed = datetime.strptime(text[: len(fmt)], fmt)
            return parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def days_until(value: Any) -> int | None:
    target = parse_date_key(value)
    if not target:
        return None
    return (target.date() - datetime.now(KST).date()).days


def clean_whitespace(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def truncate(value: str, max_len: int) -> str:
    text = clean_whitespace(value)
    if len(text) <= max_len:
        return text
    return text[: max(1, max_len - 1)].rstrip() + "…"


def normalize_target(value: Any) -> list[str]:
    if isinstance(value, list):
        return [clean_whitespace(item) for item in value if clean_whitespace(item)]
    if isinstance(value, str) and value.strip():
        return [part.strip() for part in re.split(r"[,/|]", value) if part.strip()]
    return []


def parse_benefit(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str) and value.strip():
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {"text": value}
        except json.JSONDecodeError:
            return {"text": value}
    return {}


def has_valid_thumbnail(row: dict[str, Any]) -> bool:
    url = clean_whitespace(row.get("poster_image_url"))
    if not url.startswith(("http://", "https://")):
        return False
    lowered = url.lower()
    return "placeholder" not in lowered and "no-image" not in lowered and "no_image" not in lowered


def score_value(row: dict[str, Any]) -> int:
    try:
        return int(row.get("review_score") or 0)
    except (TypeError, ValueError):
        return 0


def field_label(row: dict[str, Any]) -> str:
    for key in ("field", "category", "type"):
        text = clean_whitespace(row.get(key))
        if text:
            return text
    return "공모전"


def dday_label(row: dict[str, Any]) -> str:
    days = days_until(row.get("apply_end_at"))
    if days is None:
        return "마감일 확인"
    if days == 0:
        return "D-day"
    if days > 0:
        return f"D-{days}"
    return "마감됨"


def contest_sort_key(row: dict[str, Any]) -> tuple[int, int, str]:
    days = days_until(row.get("apply_end_at"))
    safe_days = days if days is not None else 9999
    return (safe_days, -score_value(row), clean_whitespace(row.get("title")))


def load_history(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    return data if isinstance(data, list) else []


def write_history(path: Path, records: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    trimmed = records[-200:]
    path.write_text(json.dumps(trimmed, ensure_ascii=False, indent=2), encoding="utf-8")


def recent_history_ids(records: list[dict[str, Any]], history_days: int) -> set[str]:
    cutoff_days = max(0, int(history_days))
    seen: set[str] = set()
    today = datetime.now(KST).date()

    for record in records:
        published_at = parse_date_key(record.get("published_at"))
        if cutoff_days and published_at and (today - published_at.date()).days > cutoff_days:
            continue
        for contest in record.get("contests") or []:
            contest_id = contest.get("id") if isinstance(contest, dict) else None
            if contest_id:
                seen.add(str(contest_id))
    return seen


def count_today_history_publish_units(records: list[dict[str, Any]]) -> int:
    today = datetime.now(KST).date()
    total = 0
    for record in records:
        if record.get("dry_run"):
            continue
        published_at = parse_date_key(record.get("published_at"))
        if not published_at or published_at.date() != today:
            continue
        units = record.get("publish_units")
        if units is not None:
            total += safe_int(units, 0)
            continue
        total += 1 if record.get("media_id") else 0
        total += 1 if record.get("reply_id") else 0
    return total


def fetch_candidate_contests(pool_size: int, min_score: int) -> list[dict[str, Any]]:
    client = get_supabase_client()
    response = (
        client.table("contests")
        .select(SELECT_COLUMNS)
        .in_("status", ["ongoing", "upcoming"])
        .gte("verified_level", 1)
        .gt("apply_end_at", today_key())
        .order("apply_end_at", desc=False)
        .limit(max(10, int(pool_size)))
        .execute()
    )
    rows = [row for row in (response.data or []) if has_valid_thumbnail(row)]
    rows.sort(key=contest_sort_key)

    preferred = [row for row in rows if score_value(row) >= min_score]
    fallback = [row for row in rows if score_value(row) < min_score]
    return preferred + fallback


def pick_contests(
    rows: list[dict[str, Any]],
    count: int,
    history_records: list[dict[str, Any]],
    history_days: int,
    ignore_history: bool,
) -> list[dict[str, Any]]:
    safe_count = max(1, min(int(count), 10))
    if ignore_history:
        return rows[:safe_count]

    recent_ids = recent_history_ids(history_records, history_days)
    fresh = [row for row in rows if str(row.get("id")) not in recent_ids]
    picks = fresh[:safe_count]
    if len(picks) >= safe_count:
        return picks

    used = {str(row.get("id")) for row in picks}
    refill = [row for row in rows if str(row.get("id")) not in used]
    return (picks + refill)[:safe_count]


def choose_audience(value: str) -> str:
    if value in {"1020", "2030", "3040"}:
        return value
    audiences = ["1020", "2030", "3040"]
    return audiences[datetime.now(KST).date().toordinal() % len(audiences)]


def choose_hook(audience: str) -> str:
    hooks = HOOKS.get(audience) or HOOKS["2030"]
    random.seed(f"{today_key()}-{audience}")
    return random.choice(hooks)


def build_contest_line(row: dict[str, Any], index: int, title_len: int, compact: bool) -> str:
    title = truncate(row.get("title") or "제목 확인 필요", title_len)
    dday = dday_label(row)
    field = truncate(field_label(row), 12)
    if compact:
        return f"{index}. {title} ({dday})"
    return f"{index}. {title} - {dday} / {field}"


def compose_body(
    hook: str,
    contests: list[dict[str, Any]],
    requested_count: int,
) -> tuple[str, list[dict[str, Any]]]:
    max_count = min(len(contests), max(1, int(requested_count)))
    for count in range(max_count, 0, -1):
        selected = contests[:count]
        for compact in (False, True):
            for title_len in (44, 36, 30, 24):
                lines = [hook, ""]
                lines.extend(
                    build_contest_line(row, index, title_len=title_len, compact=compact)
                    for index, row in enumerate(selected, start=1)
                )
                lines.extend(["", CTA_TEXT])
                body = "\n".join(lines).strip()
                if len(body) <= THREADS_MAX_TEXT_LEN:
                    return body, selected
    raise ValueError("Threads 본문 500자 안에 담을 수 있는 공모전이 없습니다.")


def build_tracking_url(site_url: str, audience: str) -> str:
    base = site_url.rstrip("/")
    query = urlencode(
        {
            "utm_source": "threads",
            "utm_medium": "social",
            "utm_campaign": f"threads_auto_{today_key().replace('-', '')}_{audience}",
        }
    )
    return f"{base}/contests?{query}"


def shorten_url(url: str, provider: str) -> str:
    provider = (provider or "tinyurl").lower()
    if provider == "none":
        return url

    try:
        if provider == "tinyurl":
            response = requests.get(
                "https://tinyurl.com/api-create.php",
                params={"url": url},
                timeout=10,
            )
            response.raise_for_status()
            short_url = response.text.strip()
        elif provider == "isgd":
            response = requests.get(
                "https://is.gd/create.php",
                params={"format": "simple", "url": url},
                timeout=10,
            )
            response.raise_for_status()
            short_url = response.text.strip()
        else:
            raise ValueError(f"지원하지 않는 단축링크 provider입니다: {provider}")
    except Exception as exc:
        print(f"[warn] 단축링크 생성 실패, 원본 링크 사용: {exc}", file=sys.stderr)
        return url

    if short_url.startswith(("http://", "https://")):
        return short_url
    print(f"[warn] 단축링크 응답이 URL이 아니어서 원본 링크 사용: {short_url[:80]}", file=sys.stderr)
    return url


def build_comment(short_url: str) -> str:
    return f"자세한 조건과 신청 링크:\n{short_url}"


def read_threads_profiles(db_path: Path) -> list[dict[str, Any]]:
    if not db_path.exists():
        return []
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        columns = {row[1] for row in conn.execute("PRAGMA table_info(profiles)").fetchall()}
        optional_columns = [
            "last_published_at",
            "threads_app_id",
            "threads_app_secret",
            "threads_token_expires_at",
            "threads_token_refresh_after",
            "threads_token_refresh_interval_days",
            "threads_token_last_checked_at",
            "threads_token_status",
            "threads_token_last_error",
        ]
        select_columns = [
            "id",
            "name",
            "access_token",
            "user_id",
            "is_active",
            "account_status",
            "daily_post_count",
            "max_posts_per_day",
            "daily_job_count",
            "max_jobs_per_day",
            "threads_proxy_url",
        ]
        select_columns.extend(column for column in optional_columns if column in columns)
        rows = conn.execute(
            f"SELECT {', '.join(select_columns)} FROM profiles ORDER BY id"
        ).fetchall()
    return [dict(row) for row in rows]


def find_profile(db_path: Path, profile_name: str | None) -> dict[str, Any] | None:
    profiles = read_threads_profiles(db_path)
    if profile_name:
        for profile in profiles:
            if profile.get("name") == profile_name:
                return profile
        return None

    active = [
        profile
        for profile in profiles
        if int(profile.get("is_active") or 0) == 1
        and (profile.get("account_status") or "active") == "active"
    ]
    return active[0] if len(active) == 1 else None


def read_keyring_token(profile_name: str) -> str | None:
    try:
        import keyring  # type: ignore
    except ImportError:
        return None

    try:
        token = keyring.get_password(THREADS_KEYRING_APP_NAME, profile_name)
    except Exception:
        return None
    return token.strip() if token else None


def write_keyring_token(profile_name: str, token: str) -> None:
    if not profile_name or not token:
        return
    try:
        import keyring  # type: ignore
    except ImportError:
        return
    try:
        keyring.set_password(THREADS_KEYRING_APP_NAME, profile_name, token)
    except Exception:
        return


def update_env_file(env_path: Path, updates: dict[str, str]) -> None:
    if not updates:
        return
    lines = env_path.read_text(encoding="utf-8").splitlines() if env_path.exists() else []
    seen: set[str] = set()
    next_lines: list[str] = []
    for line in lines:
        match = re.match(r"^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=", line)
        if match and match.group(1) in updates:
            key = match.group(1)
            next_lines.append(f"{key}={updates[key]}")
            seen.add(key)
        else:
            next_lines.append(line)

    missing = [key for key in updates if key not in seen]
    if missing and next_lines and next_lines[-1].strip():
        next_lines.append("")
    for key in missing:
        next_lines.append(f"{key}={updates[key]}")

    env_path.write_text("\n".join(next_lines) + "\n", encoding="utf-8")


def update_profile_token_fields(db_path: Path, profile: dict[str, Any] | None, updates: dict[str, Any]) -> None:
    if not profile or not updates or not db_path.exists():
        return
    profile_id = profile.get("id")
    if not profile_id:
        return
    with sqlite3.connect(db_path) as conn:
        columns = {row[1] for row in conn.execute("PRAGMA table_info(profiles)").fetchall()}
        fields = {key: value for key, value in updates.items() if key in columns}
        if not fields:
            return
        clause = ", ".join(f"{key}=?" for key in fields)
        conn.execute(
            f"UPDATE profiles SET {clause} WHERE id=?",
            (*fields.values(), profile_id),
        )
        conn.commit()


def token_error_message(response: requests.Response) -> str:
    try:
        data = response.json()
    except Exception:
        return response.text or f"HTTP {response.status_code}"
    error = data.get("error") if isinstance(data, dict) else None
    if isinstance(error, dict):
        code = error.get("code")
        message = error.get("message") or str(error)
        return f"{message} (code={code})" if code else str(message)
    return str(data)


def refresh_long_lived_threads_token(access_token: str, timeout: int = 15) -> dict[str, Any]:
    response = requests.get(
        THREADS_REFRESH_URL,
        params={"grant_type": "th_refresh_token", "access_token": access_token},
        timeout=timeout,
    )
    if not response.ok:
        raise RuntimeError(token_error_message(response))
    data = response.json()
    new_token = data.get("access_token") or access_token
    expires_in = safe_int(data.get("expires_in"), 0)
    expires_at = utc_now() + timedelta(seconds=expires_in) if expires_in > 0 else None
    return {
        "access_token": new_token,
        "expires_in": expires_in,
        "expires_at": iso_utc(expires_at) if expires_at else "",
        "raw": data,
    }


def exchange_threads_token(access_token: str, app_secret: str, timeout: int = 15) -> dict[str, Any]:
    if not app_secret:
        raise ValueError("THREADS_APP_SECRET is required to exchange a short-lived token.")
    response = requests.get(
        THREADS_EXCHANGE_URL,
        params={
            "grant_type": "th_exchange_token",
            "client_secret": app_secret,
            "access_token": access_token,
        },
        timeout=timeout,
    )
    if not response.ok:
        raise RuntimeError(token_error_message(response))
    data = response.json()
    new_token = data.get("access_token") or access_token
    expires_in = safe_int(data.get("expires_in"), 0)
    expires_at = utc_now() + timedelta(seconds=expires_in) if expires_in > 0 else None
    return {
        "access_token": new_token,
        "expires_in": expires_in,
        "expires_at": iso_utc(expires_at) if expires_at else "",
        "raw": data,
    }


def token_expiry_from_sources(profile: dict[str, Any] | None) -> datetime | None:
    env_value = os.getenv("THREADS_TOKEN_EXPIRES_AT", "")
    profile_value = (profile or {}).get("threads_token_expires_at")
    return parse_datetime_any(env_value) or parse_datetime_any(profile_value)


def persist_refreshed_token(
    credentials: ThreadsCredentials,
    args: argparse.Namespace,
    refreshed: dict[str, Any],
    status: str,
) -> None:
    new_token = refreshed["access_token"]
    expires_at = refreshed.get("expires_at") or ""
    checked_at = iso_utc()
    db_path = Path(args.threads_db_path)
    profile_updates = {
        "access_token": new_token,
        "threads_token_expires_at": expires_at,
        "threads_token_last_checked_at": checked_at,
        "threads_token_status": status,
        "threads_token_last_error": "",
    }
    update_profile_token_fields(db_path, credentials.profile, profile_updates)
    if credentials.profile:
        write_keyring_token(str(credentials.profile.get("name") or ""), new_token)
        credentials.profile.update(profile_updates)

    env_updates = {
        "THREADS_ACCESS_TOKEN": new_token,
        "THREADS_TOKEN_EXPIRES_AT": expires_at,
        "THREADS_TOKEN_LAST_REFRESHED_AT": checked_at,
        "THREADS_TOKEN_STATUS": status,
    }
    update_env_file(Path(args.env_path), env_updates)


def ensure_threads_token_fresh(credentials: ThreadsCredentials, args: argparse.Namespace) -> ThreadsCredentials:
    if not args.auto_refresh_token:
        return credentials

    expires_at = token_expiry_from_sources(credentials.profile)
    refresh_window = timedelta(days=max(1, int(args.token_refresh_window_days)))
    should_refresh = bool(args.force_token_refresh or expires_at is None)
    if expires_at is not None:
        should_refresh = expires_at <= utc_now() + refresh_window

    if not should_refresh:
        return credentials

    try:
        try:
            refreshed = refresh_long_lived_threads_token(credentials.access_token)
            status = "refreshed"
        except Exception:
            app_secret = (
                args.app_secret
                or os.getenv("THREADS_APP_SECRET", "")
                or str((credentials.profile or {}).get("threads_app_secret") or "")
            )
            refreshed = exchange_threads_token(credentials.access_token, app_secret)
            status = "exchanged"

        credentials.access_token = refreshed["access_token"]
        persist_refreshed_token(credentials, args, refreshed, status)
        print(
            "[token] Threads token "
            f"{status}; expires_at={refreshed.get('expires_at') or 'unknown'}"
        )
        return credentials
    except Exception as exc:
        update_profile_token_fields(
            Path(args.threads_db_path),
            credentials.profile,
            {
                "threads_token_last_checked_at": iso_utc(),
                "threads_token_status": "refresh_failed",
                "threads_token_last_error": str(exc)[:500],
            },
        )
        print(f"[warn] Threads token refresh failed; using existing token: {exc}", file=sys.stderr)
        if args.require_token_refresh:
            raise
        return credentials


def refresh_profile_daily_counts(db_path: Path, profile: dict[str, Any] | None) -> dict[str, Any] | None:
    if not profile or not db_path.exists():
        return profile

    last_published = parse_date_key(profile.get("last_published_at"))
    if not last_published or last_published.date() >= datetime.now(KST).date():
        return profile

    profile_id = profile.get("id")
    if not profile_id:
        return profile

    with sqlite3.connect(db_path) as conn:
        conn.execute(
            "UPDATE profiles SET daily_post_count = 0, daily_job_count = 0 WHERE id=?",
            (profile_id,),
        )
        conn.commit()

    updated = dict(profile)
    updated["daily_post_count"] = 0
    updated["daily_job_count"] = 0
    return updated


def resolve_credentials(args: argparse.Namespace) -> ThreadsCredentials:
    db_path = Path(args.threads_db_path)
    profile_name = args.profile_name or os.getenv("THREADS_PROFILE_NAME")
    profile = find_profile(db_path, profile_name)
    profile = refresh_profile_daily_counts(db_path, profile)

    if profile_name and not profile:
        raise ValueError(f"Threads 프로필을 찾지 못했습니다: {profile_name}")

    token = (args.access_token or os.getenv("THREADS_ACCESS_TOKEN") or "").strip()
    user_id = (args.user_id or os.getenv("THREADS_USER_ID") or "").strip()
    source = "env"

    if not user_id and profile:
        user_id = clean_whitespace(profile.get("user_id"))
        source = f"profile:{profile.get('name')}"

    if not token and profile:
        db_token = clean_whitespace(profile.get("access_token"))
        if len(db_token) > 20:
            token = db_token
            source = f"profile-db:{profile.get('name')}"

    if not token and profile:
        token = read_keyring_token(str(profile.get("name") or "")) or ""
        if token:
            source = f"keyring:{profile.get('name')}"

    if not token:
        raise ValueError(
            "Threads access token이 없습니다. THREADS_ACCESS_TOKEN 환경변수를 넣거나 "
            "--profile-name으로 기존 Threads 프로필을 지정하세요."
        )
    if not user_id:
        raise ValueError(
            "Threads user_id가 없습니다. THREADS_USER_ID 환경변수를 넣거나 "
            "기존 Threads 프로필의 user_id를 사용하세요."
        )

    return ThreadsCredentials(access_token=token, user_id=user_id, profile=profile, source=source)


def effective_daily_limit(profile: dict[str, Any] | None, requested_limit: int) -> int:
    requested = min(max(1, safe_int(requested_limit, LOCAL_DAILY_PUBLISH_LIMIT)), LOCAL_DAILY_PUBLISH_LIMIT)
    if not profile:
        return requested
    profile_limit = safe_int(profile.get("max_posts_per_day"), LOCAL_DAILY_PUBLISH_LIMIT)
    profile_limit = min(max(1, profile_limit), LOCAL_DAILY_PUBLISH_LIMIT)
    return min(requested, profile_limit)


def get_profile_daily_count(profile: dict[str, Any] | None) -> int:
    if not profile:
        return 0
    return safe_int(profile.get("daily_post_count"), 0)


def ensure_profile_publish_allowed(
    profile: dict[str, Any] | None,
    ignore_limit: bool,
    required_units: int,
    requested_daily_limit: int,
    history_records: list[dict[str, Any]],
) -> None:
    if ignore_limit:
        return
    limit = effective_daily_limit(profile, requested_daily_limit)
    used = get_profile_daily_count(profile) if profile else count_today_history_publish_units(history_records)
    if used + required_units > limit:
        source = f"profile '{profile.get('name')}'" if profile else "local history"
        raise RuntimeError(
            f"Daily Threads publish limit reached for {source}: "
            f"used={used}, required={required_units}, limit={limit}. "
            "One Gongmozip roundup uses 2 publishes: body + reply link."
        )


def increment_profile_count(db_path: Path, profile: dict[str, Any] | None, units: int = 1) -> None:
    if not profile or not db_path.exists():
        return
    profile_id = profile.get("id")
    if not profile_id:
        return
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            """
            UPDATE profiles
            SET daily_post_count = COALESCE(daily_post_count, 0) + ?,
                daily_job_count = COALESCE(daily_job_count, 0) + ?,
                last_published_at = datetime('now','localtime')
            WHERE id=?
            """,
            (max(1, int(units)), max(1, int(units)), profile_id),
        )
        conn.commit()


class ThreadsGraphPublisher:
    def __init__(self, access_token: str, user_id: str):
        self.access_token = access_token
        self.user_id = user_id

    def _params(self, extra: dict[str, Any] | None = None) -> dict[str, Any]:
        params = {"access_token": self.access_token}
        if extra:
            params.update(extra)
        return params

    def _post(self, path: str, params: dict[str, Any], label: str) -> requests.Response:
        response = requests.post(
            f"{THREADS_GRAPH_BASE_URL}{path}",
            data=self._params(params),
            timeout=60,
        )
        if not response.ok:
            raise ThreadsPublishError(f"{label} 실패 ({response.status_code}): {response.text[:500]}")
        return response

    def _wait_ready(self, container_id: str, timeout_seconds: int = 30) -> None:
        for _ in range(timeout_seconds):
            response = requests.get(
                f"{THREADS_GRAPH_BASE_URL}/{container_id}",
                params=self._params({"fields": "status,error_message"}),
                timeout=15,
            )
            if not response.ok:
                raise ThreadsPublishError(
                    f"container status 확인 실패 ({response.status_code}): {response.text[:500]}"
                )
            data = response.json()
            status = data.get("status")
            if status == "FINISHED":
                return
            if status == "ERROR":
                raise ThreadsPublishError(f"container 오류: {data.get('error_message')}")
            time.sleep(1)
        raise TimeoutError("Threads container 준비 시간이 초과되었습니다.")

    def publish_post(self, text: str) -> str:
        safe_text = text.strip()
        if len(safe_text) > THREADS_MAX_TEXT_LEN:
            raise ValueError(f"Threads 본문은 {THREADS_MAX_TEXT_LEN}자 이하여야 합니다.")

        response = self._post(
            f"/{self.user_id}/threads",
            {"text": safe_text, "media_type": "TEXT"},
            "publish_post",
        )
        container_id = response.json()["id"]
        self._wait_ready(container_id)

        response = self._post(
            f"/{self.user_id}/threads_publish",
            {"creation_id": container_id},
            "threads_publish",
        )
        return str(response.json()["id"])

    def publish_reply(self, reply_to_id: str, text: str) -> str:
        safe_text = text.strip()
        if len(safe_text) > THREADS_MAX_TEXT_LEN:
            raise ValueError(f"Threads 댓글은 {THREADS_MAX_TEXT_LEN}자 이하여야 합니다.")

        response = self._post(
            f"/{self.user_id}/threads",
            {"text": safe_text, "media_type": "TEXT", "reply_to_id": reply_to_id},
            "publish_reply",
        )
        container_id = response.json()["id"]
        self._wait_ready(container_id)

        response = self._post(
            f"/{self.user_id}/threads_publish",
            {"creation_id": container_id},
            "threads_publish(reply)",
        )
        return str(response.json()["id"])


def get_threads_remote_quota(access_token: str) -> dict[str, Any] | None:
    try:
        response = requests.get(
            f"{THREADS_GRAPH_BASE_URL}/me/threads_publishing_limit",
            params={
                "fields": "quota_usage,config,reply_quota_usage,reply_config",
                "access_token": access_token,
            },
            timeout=15,
        )
        if not response.ok:
            return None
        data = response.json()
        rows = data.get("data") if isinstance(data, dict) else None
        if isinstance(rows, list) and rows:
            return rows[0]
        return data if isinstance(data, dict) else None
    except Exception:
        return None


def get_threads_me(access_token: str) -> dict[str, Any]:
    response = requests.get(
        f"{THREADS_GRAPH_BASE_URL}/me",
        params={"fields": "id,username", "access_token": access_token},
        timeout=15,
    )
    if not response.ok:
        raise RuntimeError(f"Threads /me failed ({response.status_code}): {response.text[:500]}")
    return response.json()


def align_credentials_user_id(credentials: ThreadsCredentials, args: argparse.Namespace) -> ThreadsCredentials:
    if not args.auto_detect_user_id:
        return credentials

    me = get_threads_me(credentials.access_token)
    detected_user_id = clean_whitespace(me.get("id"))
    if not detected_user_id:
        return credentials

    if detected_user_id != credentials.user_id:
        print(
            "[token] THREADS_USER_ID mismatch; "
            f"using token /me id {detected_user_id} "
            f"(@{me.get('username') or 'unknown'}) instead of {credentials.user_id}"
        )
        credentials.user_id = detected_user_id

        env_updates = {
            "THREADS_USER_ID": detected_user_id,
            "THREADS_USERNAME": clean_whitespace(me.get("username")),
        }
        update_env_file(Path(args.env_path), env_updates)

        if credentials.source.startswith(("profile", "profile-db", "keyring")):
            update_profile_token_fields(
                Path(args.threads_db_path),
                credentials.profile,
                {"user_id": detected_user_id},
            )

    return credentials


def ensure_remote_quota_available(quota: dict[str, Any] | None) -> None:
    if not quota:
        return
    post_used = safe_int(quota.get("quota_usage"), 0)
    post_total = safe_int((quota.get("config") or {}).get("quota_total"), 0)
    reply_used = safe_int(quota.get("reply_quota_usage"), 0)
    reply_total = safe_int((quota.get("reply_config") or {}).get("quota_total"), 0)

    if post_total and post_used + 1 > post_total:
        raise RuntimeError(f"Threads remote post quota reached: {post_used}/{post_total}")
    if reply_total and reply_used + 1 > reply_total:
        raise RuntimeError(f"Threads remote reply quota reached: {reply_used}/{reply_total}")


def notify_discord(webhook_url: str, title: str, message: str, success: bool) -> None:
    if not webhook_url:
        return
    color = 0x2ECC71 if success else 0xE74C3C
    try:
        requests.post(
            webhook_url,
            json={
                "embeds": [
                    {
                        "title": title,
                        "description": message[:3800],
                        "color": color,
                        "timestamp": datetime.now(KST).isoformat(),
                    }
                ]
            },
            timeout=10,
        ).raise_for_status()
    except Exception as exc:
        print(f"[warn] Discord 알림 실패: {exc}", file=sys.stderr)


def print_profiles(db_path: Path) -> None:
    profiles = read_threads_profiles(db_path)
    if not profiles:
        print(f"프로필 없음: {db_path}")
        return
    print(f"Threads profile DB: {db_path}")
    for profile in profiles:
        token_state = "db-token" if clean_whitespace(profile.get("access_token")) else "no-db-token"
        print(
            "- "
            f"id={profile.get('id')} "
            f"name={profile.get('name')} "
            f"active={profile.get('is_active')} "
            f"status={profile.get('account_status')} "
            f"user_id={profile.get('user_id')} "
            f"posts={profile.get('daily_post_count')}/{profile.get('max_posts_per_day')} "
            f"jobs={profile.get('daily_job_count')}/{profile.get('max_jobs_per_day')} "
            f"last={profile.get('last_published_at')} "
            f"token_status={profile.get('threads_token_status') or 'unknown'} "
            f"token_expires={profile.get('threads_token_expires_at') or 'unknown'} "
            f"token={token_state}"
        )


def build_history_record(
    audience: str,
    body: str,
    comment: str,
    target_url: str,
    short_url: str,
    contests: list[dict[str, Any]],
    media_id: str | None,
    reply_id: str | None,
    publish_units: int,
    dry_run: bool,
) -> dict[str, Any]:
    return {
        "published_at": now_iso(),
        "dry_run": dry_run,
        "audience": audience,
        "body": body,
        "comment": comment,
        "target_url": target_url,
        "short_url": short_url,
        "media_id": media_id,
        "reply_id": reply_id,
        "publish_units": publish_units,
        "contests": [
            {
                "id": row.get("id"),
                "slug": row.get("slug"),
                "title": row.get("title"),
                "apply_end_at": row.get("apply_end_at"),
                "review_score": row.get("review_score"),
            }
            for row in contests
        ],
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Publish a Gongmozip contest roundup to Threads.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("--publish", action="store_true", help="실제로 Threads에 발행합니다.")
    parser.add_argument("--count", type=int, default=int(os.getenv("THREADS_CONTEST_COUNT", "5")))
    parser.add_argument("--min-contests", type=int, default=3, help="실제 발행에 필요한 최소 공모전 수")
    parser.add_argument("--pool-size", type=int, default=80)
    parser.add_argument("--min-score", type=int, default=70)
    parser.add_argument("--audience", choices=["auto", "1020", "2030", "3040"], default="auto")
    parser.add_argument("--target-url", default=os.getenv("THREADS_TARGET_URL", ""))
    parser.add_argument(
        "--shortener",
        choices=["tinyurl", "isgd", "none"],
        default=os.getenv("THREADS_SHORTENER", "tinyurl"),
    )
    parser.add_argument("--profile-name", default=os.getenv("THREADS_PROFILE_NAME", ""))
    parser.add_argument("--user-id", default=os.getenv("THREADS_USER_ID", ""))
    parser.add_argument("--access-token", default=os.getenv("THREADS_ACCESS_TOKEN", ""))
    parser.add_argument("--app-secret", default=os.getenv("THREADS_APP_SECRET", ""))
    parser.add_argument("--env-path", default=os.getenv("THREADS_ENV_PATH", str(ROOT_DIR / ".env.local")))
    parser.add_argument(
        "--auto-refresh-token",
        dest="auto_refresh_token",
        action=argparse.BooleanOptionalAction,
        default=os.getenv("THREADS_TOKEN_AUTO_REFRESH", "true").lower() not in {"0", "false", "no"},
    )
    parser.add_argument("--force-token-refresh", action="store_true")
    parser.add_argument("--require-token-refresh", action="store_true")
    parser.add_argument(
        "--auto-detect-user-id",
        dest="auto_detect_user_id",
        action=argparse.BooleanOptionalAction,
        default=os.getenv("THREADS_AUTO_DETECT_USER_ID", "true").lower() not in {"0", "false", "no"},
    )
    parser.add_argument(
        "--token-refresh-window-days",
        type=int,
        default=int(os.getenv("THREADS_TOKEN_REFRESH_WINDOW_DAYS", str(DEFAULT_TOKEN_REFRESH_WINDOW_DAYS))),
    )
    parser.add_argument(
        "--threads-db-path",
        default=os.getenv("THREADS_AUTOMATOR_DB_PATH", str(DEFAULT_THREADS_DB_PATH)),
    )
    parser.add_argument(
        "--history-path",
        default=os.getenv("THREADS_CONTEST_HISTORY_PATH", str(DEFAULT_HISTORY_PATH)),
    )
    parser.add_argument("--history-days", type=int, default=14)
    parser.add_argument("--ignore-history", action="store_true")
    parser.add_argument("--ignore-profile-limit", action="store_true")
    parser.add_argument(
        "--daily-limit",
        type=int,
        default=int(os.getenv("THREADS_DAILY_LIMIT", str(LOCAL_DAILY_PUBLISH_LIMIT))),
        help="로컬 안전 일일 발행 한도입니다. 실제 적용값은 최대 10입니다.",
    )
    parser.add_argument("--list-profiles", action="store_true")
    parser.add_argument("--discord-webhook-url", default=os.getenv("THREADS_DISCORD_WEBHOOK_URL", ""))
    return parser.parse_args()


def main() -> int:
    load_env()
    args = parse_args()
    db_path = Path(args.threads_db_path)

    if args.list_profiles:
        print_profiles(db_path)
        return 0

    history_path = Path(args.history_path)
    history_records = load_history(history_path)
    audience = choose_audience(args.audience)
    site_url = (os.getenv("NEXT_PUBLIC_SITE_URL") or DEFAULT_SITE_URL).rstrip("/")
    target_url = args.target_url or build_tracking_url(site_url, audience)

    try:
        rows = fetch_candidate_contests(pool_size=args.pool_size, min_score=args.min_score)
        picks = pick_contests(
            rows=rows,
            count=args.count,
            history_records=history_records,
            history_days=args.history_days,
            ignore_history=args.ignore_history,
        )
        if args.publish and len(picks) < args.min_contests:
            raise RuntimeError(f"발행 가능한 공모전이 {len(picks)}개뿐입니다. 최소 {args.min_contests}개가 필요합니다.")

        hook = choose_hook(audience)
        body, selected = compose_body(hook, picks, requested_count=args.count)
        short_url = shorten_url(target_url, args.shortener)
        comment = build_comment(short_url)

        print("=== Threads 본문 미리보기 ===")
        print(body)
        print("\n=== 댓글 미리보기 ===")
        print(comment)
        print("\n=== 선택된 공모전 ===")
        for row in selected:
            print(
                f"- {row.get('title')} | {dday_label(row)} | "
                f"score={score_value(row)} | slug={row.get('slug')}"
            )

        if not args.publish:
            print("\n[dry-run] 실제 발행은 하지 않았습니다. 발행하려면 --publish를 붙이세요.")
            return 0

        credentials = resolve_credentials(args)
        credentials = ensure_threads_token_fresh(credentials, args)
        credentials = align_credentials_user_id(credentials, args)
        required_units = PUBLISH_UNITS_PER_RUN
        ensure_profile_publish_allowed(
            credentials.profile,
            args.ignore_profile_limit,
            required_units,
            args.daily_limit,
            history_records,
        )
        remote_quota = get_threads_remote_quota(credentials.access_token)
        ensure_remote_quota_available(remote_quota)

        publisher = ThreadsGraphPublisher(credentials.access_token, credentials.user_id)
        media_id = publisher.publish_post(body)
        increment_profile_count(db_path, credentials.profile, units=1)
        reply_id = publisher.publish_reply(media_id, comment)
        increment_profile_count(db_path, credentials.profile, units=1)

        record = build_history_record(
            audience=audience,
            body=body,
            comment=comment,
            target_url=target_url,
            short_url=short_url,
            contests=selected,
            media_id=media_id,
            reply_id=reply_id,
            publish_units=required_units,
            dry_run=False,
        )
        history_records.append(record)
        write_history(history_path, history_records)

        success_message = (
            f"본문 media_id: {media_id}\n"
            f"댓글 reply_id: {reply_id}\n"
            f"대상: {audience}\n"
            f"공모전: {len(selected)}개\n"
            f"링크: {short_url}\n"
            f"local_daily_limit: {effective_daily_limit(credentials.profile, args.daily_limit)}\n"
            f"publish_units: {required_units}\n"
            f"credential_source: {credentials.source}"
        )
        print("\n[published] Threads 발행 완료")
        print(success_message)
        notify_discord(args.discord_webhook_url, "공모전집 Threads 발행 성공", success_message, True)
        return 0

    except Exception as exc:
        error_message = f"{type(exc).__name__}: {exc}"
        notify_discord(args.discord_webhook_url, "공모전집 Threads 발행 실패", error_message, False)
        print(f"[error] {error_message}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
