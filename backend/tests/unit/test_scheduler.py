import app.scheduler as scheduler_module
from app.core.config import settings
from app.scheduler import REMINDER_JOB_ID, create_scheduler, run_reminder_job


class FakeSession:
    def __init__(self):
        self.closed = False

    def close(self):
        self.closed = True


class TestCreateScheduler:
    def test_registers_interval_job_matching_config(self):
        scheduler = create_scheduler()
        scheduler.start(paused=True)
        try:
            job = scheduler.get_job(REMINDER_JOB_ID)
            assert job is not None
            assert job.trigger.interval.total_seconds() == settings.REMINDER_INTERVAL_MINUTES * 60
        finally:
            scheduler.shutdown(wait=False)


class TestRunReminderJob:
    def test_calls_service_with_a_session_and_closes_it(self, monkeypatch):
        session = FakeSession()
        seen = []
        monkeypatch.setattr(scheduler_module, "SessionLocal", lambda: session)
        monkeypatch.setattr(
            scheduler_module.reminder_service, "send_due_reminders", lambda s: seen.append(s)
        )

        run_reminder_job()

        assert seen == [session]
        assert session.closed

    def test_service_crash_does_not_propagate_and_still_closes_session(self, monkeypatch):
        session = FakeSession()
        monkeypatch.setattr(scheduler_module, "SessionLocal", lambda: session)

        def boom(_session):
            raise RuntimeError("database unavailable")

        monkeypatch.setattr(scheduler_module.reminder_service, "send_due_reminders", boom)

        run_reminder_job()  # must not raise — a bad run must never kill the scheduler thread

        assert session.closed
