from dataclasses import dataclass
from datetime import date
from typing import Optional


@dataclass(frozen=True)
class Book:
    id: Optional[int]
    isbn: str
    title: str
    author: str
    total_copies: int
    available_copies: int

    def can_be_borrowed(self) -> bool:
        return self.available_copies > 0


@dataclass(frozen=True)
class Member:
    id: Optional[int]
    name: str
    email: str


@dataclass(frozen=True)
class Loan:
    id: Optional[int]
    book_id: int
    member_id: int
    borrowed_on: date
    due_on: date
    returned_on: Optional[date] = None

    def is_overdue(self, today: date) -> bool:
        return self.returned_on is None and self.due_on < today


@dataclass(frozen=True)
class Reservation:
    id: Optional[int]
    book_id: int
    member_id: int
    reserved_on: date
