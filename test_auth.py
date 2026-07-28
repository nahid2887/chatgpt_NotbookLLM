import io
import unittest
from fastapi.testclient import TestClient
from main import app
from database import init_db, get_connection

client = TestClient(app)

class TestNotebookLLMAndAuthAPI(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        init_db()
        with get_connection() as conn:
            conn.execute("DELETE FROM notebook_messages")
            conn.execute("DELETE FROM documents")
            conn.execute("DELETE FROM messages")
            conn.execute("DELETE FROM conversations")
            conn.execute("DELETE FROM users")
            conn.commit()

    def test_01_register_user(self):
        res = client.post("/register", json={
            "email": "pdfuser@example.com",
            "password": "pdfpassword123",
            "name": "PDF Tester"
        })
        self.assertEqual(res.status_code, 201)
        self.assertIn("access_token", res.json())

    def test_02_upload_pdf_document(self):
        login_res = client.post("/login", json={
            "email": "pdfuser@example.com",
            "password": "pdfpassword123"
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Fake PDF bytes for testing upload
        pdf_bytes = b"%PDF-1.4 sample pdf content for notebook testing %EOF"
        files = {"file": ("test_doc.pdf", pdf_bytes, "application/pdf")}

        res = client.post("/notebook/upload", files=files, headers=headers)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["filename"], "test_doc.pdf")
        self.assertIn("id", data)

        # Store doc_id for next tests
        self.__class__.doc_id = data["id"]

    def test_03_list_and_get_document(self):
        login_res = client.post("/login", json={
            "email": "pdfuser@example.com",
            "password": "pdfpassword123"
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # List docs
        list_res = client.get("/notebook/documents", headers=headers)
        self.assertEqual(list_res.status_code, 200)
        self.assertEqual(len(list_res.json()), 1)

        # Get doc detail
        get_res = client.get(f"/notebook/documents/{self.__class__.doc_id}", headers=headers)
        self.assertEqual(get_res.status_code, 200)
        self.assertEqual(get_res.json()["filename"], "test_doc.pdf")

    def test_04_stream_notebook_chat(self):
        login_res = client.post("/login", json={
            "email": "pdfuser@example.com",
            "password": "pdfpassword123"
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        stream_res = client.post(
            f"/notebook/documents/{self.__class__.doc_id}/stream",
            json={"prompt": "Summarize this PDF document"},
            headers=headers
        )
        self.assertEqual(stream_res.status_code, 200)
        self.assertIn("text/event-stream", stream_res.headers["content-type"])

        # Check document messages history
        msg_res = client.get(f"/notebook/documents/{self.__class__.doc_id}/messages", headers=headers)
        self.assertEqual(msg_res.status_code, 200)
        self.assertGreaterEqual(len(msg_res.json()), 2)

    def test_05_delete_document(self):
        login_res = client.post("/login", json={
            "email": "pdfuser@example.com",
            "password": "pdfpassword123"
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        del_res = client.delete(f"/notebook/documents/{self.__class__.doc_id}", headers=headers)
        self.assertEqual(del_res.status_code, 200)

        # Confirm deleted
        get_res = client.get(f"/notebook/documents/{self.__class__.doc_id}", headers=headers)
        self.assertEqual(get_res.status_code, 404)

if __name__ == "__main__":
    unittest.main()
