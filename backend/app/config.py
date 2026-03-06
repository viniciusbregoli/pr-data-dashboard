import json
from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    github_api_base: str = "https://api.github.com"
    config_path: str = str(Path(__file__).resolve().parent.parent.parent / "config.json")

    def get_repos(self) -> list[str]:
        path = Path(self.config_path)
        if path.exists():
            data = json.loads(path.read_text())
            return data.get("repos", [])
        return []


settings = Settings()
