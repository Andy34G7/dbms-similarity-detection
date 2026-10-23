import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from psycopg2.extensions import register_adapter, AsIs
import numpy as np
from contextlib import contextmanager
from config import settings

# Format numpy array as pgvector string representation: '[x.xx, y.yy, ...]'
def adapt_numpy_array(arr):
    return AsIs("'" + str(arr.tolist()) + "'")

register_adapter(np.ndarray, adapt_numpy_array)

# Global connection pool
connection_pool = None

def init_db_pool():
    global connection_pool
    if connection_pool is None:
        connection_pool = pool.ThreadedConnectionPool(
            minconn=2,
            maxconn=20,
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            dbname=settings.DB_NAME,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD
        )

def close_db_pool():
    global connection_pool
    if connection_pool is not None:
        connection_pool.closeall()
        connection_pool = None

@contextmanager
def get_db_cursor(commit=True):
    global connection_pool
    if connection_pool is None:
        init_db_pool()
    conn = connection_pool.getconn()
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        yield cursor
        if commit:
            conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        connection_pool.putconn(conn)
