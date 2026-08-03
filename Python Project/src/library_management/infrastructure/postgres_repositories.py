from contextlib import contextmanager
from datetime import date

import psycopg

from src.library_management.domain.entities import Book, Loan, Member, Reservation
from src.library_management.domain.repositories import BookRepository, LoanRepository, MemberRepository, ReservationRepository

SCHEMA = """
CREATE TABLE IF NOT EXISTS books (id SERIAL PRIMARY KEY, isbn VARCHAR(30) UNIQUE NOT NULL, title TEXT NOT NULL, author TEXT NOT NULL, total_copies INT NOT NULL CHECK(total_copies > 0), available_copies INT NOT NULL CHECK(available_copies BETWEEN 0 AND total_copies));
CREATE TABLE IF NOT EXISTS members (id SERIAL PRIMARY KEY, name TEXT NOT NULL, email VARCHAR(255) UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS loans (id SERIAL PRIMARY KEY, book_id INT NOT NULL REFERENCES books(id), member_id INT NOT NULL REFERENCES members(id), borrowed_on DATE NOT NULL, due_on DATE NOT NULL, returned_on DATE);
CREATE TABLE IF NOT EXISTS reservations (id SERIAL PRIMARY KEY, book_id INT NOT NULL REFERENCES books(id), member_id INT NOT NULL REFERENCES members(id), reserved_on DATE NOT NULL);
CREATE INDEX IF NOT EXISTS idx_loans_active_due_on ON loans (due_on) WHERE returned_on IS NULL;
CREATE INDEX IF NOT EXISTS idx_reservations_queue ON reservations (book_id, reserved_on, id);
"""


def create_schema(url: str) -> None:
    with psycopg.connect(url) as conn:
        conn.execute(SCHEMA)


class _PostgresBase:
    def __init__(self, url: str) -> None:
        self.url = url

    @contextmanager
    def _connection(self):
        with psycopg.connect(self.url) as conn:
            yield conn


class PostgresBookRepository(_PostgresBase, BookRepository):
    def add(self, book: Book) -> Book:
        with self._connection() as c:
            row = c.execute("INSERT INTO books (isbn,title,author,total_copies,available_copies) VALUES (%s,%s,%s,%s,%s) RETURNING id", (book.isbn, book.title, book.author, book.total_copies, book.available_copies)).fetchone()
        return Book(row[0], book.isbn, book.title, book.author, book.total_copies, book.available_copies)

    def get(self, book_id: int) -> Book | None:
        with self._connection() as c:
            row = c.execute("SELECT id,isbn,title,author,total_copies,available_copies FROM books WHERE id=%s", (book_id,)).fetchone()
        return Book(*row) if row else None

    def search(self, query: str) -> list[Book]:
        with self._connection() as c:
            rows = c.execute("SELECT id,isbn,title,author,total_copies,available_copies FROM books WHERE isbn ILIKE %s OR title ILIKE %s OR author ILIKE %s ORDER BY title", (f"%{query}%", f"%{query}%", f"%{query}%")).fetchall()
        return [Book(*row) for row in rows]

    def update(self, book: Book) -> None:
        with self._connection() as c:
            c.execute("UPDATE books SET available_copies=%s WHERE id=%s", (book.available_copies, book.id))


class PostgresMemberRepository(_PostgresBase, MemberRepository):
    def add(self, member: Member) -> Member:
        with self._connection() as c:
            row = c.execute("INSERT INTO members (name,email) VALUES (%s,%s) RETURNING id", (member.name, member.email)).fetchone()
        return Member(row[0], member.name, member.email)

    def get(self, member_id: int) -> Member | None:
        with self._connection() as c:
            row = c.execute("SELECT id,name,email FROM members WHERE id=%s", (member_id,)).fetchone()
        return Member(*row) if row else None


class PostgresLoanRepository(_PostgresBase, LoanRepository):
    def add(self, loan: Loan) -> Loan:
        with self._connection() as c:
            row = c.execute("INSERT INTO loans (book_id,member_id,borrowed_on,due_on) VALUES (%s,%s,%s,%s) RETURNING id", (loan.book_id, loan.member_id, loan.borrowed_on, loan.due_on)).fetchone()
        return Loan(row[0], loan.book_id, loan.member_id, loan.borrowed_on, loan.due_on)

    def find_active_by_book(self, book_id: int) -> Loan | None:
        with self._connection() as c:
            row = c.execute("SELECT id,book_id,member_id,borrowed_on,due_on,returned_on FROM loans WHERE book_id=%s AND returned_on IS NULL ORDER BY id DESC LIMIT 1", (book_id,)).fetchone()
        return Loan(*row) if row else None

    def close(self, loan: Loan) -> None:
        with self._connection() as c:
            c.execute("UPDATE loans SET returned_on=%s WHERE id=%s", (loan.returned_on, loan.id))

    def overdue(self) -> list[Loan]:
        with self._connection() as c:
            rows = c.execute("SELECT id,book_id,member_id,borrowed_on,due_on,returned_on FROM loans WHERE returned_on IS NULL AND due_on < CURRENT_DATE ORDER BY due_on").fetchall()
        return [Loan(*row) for row in rows]


class PostgresReservationRepository(_PostgresBase, ReservationRepository):
    def add(self, reservation: Reservation) -> Reservation:
        with self._connection() as c:
            row = c.execute("INSERT INTO reservations (book_id,member_id,reserved_on) VALUES (%s,%s,%s) RETURNING id", (reservation.book_id, reservation.member_id, reservation.reserved_on)).fetchone()
        return Reservation(row[0], reservation.book_id, reservation.member_id, reservation.reserved_on)

    def next_for_book(self, book_id: int) -> Reservation | None:
        with self._connection() as c:
            row = c.execute("SELECT id,book_id,member_id,reserved_on FROM reservations WHERE book_id=%s ORDER BY reserved_on,id LIMIT 1", (book_id,)).fetchone()
        return Reservation(*row) if row else None

    def remove(self, reservation_id: int) -> None:
        with self._connection() as c:
            c.execute("DELETE FROM reservations WHERE id=%s", (reservation_id,))
