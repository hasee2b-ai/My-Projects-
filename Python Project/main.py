import os

from src.library_management.application.services import LibraryService
from src.library_management.infrastructure.postgres_repositories import (
    PostgresBookRepository,
    PostgresLoanRepository,
    PostgresMemberRepository,
    PostgresReservationRepository,
    create_schema,
)
from src.library_management.presentation.cli import run


def main() -> None:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL must be set. See README.md for an example.")
    create_schema(database_url)
    service = LibraryService(
        PostgresBookRepository(database_url),
        PostgresMemberRepository(database_url),
        PostgresLoanRepository(database_url),
        PostgresReservationRepository(database_url),
    )
    run(service)


if __name__ == "__main__":
    main()
