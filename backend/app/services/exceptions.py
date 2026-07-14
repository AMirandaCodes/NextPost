"""Domain exceptions raised by services and translated to HTTP errors in routes."""


class EmailAlreadyRegistered(Exception):
    pass


class InvalidCredentials(Exception):
    pass


class IncorrectPassword(Exception):
    pass


class PostNotFound(Exception):
    pass


class ScheduledDateRequired(Exception):
    pass


class DemoProfileLocked(Exception):
    """The shared demo account's identity (email/password) can't be changed."""
