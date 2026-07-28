# FastAPI Project

This project contains a minimal, high-performance FastAPI application configured with Uvicorn.

## Getting Started

### 1. Activate Virtual Environment

**Windows (PowerShell):**
```powershell
.\.venv\Scripts\Activate.ps1
```

**Windows (CMD):**
```cmd
.\.venv\Scripts\activate.bat
```

**Linux / macOS:**
```bash
source .venv/bin/activate
```

### 2. Install Dependencies (if adding new ones)

```bash
pip install -r requirements.txt
```

### 3. Run Development Server

```bash
uvicorn main:app --reload
```

The application will start at: `http://127.0.0.1:8000`

### Interactive API Documentation

- **Swagger UI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
