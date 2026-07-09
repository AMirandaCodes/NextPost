from fastapi.testclient import TestClient

import app.main as main


class FakeScheduler:
    def __init__(self):
        self.started = False
        self.stopped = False

    def start(self):
        self.started = True

    def shutdown(self, wait=True):
        self.stopped = True


class TestLifespan:
    def test_scheduler_starts_with_app_and_stops_on_shutdown(self, monkeypatch):
        fake = FakeScheduler()
        monkeypatch.setattr(main, "create_scheduler", lambda: fake)
        monkeypatch.setattr(main.settings, "SCHEDULER_ENABLED", True)

        with TestClient(main.app):
            assert fake.started
            assert not fake.stopped
        assert fake.stopped

    def test_scheduler_not_started_when_disabled(self, monkeypatch):
        created = []
        monkeypatch.setattr(main, "create_scheduler", lambda: created.append(1))
        monkeypatch.setattr(main.settings, "SCHEDULER_ENABLED", False)

        with TestClient(main.app):
            pass
        assert created == []


class TestHealth:
    def test_health_endpoint(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
