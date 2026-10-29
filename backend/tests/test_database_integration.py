import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL


@pytest.mark.integration
def test_dedicated_test_database_connection(test_database_url: URL) -> None:
    engine = create_engine(test_database_url, pool_pre_ping=True)
    try:
        with engine.connect() as connection:
            assert connection.scalar(text("SELECT 1")) == 1
    finally:
        engine.dispose()
