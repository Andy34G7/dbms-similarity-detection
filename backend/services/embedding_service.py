import numpy as np
from sentence_transformers import SentenceTransformer
from typing import List
from config import settings
from db import get_db_cursor

class EmbeddingService:
    _instance = None
    _model = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        if self._model is None:
            print(f"[+] Loading SentenceTransformer model '{settings.EMBEDDING_MODEL}'...")
            self._model = SentenceTransformer(settings.EMBEDDING_MODEL)
            print("[+] SentenceTransformer model loaded successfully (dimension 384).")

    def encode(self, text: str) -> np.ndarray:
        return self._model.encode(text, convert_to_numpy=True)

    def encode_batch(self, texts: List[str]) -> np.ndarray:
        return self._model.encode(texts, convert_to_numpy=True)

    def sync_missing_embeddings(self) -> int:
        """Finds answers without embeddings and creates them."""
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                SELECT a.answer_id, a.answer_text 
                FROM ANSWER a
                LEFT JOIN ANSWER_EMBEDDING ae ON a.answer_id = ae.answer_id
                WHERE ae.embedding_id IS NULL;
            """)
            missing = cursor.fetchall()
            if not missing:
                return 0

            texts = [row["answer_text"] for row in missing]
            embeddings = self.encode_batch(texts)

            count = 0
            for row, emb in zip(missing, embeddings):
                aid = row["answer_id"]
                emb_id = f"EMB_{aid}"
                cursor.execute("""
                    INSERT INTO ANSWER_EMBEDDING (embedding_id, answer_id, embedding, model_name)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (answer_id) 
                    DO UPDATE SET embedding = EXCLUDED.embedding;
                """, (emb_id, aid, emb, settings.EMBEDDING_MODEL))
                count += 1
            return count

embedding_service = EmbeddingService.get_instance()
