import unittest
from dataclasses import replace
from datetime import date

from src.library_management.application.services import LibraryError, LibraryService
from src.library_management.domain.entities import Book, Loan, Member, Reservation


class MemoryBooks:
    def __init__(self): self.items, self.next_id = {}, 1
    def add(self, value):
        value = replace(value, id=self.next_id); self.items[self.next_id] = value; self.next_id += 1; return value
    def get(self, key): return self.items.get(key)
    def search(self, query): return [b for b in self.items.values() if query.lower() in b.title.lower() or query.lower() in b.author.lower()]
    def update(self, value): self.items[value.id] = value
class MemoryMembers(MemoryBooks):
    def search(self, query): return []
    def update(self, value): self.items[value.id] = value
class MemoryLoans:
    def __init__(self): self.items, self.next_id = {}, 1
    def add(self, value): value = replace(value, id=self.next_id); self.items[self.next_id] = value; self.next_id += 1; return value
    def find_active_by_book(self, key): return next((x for x in self.items.values() if x.book_id == key and x.returned_on is None), None)
    def close(self, value): self.items[value.id] = value
    def overdue(self): return [x for x in self.items.values() if x.is_overdue(date.today())]
class MemoryReservations(MemoryLoans):
    def next_for_book(self, key): return next((x for x in self.items.values() if x.book_id == key), None)
    def remove(self, key): del self.items[key]


class LibraryServiceTests(unittest.TestCase):
    def setUp(self):
        self.service = LibraryService(MemoryBooks(), MemoryMembers(), MemoryLoans(), MemoryReservations())
        self.book = self.service.add_book("978-1", "Clean Code", "Robert Martin", 1)
        self.member = self.service.register_member("Ada", "ada@example.com")

    def test_borrow_then_return_restores_stock(self):
        loan = self.service.borrow_book(self.book.id, self.member.id, date(2026, 1, 1))
        self.assertEqual(loan.due_on, date(2026, 1, 15))
        self.assertEqual(self.service.books.get(self.book.id).available_copies, 0)
        self.service.return_book(self.book.id, date(2026, 1, 2))
        self.assertEqual(self.service.books.get(self.book.id).available_copies, 1)

    def test_unavailable_book_can_be_reserved(self):
        self.service.borrow_book(self.book.id, self.member.id)
        reservation = self.service.reserve_book(self.book.id, self.member.id)
        self.assertEqual(reservation.book_id, self.book.id)

    def test_cannot_reserve_available_book(self):
        with self.assertRaises(LibraryError): self.service.reserve_book(self.book.id, self.member.id)

    def test_multiple_copies_can_be_loaned_at_the_same_time(self):
        book = self.service.add_book("978-2", "Domain-Driven Design", "Eric Evans", 2)
        another_member = self.service.register_member("Grace", "grace@example.com")

        self.service.borrow_book(book.id, self.member.id)
        self.service.borrow_book(book.id, another_member.id)

        self.assertEqual(self.service.books.get(book.id).available_copies, 0)
        with self.assertRaises(LibraryError):
            self.service.borrow_book(book.id, self.member.id)


if __name__ == "__main__": unittest.main()
