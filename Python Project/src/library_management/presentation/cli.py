from src.library_management.application.services import LibraryError, LibraryService


MENU = """
1. Add book     2. Register member    3. Search books
4. Borrow book  5. Return book        6. Reserve book
7. Overdue loans 0. Exit
"""


def _integer(label: str) -> int:
    return int(input(label))


def run(service: LibraryService) -> None:
    while True:
        print(MENU)
        try:
            choice = input("Choose an option: ").strip()
            if choice == "0": return
            if choice == "1":
                book = service.add_book(input("ISBN: "), input("Title: "), input("Author: "), _integer("Copies: "))
                print(f"Added book #{book.id}.")
            elif choice == "2":
                member = service.register_member(input("Name: "), input("Email: "))
                print(f"Registered member #{member.id}.")
            elif choice == "3":
                for b in service.search_books(input("Search: ")):
                    print(f"#{b.id} {b.title} — {b.author} ({b.available_copies}/{b.total_copies} available)")
            elif choice == "4":
                loan = service.borrow_book(_integer("Book ID: "), _integer("Member ID: "))
                print(f"Loan #{loan.id}; due {loan.due_on}.")
            elif choice == "5":
                notified = service.return_book(_integer("Book ID: "))
                print("Returned." + (f" Notify {notified.name} ({notified.email})." if notified else ""))
            elif choice == "6":
                reservation = service.reserve_book(_integer("Book ID: "), _integer("Member ID: "))
                print(f"Reservation #{reservation.id} created.")
            elif choice == "7":
                for loan in service.overdue_loans(): print(f"Loan #{loan.id}: book #{loan.book_id}, member #{loan.member_id}, due {loan.due_on}")
            else: print("Invalid option.")
        except (ValueError, LibraryError) as error:
            print(f"Error: {error}")
