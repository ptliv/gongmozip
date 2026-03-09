"""
logger.py — 단순 print 기반 로거

별도 라이브러리 없이 시간 + 레벨 + 메시지를 출력합니다.
GitHub Actions 로그에서도 바로 읽을 수 있도록 단순하게 유지합니다.
"""

from datetime import datetime


def _now() -> str:
    """현재 시각을 [HH:MM:SS] 형태로 반환"""
    return datetime.now().strftime("%H:%M:%S")


def info(message: str) -> None:
    """일반 정보 로그"""
    print(f"[{_now()}] [INFO]  {message}")


def warning(message: str) -> None:
    """경고 로그 — 크롤링 일부 실패 등 치명적이지 않은 상황"""
    print(f"[{_now()}] [WARN]  {message}")


def error(message: str) -> None:
    """에러 로그 — 예외 발생 등 처리 실패 상황"""
    print(f"[{_now()}] [ERROR] {message}")
