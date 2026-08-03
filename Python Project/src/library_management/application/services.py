from dataclasses import replace
from datetime import date, timedelta
from typing import Optional

from src.library_management.domain.entities import Book, Loan, Member, Reservation
from src.library_management.domain.repositories import BookRepository, LoanRepository, MemberRepository, ReservationRepository


class LibraryError(Exception):
    """A business-rule violation that can be displayed to a user."""


class LibraryService:
    """Application use cases; depends on abstractions, not PostgreSQL."""

    def __init__(self, books: BookRepository, members: MemberRepository,
                 loans: LoanRepository, reservations: ReservationRepository) -> None:
        self.books, self.members = books, members
        self.loans, self.reservations = loans, reservations

    def add_book(self, isbn: str, title: str, author: str, copies: int) -> Book:
        if not isbn.strip() or not title.strip() or not author.strip() or copies < 1:
            raise LibraryError("ISBN, title, author, and at least one copy are required.")
        return self.books.add(Book(None, isbn.strip(), title.strip(), author.strip(), copies, copies))

    def register_member(self, name: str, email: str) -> Member:
        if not name.strip() or "@" not in email:
            raise LibraryError("A name and valid email are required.")
        return self.members.add(Member(None, name.strip(), email.strip().lower()))

    def borrow_book(self, book_id: int, member_id: int, today: Optional[date] = None) -> Loan:
        book, member = self._book_and_member(book_id, member_id)
        if not book.can_be_borrowed():
            raise LibraryError("Book unavailable; place a reservation instead.")
        now = today or date.today()
        self.books.update(replace(book, available_copies=book.available_copies - 1))
        return self.loans.add(Loan(None, book_id, member.id, now, now + timedelta(days=14)))

    def return_book(self, book_id: int, today: Optional[date] = None) -> Optional[Member]:
        book = self.books.get(book_id)
        loan = self.loans.find_active_by_book(book_id)
        if not book or not loan:
            raise LibraryError("No active loan exists for this book.")
        self.loans.close(replace(loan, returned_on=today or date.today()))
        self.books.update(replace(book, available_copies=book.available_copies + 1))
        reservation = self.reservations.next_for_book(book_id)
        if reservation:
            self.reservations.remove(reservation.id)
            return self.members.get(reservation.member_id)
        return None

    def reserve_book(self, book_id: int, member_id: int, today: Optional[date] = None) -> Reservation:
        book, member = self._book_and_member(book_id, member_id)
        if book.can_be_borrowed():
            raise LibraryError("This book is available; borrow it directly.")
        return self.reservations.add(Reservation(None, book.id, member.id, today or date.today()))

    def search_books(self, query: str) -> list[Book]:
        return self.books.search(query.strip())

    def overdue_loans(self) -> list[Loan]:
        return self.loans.overdue()

    def _book_and_member(self, book_id: int, member_id: int) -> tuple[Book, Member]:
        book, member = self.books.get(book_id), self.members.get(member_id)
        if not book:
            raise LibraryError("Book not found.")
        if not member:
            raise LibraryError("Member not found.")
        return book, member
