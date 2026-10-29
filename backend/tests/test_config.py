from app.core.config import Settings


def test_database_url_is_optional_without_environment_configuration(
    monkeypatch,
) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)

    settings = Settings(_env_file=None)

    assert settings.database_url is None


def test_database_url_is_loaded_from_environment(monkeypatch) -> None:
    database_url = "postgresql+psycopg://user:placeholder@localhost/flowboard"
    monkeypatch.setenv("DATABASE_URL", database_url)

    settings = Settings(_env_file=None)

    assert settings.database_url == database_url
