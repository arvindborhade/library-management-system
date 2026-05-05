from __future__ import annotations

from enum import StrEnum


class BorrowingStatus(StrEnum):
    BORROWED = "BORROWED"
    RETURNED = "RETURNED"
    OVERDUE = "OVERDUE"


class HealthStatus(StrEnum):
    OK = "ok"
