from fastapi import FastAPI

app = FastAPI(
    title="NextPost API",
    description="Social media planning API — organise and schedule upcoming posts.",
    version="0.1.0",
)


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}
