import os
import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager


class Database:
    def __init__(self):
        self.host = os.getenv("POSTGRES_HOST", "localhost")
        self.port = os.getenv("POSTGRES_PORT", 5432)
        self.dbname = os.getenv("POSTGRES_DB")
        self.user = os.getenv("POSTGRES_USER")
        self.password = os.getenv("POSTGRES_PASSWORD")

    def get_db(self):
        return psycopg2.connect(
            host=self.host,
            port=self.port,
            dbname=self.dbname,
            user=self.user,
            password=self.password,
        )

    @contextmanager
    def _get_cursor(self, commit: bool = False):
        conn = self.get_db()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                yield cursor
            if commit:
                conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def execute(self, query: str, params: tuple | None = None):
        with self._get_cursor(commit=True) as cur:
            cur.execute(query, params)

    def fetch_one(self, query: str, params: tuple | None = None):
        with self._get_cursor() as cur:
            cur.execute(query, params)
            return cur.fetchone()

    def fetch_all(self, query: str, params: tuple | None = None):
        with self._get_cursor() as cur:
            cur.execute(query, params)
            return cur.fetchall()