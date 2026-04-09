from pathlib import Path

from climate_ref.config import Config
from ref_backend.core.config import Settings
from ref_backend.core.ref import get_ref_config


def test_get_ref_config_missing_toml(tmp_path: Path):
    """get_ref_config returns a default Config when ref.toml does not exist"""
    settings = Settings(REF_CONFIGURATION=str(tmp_path))

    config = get_ref_config(settings)

    assert isinstance(config, Config)


def test_get_ref_config_with_toml(tmp_path: Path):
    """get_ref_config loads configuration from ref.toml when it exists"""
    toml_file = tmp_path / "ref.toml"
    toml_file.write_text("")

    settings = Settings(REF_CONFIGURATION=str(tmp_path))

    config = get_ref_config(settings)

    assert isinstance(config, Config)
