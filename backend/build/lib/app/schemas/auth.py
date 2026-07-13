from pydantic import BaseModel, EmailStr, Field

# bcrypt only uses the first 72 bytes of a password, so longer input is rejected
# rather than silently truncated.
PASSWORD_FIELD = Field(min_length=8, max_length=72)


class UserRegister(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=100)
    password: str = PASSWORD_FIELD


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
