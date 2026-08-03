# Library Management System

A Python CLI application demonstrating OOP, SOLID principles, and Clean Architecture with PostgreSQL.

## Features

- Add and search books (by ISBN, title, or author)
- Register library members
- Borrow and return books
- Reserve unavailable books (the next reservation is notified on return)
- View overdue loans

## Architecture

```
presentation (CLI) -> application (LibraryService) -> domain (entities + repository contracts)
                                      ^
                         infrastructure (PostgreSQL repository implementations)
```

`domain` contains immutable business entities and repository contracts. `application` contains the use cases and validation rules. `infrastructure` implements PostgreSQL persistence, and `presentation` is the CLI. The composition root in `main.py` injects concrete repositories into `LibraryService`, so the application layer depends on abstractions rather than the database driver.

This separation demonstrates single responsibility, dependency inversion, encapsulation through entities, and the repository/service patterns. A book record can represent several physical copies; each available copy may be loaned independently.

## Run

1. Create a PostgreSQL database, for example `library_db`.
2. Set `DATABASE_URL`, for example:

   ```powershell
   $env:DATABASE_URL = "postgresql://postgres:password@localhost:5432/library_db"
   ```

3. Install dependencies and start the app:

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   python main.py
   ```

The application creates its tables automatically. Run automated tests with `python -m unittest discover -s tests`.
