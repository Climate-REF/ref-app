from ref_backend import builder
from ref_backend.api import deps
from ref_backend.testing import test_ref_config, test_settings


def test_sentry_release_is_the_git_commit(monkeypatch):
    calls = []
    monkeypatch.setattr(builder.sentry_sdk, "init", lambda **kwargs: calls.append(kwargs))
    settings = test_settings().model_copy(
        update={
            "SENTRY_DSN": "https://key@sentry.example.com/1",
            "ENVIRONMENT": "staging",
            "GIT_COMMIT": "e145da768b1725ce708150597a565df09c923dc3",
        }
    )
    config = test_ref_config()

    builder.build_app(settings, config, deps._get_database_dependency(settings, config))

    assert calls[0]["release"] == "e145da768b1725ce708150597a565df09c923dc3"
