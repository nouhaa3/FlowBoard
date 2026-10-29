import pytest

from database_safety import validate_test_database_url


def test_accepts_a_distinct_postgresql_test_database() -> None:
    test_url = validate_test_database_url(
        "postgresql+psycopg://test:placeholder@localhost:5432/flowboard_test",
        "postgresql+psycopg://app:placeholder@localhost:5432/flowboard_dev",
    )

    assert test_url.database == "flowboard_test"


@pytest.mark.parametrize(
    "test_url",
    [
        "sqlite+pysqlite:///:memory:",
        "postgresql+psycopg://test:placeholder@localhost:5432/flowboard_dev",
    ],
)
def test_rejects_non_dedicated_test_database(test_url: str) -> None:
    with pytest.raises(ValueError):
        validate_test_database_url(
            test_url,
            "postgresql+psycopg://app:placeholder@localhost:5432/flowboard_dev",
        )


def test_rejects_test_database_matching_application_database() -> None:
    with pytest.raises(ValueError, match="must differ"):
        validate_test_database_url(
            "postgresql+psycopg://test:placeholder@localhost:5432/flowboard_test",
            "postgresql+psycopg://app:placeholder@localhost:5432/flowboard_test",
        )
