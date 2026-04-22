"""
Persistent data storage using GitHub Gists.
Stores app state, user accounts, and activity logs as JSON files in a private Gist.
"""
import requests
import json
import streamlit as st
from datetime import datetime

GITHUB_API = "https://api.github.com"


class DataStore:
    """Read/write JSON data to a GitHub Gist for persistence."""

    def __init__(self):
        self.token = st.secrets.get("GITHUB_TOKEN", "")
        self.gist_id = st.secrets.get("GIST_ID", "")
        self._headers = {
            "Authorization": f"token {self.token}",
            "Accept": "application/vnd.github.v3+json",
        }
        # In-memory cache to avoid redundant API calls within a single session
        self._cache = {}

    # ── Low-level Gist helpers ────────────────────────────────────────────

    def _get_gist(self):
        """Fetch the entire gist (all files) in one API call."""
        if not self.gist_id or not self.token:
            return None
        try:
            resp = requests.get(
                f"{GITHUB_API}/gists/{self.gist_id}",
                headers=self._headers,
                timeout=15,
            )
            if resp.status_code == 200:
                return resp.json()
        except Exception:
            pass
        return None

    def _update_gist(self, files_dict):
        """Update one or more files in the gist."""
        if not self.gist_id or not self.token:
            return False
        try:
            resp = requests.patch(
                f"{GITHUB_API}/gists/{self.gist_id}",
                headers=self._headers,
                json={"files": files_dict},
                timeout=15,
            )
            return resp.status_code == 200
        except Exception:
            return False

    # ── File-level helpers ────────────────────────────────────────────────

    def _read_file(self, filename, default=None):
        """Read a single file from the gist, with in-memory cache."""
        if filename in self._cache:
            return self._cache[filename]
        gist = self._get_gist()
        if gist:
            # Cache ALL files from this single API call
            for fname, fdata in gist.get("files", {}).items():
                try:
                    self._cache[fname] = json.loads(fdata.get("content", "null"))
                except (json.JSONDecodeError, TypeError):
                    self._cache[fname] = default
            if filename in self._cache:
                return self._cache[filename]
        return default

    def _write_file(self, filename, data):
        """Write a single file to the gist and update cache."""
        self._cache[filename] = data
        return self._update_gist(
            {filename: {"content": json.dumps(data, ensure_ascii=False, indent=2)}}
        )

    def invalidate_cache(self):
        """Force re-read from GitHub on next access."""
        self._cache.clear()

    # ── App State ─────────────────────────────────────────────────────────

    def load_state(self):
        return self._read_file("state.json", default={})

    def save_state(self, state):
        state["_updated_at"] = datetime.now().isoformat()
        return self._write_file("state.json", state)

    # ── Users ─────────────────────────────────────────────────────────────

    def load_users(self):
        return self._read_file("users.json", default={})

    def save_users(self, users):
        return self._write_file("users.json", users)

    # ── Activity Log ──────────────────────────────────────────────────────

    def load_activity_log(self):
        return self._read_file("activity.json", default=[])

    def log_activity(self, username, action):
        """Append an entry to the activity log (keep last 500 entries)."""
        log = self.load_activity_log()
        if not isinstance(log, list):
            log = []
        log.insert(0, {
            "user": username,
            "action": action,
            "timestamp": datetime.now().isoformat(),
        })
        log = log[:500]
        return self._write_file("activity.json", log)

    # ── Bootstrap ─────────────────────────────────────────────────────────

    @staticmethod
    def create_gist(token, initial_users):
        """Create a new private Gist with initial data. Returns the gist ID."""
        headers = {
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github.v3+json",
        }
        resp = requests.post(
            f"{GITHUB_API}/gists",
            headers=headers,
            json={
                "description": "Comedores App — persistent data store",
                "public": False,
                "files": {
                    "state.json": {"content": json.dumps({}, ensure_ascii=False)},
                    "users.json": {
                        "content": json.dumps(initial_users, ensure_ascii=False, indent=2)
                    },
                    "activity.json": {"content": "[]"},
                },
            },
            timeout=15,
        )
        if resp.status_code == 201:
            return resp.json()["id"]
        return None
