from sqlalchemy.engine import URL, make_url
from sqlalchemy.exc import ArgumentError


def validate_test_database_url(
    test_database_url: str,
    application_database_url: str | None,
) -> URL:
    try:
        test_url = make_url(test_database_url)
    except (ArgumentError, TypeError, ValueError):
        raise ValueError("TEST_DATABASE_URL is not a valid SQLAlchemy URL.") from None

    if test_url.drivername != "postgresql+psycopg":
        raise ValueError(
            "TEST_DATABASE_URL must use the postgresql+psycopg driver."
        )
    if not test_url.database or not test_url.database.lower().endswith("_test"):
        raise ValueError("TEST_DATABASE_URL database name must end in _test.")

    if application_database_url:
        try:
            application_url = make_url(application_database_url)
        except (ArgumentError, TypeError, ValueError):
            raise ValueError("DATABASE_URL is not a valid SQLAlchemy URL.") from None
        if application_url.database == test_url.database:
            raise ValueError("TEST_DATABASE_URL must differ from DATABASE_URL.")

    return test_url
