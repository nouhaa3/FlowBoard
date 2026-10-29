import os
from collections.abc import Generator

import pytest
from sqlalchemy.engine import URL

from app.core.config import get_settings
from database_safety import validate_test_database_url


@pytest.fixture
def test_database_url() -> Generator[URL, None, None]:
    value = os.environ.get("TEST_DATABASE_URL")
    if not value:
        pytest.skip(
            "Set TEST_DATABASE_URL to a dedicated PostgreSQL database "
            "ending in _test to run database integration tests."
        )

    try:
        test_url = validate_test_database_url(value, get_settings().database_url)
    except ValueError as error:
        pytest.fail(str(error))
    yield test_url
