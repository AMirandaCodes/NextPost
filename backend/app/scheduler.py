"""In-process background scheduler for reminder emails (ADR 0004).

Isolated from the HTTP layer: the job opens its own session and calls the
reminder service; FastAPI only starts/stops the scheduler in its lifespan.
"""

import logging
from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler

from app.core.config import settings
from app.db.session import SessionLocal
from app.services import reminder_service

logger = logging.getLogger("app.scheduler")

REMINDER_JOB_ID = "send-post-reminders"


def run_reminder_job() -> None:
    logger.info("reminder job started", extra={"event": "reminders.job_started"})
    session = SessionLocal()
    try:
        reminder_service.send_due_reminders(session)
    except Exception:
        # Never let one bad run kill the scheduler thread.
        logger.exception("reminder job crashed", extra={"event": "reminders.job_crashed"})
    finally:
        session.close()


def create_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        run_reminder_job,
        trigger="interval",
        minutes=settings.REMINDER_INTERVAL_MINUTES,
        id=REMINDER_JOB_ID,
        next_run_time=datetime.now(),  # also run once immediately at startup
    )
    return scheduler
