import os
from fastapi import APIRouter, Header, HTTPException, Depends
from database import get_conn
import psycopg2.extras # type: ignore
from pydantic import BaseModel
from typing import Optional 

router = APIRouter(prefix="/news", tags=["News"])

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

class NewsCreate(BaseModel):
    title: str
    content: str
    image_url: Optional[str] = None
    author: Optional[str] = "Admin"
    canva_url: Optional[str] = None

def verify_admin(x_admin_password: Optional[str] = Header(None)):
    if not x_admin_password or x_admin_password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid admin password")

def query_db(sql, params=(), is_write=False):
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        cur.execute(sql, params)
        if is_write:
            conn.commit()
            return True
        rows = cur.fetchall()
        return [dict(r) for r in rows]
    except Exception as e:
        if is_write:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("")
def get_all_news():
    return query_db("SELECT * FROM news ORDER BY published_at DESC")

@router.get("/{news_id}")
def get_news_by_id(news_id: int):
    rows = query_db("SELECT * FROM news WHERE id = %s", (news_id,))
    if not isinstance(rows, list) or not rows:
        raise HTTPException(status_code=404, detail="News article not found")
    return rows[0]

@router.post("", dependencies=[Depends(verify_admin)])
def create_news(news: NewsCreate):
    sql = """
    INSERT INTO news (title, content, image_url, author, canva_url)
    VALUES (%s, %s, %s, %s, %s)
    """
    query_db(sql, (news.title, news.content, news.image_url, news.author, news.canva_url), is_write=True)
    return {"status": "ok", "message": "News article published successfully"}

@router.delete("/{news_id}", dependencies=[Depends(verify_admin)])
def delete_news(news_id: int):
    sql = "DELETE FROM news WHERE id = %s"
    query_db(sql, (news_id,), is_write=True)
    return {"status": "ok", "message": "News article deleted successfully"}

@router.put("/{news_id}", dependencies=[Depends(verify_admin)])
def update_news(news_id: int, news: NewsCreate):
    rows = query_db("SELECT * FROM news WHERE id = %s", (news_id,))
    if not isinstance(rows, list) or not rows:
        raise HTTPException(status_code=404, detail="News article not found")
    
    sql = """
    UPDATE news
    SET title = %s, content = %s, image_url = %s, author = %s, canva_url = %s
    WHERE id = %s
    """
    query_db(sql, (news.title, news.content, news.image_url, news.author, news.canva_url, news_id), is_write=True)
    return {"status": "ok", "message": "News article updated successfully"}
