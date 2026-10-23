import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: int = int(os.getenv("DB_PORT", "5433"))
    DB_NAME: str = os.getenv("DB_NAME", "exam_eval_db")
    DB_USER: str = os.getenv("DB_USER", "postgres")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "password")
    
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    SIMILARITY_FULL_THRESHOLD: float = float(os.getenv("SIMILARITY_FULL_THRESHOLD", "0.75"))
    SIMILARITY_PARTIAL_THRESHOLD: float = float(os.getenv("SIMILARITY_PARTIAL_THRESHOLD", "0.50"))
    PLAGIARISM_HIGH_THRESHOLD: float = float(os.getenv("PLAGIARISM_HIGH_THRESHOLD", "0.85"))
    PLAGIARISM_MODERATE_THRESHOLD: float = float(os.getenv("PLAGIARISM_MODERATE_THRESHOLD", "0.65"))

settings = Settings()
