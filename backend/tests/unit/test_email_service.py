from datetime import datetime, timezone

from app.core.config import settings
from app.models import Post, User
from app.models.enums import Platform, PostStatus
from app.services import email_service
from app.services.email_service import build_reminder_email, send_reminder


def make_post(title: str = "Launch day") -> Post:
    post = Post(
        title=title,
        content="Body",
        platform=Platform.LINKEDIN,
        status=PostStatus.SCHEDULED,
        scheduled_at=datetime(2026, 7, 10, 9, 0, tzinfo=timezone.utc),
    )
    post.user = User(email="alice@example.com", full_name="Alice Example", hashed_password="x")
    return post


class TestBuildReminderEmail:
    def test_addressing_and_subject(self):
        message = build_reminder_email(make_post())
        assert message["To"] == "alice@example.com"
        assert message["From"]
        assert "Launch day" in message["Subject"]

    def test_has_plain_text_and_html_alternatives(self):
        message = build_reminder_email(make_post())
        parts = {part.get_content_type() for part in message.walk()}
        assert "text/plain" in parts
        assert "text/html" in parts

        text = message.get_body(("plain",)).get_content()
        assert "Launch day" in text
        assert "Friday 10 July 2026 at 09:00 UTC" in text
        assert "LinkedIn" in text

    def test_html_escapes_user_content(self):
        message = build_reminder_email(make_post(title='<script>alert("x")</script>'))
        html_part = message.get_body(("html",)).get_content()
        assert "<script>" not in html_part
        assert "&lt;script&gt;" in html_part


class FakeSMTP:
    def __init__(self, host, port, timeout=None):
        self.host = host
        self.port = port
        self.calls: list = []

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def starttls(self):
        self.calls.append("starttls")

    def login(self, username, password):
        self.calls.append(("login", username))

    def send_message(self, message):
        self.calls.append(("send", message["To"]))


class TestSendReminder:
    def test_plain_smtp_send(self, monkeypatch):
        instances: list[FakeSMTP] = []
        monkeypatch.setattr(
            email_service.smtplib, "SMTP", lambda *a, **kw: instances.append(FakeSMTP(*a, **kw)) or instances[-1]
        )

        send_reminder(make_post())

        smtp = instances[0]
        assert smtp.host == settings.SMTP_HOST
        # No TLS or login unless configured — straight to send.
        assert smtp.calls == [("send", "alice@example.com")]

    def test_starttls_and_login_used_when_configured(self, monkeypatch):
        instances: list[FakeSMTP] = []
        monkeypatch.setattr(
            email_service.smtplib, "SMTP", lambda *a, **kw: instances.append(FakeSMTP(*a, **kw)) or instances[-1]
        )
        monkeypatch.setattr(settings, "SMTP_STARTTLS", True)
        monkeypatch.setattr(settings, "SMTP_USERNAME", "mailer")
        monkeypatch.setattr(settings, "SMTP_PASSWORD", "hunter2")

        send_reminder(make_post())

        assert instances[0].calls == [
            "starttls",
            ("login", "mailer"),
            ("send", "alice@example.com"),
        ]
