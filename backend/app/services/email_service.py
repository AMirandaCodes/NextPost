"""Reminder email construction and SMTP delivery.

Uses the stdlib (smtplib + EmailMessage) — a full email library would add a
dependency for exactly one message type. Templates are deliberately plain.
"""

import html
import logging
import smtplib
from datetime import timezone
from email.message import EmailMessage

from app.core.config import settings
from app.models import Post

logger = logging.getLogger("app.email")

_PLATFORM_LABELS = {
    "facebook": "Facebook",
    "instagram": "Instagram",
    "x": "X (Twitter)",
    "linkedin": "LinkedIn",
    "tiktok": "TikTok",
    "other": "Other",
}


def build_reminder_email(post: Post) -> EmailMessage:
    user = post.user
    platform = _PLATFORM_LABELS.get(post.platform.value, post.platform.value)
    scheduled = post.scheduled_at.astimezone(timezone.utc).strftime("%A %d %B %Y at %H:%M UTC")

    text = (
        f"Hi {user.full_name},\n"
        f"\n"
        f"Your {platform} post is scheduled to go out within the next day:\n"
        f"\n"
        f'    "{post.title}"\n'
        f"    Scheduled for {scheduled}\n"
        f"\n"
        f"Log in to NextPost if you'd like to review or edit it before then.\n"
        f"\n"
        f"— NextPost\n"
    )

    # User-supplied values are escaped before being embedded in markup.
    safe_name = html.escape(user.full_name)
    safe_title = html.escape(post.title)
    html_body = f"""\
<html>
  <body style="margin:0; padding:24px; background-color:#f8fafc; font-family: Arial, Helvetica, sans-serif; color:#1e293b;">
    <div style="max-width:520px; margin:0 auto; background-color:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:24px;">
      <p style="margin:0 0 16px; font-size:16px; font-weight:bold; color:#4338ca;">NextPost</p>
      <p style="margin:0 0 12px;">Hi {safe_name},</p>
      <p style="margin:0 0 12px;">Your {platform} post is scheduled to go out within the next day:</p>
      <div style="margin:0 0 12px; padding:12px 16px; background-color:#f8fafc; border-left:3px solid #4338ca;">
        <p style="margin:0; font-weight:bold;">{safe_title}</p>
        <p style="margin:4px 0 0; font-size:14px; color:#64748b;">Scheduled for {scheduled}</p>
      </div>
      <p style="margin:0 0 16px;">Log in to NextPost if you'd like to review or edit it before then.</p>
      <p style="margin:0; font-size:12px; color:#94a3b8;">You're receiving this because the post above is scheduled in NextPost.</p>
    </div>
  </body>
</html>
"""

    message = EmailMessage()
    message["Subject"] = f"Reminder: “{post.title}” goes out soon"
    message["From"] = settings.EMAIL_FROM
    message["To"] = user.email
    message.set_content(text)
    message.add_alternative(html_body, subtype="html")
    return message


def send_reminder(post: Post) -> None:
    """Build and deliver a reminder. Raises on any SMTP failure — the caller
    decides what a failed send means (see reminder_service)."""
    message = build_reminder_email(post)
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
        if settings.SMTP_STARTTLS:
            smtp.starttls()
        if settings.SMTP_USERNAME:
            smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        smtp.send_message(message)
