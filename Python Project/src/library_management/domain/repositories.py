from abc import ABC, abstractmethod
from typing import Optional

from .entities import Book, Loan, Member, Reservation


class BookRepository(ABC):
    @abstractmethod
    def add(self, book: Book) -> Book: ...

    @abstractmethod
    def get(self, book_id: int) -> Optional[Book]: ...

    @abstractmethod
    def search(self, query: str) -> list[Book]: ...

    @abstractmethod
    def update(self, book: Book) -> None: ...


class MemberRepository(ABC):
    @abstractmethod
    def add(self, member: Member) -> Member: ...

    @abstractmethod
    def get(self, member_id: int) -> Optional[Member]: ...


class LoanRepository(ABC):
    @abstractmethod
    def add(self, loan: Loan) -> Loan: ...

    @abstractmethod
    def find_active_by_book(self, book_id: int) -> Optional[Loan]: ...

    @abstractmethod
    def close(self, loan: Loan) -> None: ...

    @abstractmethod
    def overdue(self) -> list[Loan]: ...


class ReservationRepository(ABC):
    @abstractmethod
    def add(self, reservation: Reservation) -> Reservation: ...

    @abstractmethod
    def next_for_book(self, book_id: int) -> Optional[Reservation]: ...

    @abstractmethod
    def remove(self, reservation_id: int) -> None: ...
