"""
logger.py — 단순 print 기반 로거

별도 라이브러리 없이 시간 + 레벨 + 메시지를 출력합니다.
GitHub Actions 로그에서도 바로 읽을 수 있도록 단순하게 유지합니다.
"""

from datetime import datetime
import sys


def _now() -> str:
    """현재 시각을 [HH:MM:SS] 형태로 반환"""
    return datetime.now().strftime("%H:%M:%S")


def _emit(level: str, message: str) -> None:
    line = f"[{_now()}] [{level}] {message}"
    encoding = sys.stdout.encoding or "utf-8"
    safe_line = line.encode(encoding, errors="replace").decode(encoding, errors="replace")
    print(safe_line)


def info(message: str) -> None:
    """일반 정보 로그"""
    _emit("INFO", f" {message}")


def warning(message: str) -> None:
    """경고 로그 — 크롤링 일부 실패 등 치명적이지 않은 상황"""
    _emit("WARN", f" {message}")


def error(message: str) -> None:
    """에러 로그 — 예외 발생 등 처리 실패 상황"""
    _emit("ERROR", message)


def debug(message: str) -> None:
    """디버그 로그 — 상세 진단 정보"""
    _emit("DEBUG", message)
