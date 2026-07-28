import sqlite3
import uuid
from typing import Optional, Dict, Any, List

DB_PATH = "users.db"

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Create users, conversations, messages, documents, and notebook_messages tables if they don't exist."""
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # Users Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                name TEXT,
                phone_number TEXT,
                profile_photo TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Conversations Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)

        # Messages Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL,
                user_id INTEGER NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)

        # Documents Table (NotebookLLM)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                filename TEXT NOT NULL,
                file_path TEXT NOT NULL,
                extracted_text TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)

        # Notebook Messages Table (Q&A history for specific PDF documents)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS notebook_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id TEXT NOT NULL,
                user_id INTEGER NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
        conn.commit()

        # Migrations for existing database
        cursor.execute("PRAGMA table_info(users)")
        columns = [row[1] for row in cursor.fetchall()]
        if "name" not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN name TEXT")
        if "phone_number" not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN phone_number TEXT")
        if "profile_photo" not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN profile_photo TEXT")
        conn.commit()

# --- USER OPERATIONS ---
def create_user(
    email: str,
    hashed_password: str,
    name: Optional[str] = None,
    phone_number: Optional[str] = None
) -> Dict[str, Any]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO users (email, hashed_password, name, phone_number)
            VALUES (?, ?, ?, ?)
            """,
            (email.lower(), hashed_password, name, phone_number)
        )
        conn.commit()
        user_id = cursor.lastrowid
        cursor.execute(
            "SELECT id, email, name, phone_number, profile_photo, created_at FROM users WHERE id = ?",
            (user_id,)
        )
        return dict(cursor.fetchone())

def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE email = ?", (email.lower(),))
        row = cursor.fetchone()
        return dict(row) if row else None

def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, email, name, phone_number, profile_photo, created_at FROM users WHERE id = ?",
            (user_id,)
        )
        row = cursor.fetchone()
        return dict(row) if row else None

def get_user_auth_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

def update_user_profile(user_id: int, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    allowed_fields = {"name", "phone_number", "profile_photo"}
    filtered_updates = {k: v for k, v in updates.items() if k in allowed_fields and v is not None}
    
    if not filtered_updates:
        return get_user_by_id(user_id)
        
    set_clause = ", ".join([f"{k} = ?" for k in filtered_updates.keys()])
    values = list(filtered_updates.values())
    values.append(user_id)
    
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(f"UPDATE users SET {set_clause} WHERE id = ?", values)
        conn.commit()
        
    return get_user_by_id(user_id)

def update_user_password(user_id: int, new_hashed_password: str) -> bool:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE users SET hashed_password = ? WHERE id = ?",
            (new_hashed_password, user_id)
        )
        conn.commit()
        return cursor.rowcount > 0

# --- CHAT & CONVERSATION OPERATIONS ---
def create_conversation(user_id: int, title: str = "New Chat") -> Dict[str, Any]:
    conv_id = str(uuid.uuid4())
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO conversations (id, user_id, title) VALUES (?, ?, ?)",
            (conv_id, user_id, title)
        )
        conn.commit()
        cursor.execute("SELECT * FROM conversations WHERE id = ?", (conv_id,))
        return dict(cursor.fetchone())

def get_user_conversations(user_id: int) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC",
            (user_id,)
        )
        return [dict(row) for row in cursor.fetchall()]

def get_conversation_by_id(conv_id: str, user_id: int) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM conversations WHERE id = ? AND user_id = ?",
            (conv_id, user_id)
        )
        row = cursor.fetchone()
        return dict(row) if row else None

def update_conversation_title(conv_id: str, user_id: int, title: str):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
            (title, conv_id, user_id)
        )
        conn.commit()

def delete_conversation(conv_id: str, user_id: int) -> bool:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM messages WHERE conversation_id = ? AND user_id = ?", (conv_id, user_id))
        cursor.execute("DELETE FROM conversations WHERE id = ? AND user_id = ?", (conv_id, user_id))
        conn.commit()
        return cursor.rowcount > 0

def save_chat_message(conv_id: str, user_id: int, role: str, content: str) -> Dict[str, Any]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO messages (conversation_id, user_id, role, content) VALUES (?, ?, ?, ?)",
            (conv_id, user_id, role, content)
        )
        cursor.execute(
            "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (conv_id,)
        )
        conn.commit()
        msg_id = cursor.lastrowid
        cursor.execute("SELECT * FROM messages WHERE id = ?", (msg_id,))
        return dict(cursor.fetchone())

def get_conversation_messages(conv_id: str, user_id: int) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM messages WHERE conversation_id = ? AND user_id = ? ORDER BY created_at ASC",
            (conv_id, user_id)
        )
        return [dict(row) for row in cursor.fetchall()]

# --- NOTEBOOKLLM DOCUMENT & MESSAGE OPERATIONS ---
def create_document(user_id: int, filename: str, file_path: str, extracted_text: str) -> Dict[str, Any]:
    doc_id = str(uuid.uuid4())
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO documents (id, user_id, filename, file_path, extracted_text)
            VALUES (?, ?, ?, ?, ?)
            """,
            (doc_id, user_id, filename, file_path, extracted_text)
        )
        conn.commit()
        cursor.execute("SELECT * FROM documents WHERE id = ?", (doc_id,))
        return dict(cursor.fetchone())

def get_user_documents(user_id: int) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, user_id, filename, file_path, created_at FROM documents WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,)
        )
        return [dict(row) for row in cursor.fetchall()]

def get_document_by_id(doc_id: str, user_id: int) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM documents WHERE id = ? AND user_id = ?",
            (doc_id, user_id)
        )
        row = cursor.fetchone()
        return dict(row) if row else None

def delete_document(doc_id: str, user_id: int) -> bool:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM notebook_messages WHERE document_id = ? AND user_id = ?", (doc_id, user_id))
        cursor.execute("DELETE FROM documents WHERE id = ? AND user_id = ?", (doc_id, user_id))
        conn.commit()
        return cursor.rowcount > 0

def save_notebook_message(doc_id: str, user_id: int, role: str, content: str) -> Dict[str, Any]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO notebook_messages (document_id, user_id, role, content) VALUES (?, ?, ?, ?)",
            (doc_id, user_id, role, content)
        )
        conn.commit()
        msg_id = cursor.lastrowid
        cursor.execute("SELECT * FROM notebook_messages WHERE id = ?", (msg_id,))
        return dict(cursor.fetchone())

def get_notebook_messages(doc_id: str, user_id: int) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM notebook_messages WHERE document_id = ? AND user_id = ? ORDER BY created_at ASC",
            (doc_id, user_id)
        )
        return [dict(row) for row in cursor.fetchall()]
