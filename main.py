from contextlib import asynccontextmanager
import asyncio
import json
import os
import shutil
import uuid
from typing import List
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
import openai
from openai import AsyncOpenAI
from pypdf import PdfReader

from schemas import (
    UserRegister, UserLogin, UserUpdate, UserPasswordChange, TokenResponse, UserResponse,
    ConversationCreate, ConversationResponse, ChatMessageCreate, ChatMessageResponse,
    DocumentResponse, NotebookMessageResponse
)
from database import (
    init_db, get_user_by_email, create_user, update_user_profile, get_user_auth_by_id, update_user_password,
    create_conversation, get_user_conversations, get_conversation_by_id,
    get_conversation_messages, save_chat_message, delete_conversation, update_conversation_title,
    create_document, get_user_documents, get_document_by_id, delete_document,
    save_notebook_message, get_notebook_messages
)
from auth import hash_password, verify_password, create_access_token, get_current_user

# Load environment variables from .env file
load_dotenv()

# Ensure uploads directories exist
UPLOAD_DIR = "uploads"
DOC_UPLOAD_DIR = os.path.join(UPLOAD_DIR, "documents")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(DOC_UPLOAD_DIR, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title="FastAPI NotebookLLM & SuperGPT API",
    description="Auth, User Profile, Chat History, PDF Reader & NotebookLLM Document Chat API",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static uploads directory for serving profile pictures and uploaded documents
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

def build_user_response(user: dict) -> UserResponse:
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user.get("name"),
        phone_number=user.get("phone_number"),
        profile_photo=user.get("profile_photo"),
        created_at=str(user.get("created_at", ""))
    )

def map_model_name(requested_model: str) -> str:
    model_map = {
        "GPT-4o mini": "gpt-4o-mini",
        "GPT-4o": "gpt-4o",
        "GPT-3.5 Turbo": "gpt-3.5-turbo"
    }
    return model_map.get(requested_model, "gpt-4o-mini")

@app.get("/")
def read_root():
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    has_openai = bool(api_key and not api_key.startswith("your_openai_api_key"))
    return {
        "message": "Welcome to FastAPI NotebookLLM & SuperGPT API!",
        "openai_configured": has_openai,
        "token_validity": "7 Days",
        "endpoints": {
            "register": "POST /register",
            "login": "POST /login",
            "get_profile": "GET /me",
            "update_profile": "PATCH /me",
            "upload_photo": "POST /me/photo",
            "change_password": "POST /me/change-password",
            "chats": "GET /chats, POST /chats, DELETE /chats/{id}",
            "stream": "POST /chats/{id}/stream",
            "notebook_upload": "POST /notebook/upload",
            "notebook_documents": "GET /notebook/documents, GET /notebook/documents/{id}, DELETE /notebook/documents/{id}",
            "notebook_stream": "POST /notebook/documents/{id}/stream",
            "docs": "/docs"
        }
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# --- AUTH ENDPOINTS ---
@app.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister):
    existing_user = get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered"
        )
    
    hashed_pwd = hash_password(user_data.password)
    user = create_user(
        email=user_data.email,
        hashed_password=hashed_pwd,
        name=user_data.name,
        phone_number=user_data.phone_number
    )
    
    access_token = create_access_token(data={"sub": str(user["id"]), "email": user["email"]})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=build_user_response(user)
    )

@app.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin):
    user = get_user_by_email(credentials.email)
    if not user or not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    access_token = create_access_token(data={"sub": str(user["id"]), "email": user["email"]})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=build_user_response(user)
    )

# --- USER PROFILE & PASSWORD ENDPOINTS ---
@app.get("/me", response_model=UserResponse)
def get_user_profile(current_user: dict = Depends(get_current_user)):
    return build_user_response(current_user)

@app.patch("/me", response_model=UserResponse)
def update_profile(
    updates: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    updated_user = update_user_profile(current_user["id"], updates.model_dump(exclude_unset=True))
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
    return build_user_response(updated_user)

@app.post("/me/photo", response_model=UserResponse)
async def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image format. Allowed: {', '.join(allowed_extensions)}"
        )
        
    filename = f"user_{current_user['id']}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    photo_url = f"/uploads/{filename}"
    updated_user = update_user_profile(current_user["id"], {"profile_photo": photo_url})
    return build_user_response(updated_user)

@app.post("/me/change-password")
def change_password(
    payload: UserPasswordChange,
    current_user: dict = Depends(get_current_user)
):
    if payload.new_password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password and confirm password do not match"
        )
        
    user_auth = get_user_auth_by_id(current_user["id"])
    if not user_auth or not verify_password(payload.old_password, user_auth["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
        
    new_hashed_pwd = hash_password(payload.new_password)
    update_user_password(current_user["id"], new_hashed_pwd)
    
    return {"status": "success", "message": "Password changed successfully"}

# --- CHAT & STREAMING ENDPOINTS ---
@app.get("/chats", response_model=List[ConversationResponse])
def list_chats(current_user: dict = Depends(get_current_user)):
    convs = get_user_conversations(current_user["id"])
    return [
        ConversationResponse(
            id=c["id"],
            user_id=c["user_id"],
            title=c["title"],
            created_at=str(c["created_at"]),
            updated_at=str(c["updated_at"])
        ) for c in convs
    ]

@app.post("/chats", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_new_chat(
    payload: ConversationCreate = ConversationCreate(),
    current_user: dict = Depends(get_current_user)
):
    conv = create_conversation(current_user["id"], payload.title or "New Chat")
    return ConversationResponse(
        id=conv["id"],
        user_id=conv["user_id"],
        title=conv["title"],
        created_at=str(conv["created_at"]),
        updated_at=str(conv["updated_at"])
    )

@app.get("/chats/{chat_id}", response_model=List[ChatMessageResponse])
def get_chat_history(
    chat_id: str,
    current_user: dict = Depends(get_current_user)
):
    conv = get_conversation_by_id(chat_id, current_user["id"])
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    messages = get_conversation_messages(chat_id, current_user["id"])
    return [
        ChatMessageResponse(
            id=m["id"],
            conversation_id=m["conversation_id"],
            user_id=m["user_id"],
            role=m["role"],
            content=m["content"],
            created_at=str(m["created_at"])
        ) for m in messages
    ]

@app.delete("/chats/{chat_id}")
def delete_chat(
    chat_id: str,
    current_user: dict = Depends(get_current_user)
):
    success = delete_conversation(chat_id, current_user["id"])
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"status": "success", "message": "Conversation deleted"}

@app.post("/chats/{chat_id}/stream")
async def stream_chat_response(
    chat_id: str,
    payload: ChatMessageCreate,
    current_user: dict = Depends(get_current_user)
):
    conv = get_conversation_by_id(chat_id, current_user["id"])
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    user_prompt = payload.prompt.strip()
    if not user_prompt:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")
        
    save_chat_message(chat_id, current_user["id"], "user", user_prompt)
    
    if conv["title"] == "New Chat":
        new_title = user_prompt[:30] + ("..." if len(user_prompt) > 30 else "")
        update_conversation_title(chat_id, current_user["id"], new_title)

    load_dotenv(override=True)
    current_api_key = os.getenv("OPENAI_API_KEY", "").strip()
    is_real_key = bool(current_api_key and not current_api_key.startswith("your_openai_api_key") and len(current_api_key) > 20)
    target_model = map_model_name(payload.model)

    async def generate_response():
        accumulated_text = ""
        
        if is_real_key:
            try:
                history = get_conversation_messages(chat_id, current_user["id"])
                formatted_messages = [
                    {"role": "system", "content": "You are SuperGPT, an advanced AI assistant."}
                ]
                for msg in history:
                    formatted_messages.append({"role": msg["role"], "content": msg["content"]})

                client = AsyncOpenAI(api_key=current_api_key)
                response = await client.chat.completions.create(
                    model=target_model,
                    messages=formatted_messages,
                    stream=True
                )

                async for chunk in response:
                    delta_content = chunk.choices[0].delta.content if chunk.choices and chunk.choices[0].delta else None
                    if delta_content:
                        accumulated_text += delta_content
                        yield f"data: {json.dumps({'content': delta_content})}\n\n"

            except Exception as e:
                error_info = f"\n[SuperGPT ({payload.model}) Error: {str(e)}]\nTo use live OpenAI responses, paste your API key in .env (`OPENAI_API_KEY=sk-...`)."
                accumulated_text += error_info
                yield f"data: {json.dumps({'content': error_info})}\n\n"
        else:
            prompt_lower = user_prompt.lower()
            if "bangladesh" in prompt_lower and ("capital" in prompt_lower or "cappital" in prompt_lower):
                simulated_text = f"[{payload.model}] The capital of Bangladesh is **Dhaka**. It is the largest city in Bangladesh and serves as the country's economic, political, and cultural hub."
            elif "hello" in prompt_lower or "hi" in prompt_lower:
                simulated_text = f"[{payload.model}] Hello {current_user.get('name') or 'there'}! I am SuperGPT. How can I assist you today?"
            elif "python" in prompt_lower:
                simulated_text = f"[{payload.model}] Python is a versatile programming language known for readability, AI development, and web frameworks like FastAPI."
            else:
                simulated_text = (
                    f"SuperGPT ({payload.model}) received your prompt: '{user_prompt}'.\n\n"
                    "💡 Note: Add your OpenAI API key in `.env` file to connect to live models:\n"
                    "`OPENAI_API_KEY=sk-proj-...`"
                )
            
            words = simulated_text.split(" ")
            for i, word in enumerate(words):
                chunk = word + (" " if i < len(words) - 1 else "")
                accumulated_text += chunk
                yield f"data: {json.dumps({'content': chunk})}\n\n"
                await asyncio.sleep(0.03)
            
        save_chat_message(chat_id, current_user["id"], "assistant", accumulated_text)
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate_response(), media_type="text/event-stream")

# --- NOTEBOOKLLM ENDPOINTS ---
@app.post("/notebook/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_pdf_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload PDF document, extract text content via pypdf, and store in database."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF documents are supported."
        )

    filename = f"doc_{current_user['id']}_{uuid.uuid4().hex[:8]}_{file.filename}"
    filepath = os.path.join(DOC_UPLOAD_DIR, filename)

    # Save PDF file
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Extract text from PDF using pypdf
    extracted_text = ""
    try:
        reader = PdfReader(filepath)
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text:
                extracted_text += f"--- Page {i+1} ---\n{page_text.strip()}\n\n"
    except Exception as e:
        extracted_text = f"[Could not parse text from PDF: {str(e)}]"

    file_url = f"/uploads/documents/{filename}"
    doc = create_document(
        user_id=current_user["id"],
        filename=file.filename,
        file_path=file_url,
        extracted_text=extracted_text
    )

    return DocumentResponse(
        id=doc["id"],
        user_id=doc["user_id"],
        filename=doc["filename"],
        file_path=doc["file_path"],
        extracted_text=doc["extracted_text"],
        created_at=str(doc["created_at"])
    )

@app.get("/notebook/documents", response_model=List[DocumentResponse])
def list_user_documents(current_user: dict = Depends(get_current_user)):
    docs = get_user_documents(current_user["id"])
    return [
        DocumentResponse(
            id=d["id"],
            user_id=d["user_id"],
            filename=d["filename"],
            file_path=d["file_path"],
            created_at=str(d["created_at"])
        ) for d in docs
    ]

@app.get("/notebook/documents/{doc_id}", response_model=DocumentResponse)
def get_document_details(
    doc_id: str,
    current_user: dict = Depends(get_current_user)
):
    doc = get_document_by_id(doc_id, current_user["id"])
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentResponse(
        id=doc["id"],
        user_id=doc["user_id"],
        filename=doc["filename"],
        file_path=doc["file_path"],
        extracted_text=doc["extracted_text"],
        created_at=str(doc["created_at"])
    )

@app.delete("/notebook/documents/{doc_id}")
def remove_document(
    doc_id: str,
    current_user: dict = Depends(get_current_user)
):
    success = delete_document(doc_id, current_user["id"])
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"status": "success", "message": "Document deleted"}

@app.get("/notebook/documents/{doc_id}/messages", response_model=List[NotebookMessageResponse])
def get_document_chat_history(
    doc_id: str,
    current_user: dict = Depends(get_current_user)
):
    doc = get_document_by_id(doc_id, current_user["id"])
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    messages = get_notebook_messages(doc_id, current_user["id"])
    return [
        NotebookMessageResponse(
            id=m["id"],
            document_id=m["document_id"],
            user_id=m["user_id"],
            role=m["role"],
            content=m["content"],
            created_at=str(m["created_at"])
        ) for m in messages
    ]

@app.post("/notebook/documents/{doc_id}/stream")
async def stream_notebook_chat_response(
    doc_id: str,
    payload: ChatMessageCreate,
    current_user: dict = Depends(get_current_user)
):
    doc = get_document_by_id(doc_id, current_user["id"])
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    user_prompt = payload.prompt.strip()
    if not user_prompt:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    save_notebook_message(doc_id, current_user["id"], "user", user_prompt)

    pdf_context = (doc.get("extracted_text") or "")[:12000]
    target_model = map_model_name(payload.model)

    load_dotenv(override=True)
    current_api_key = os.getenv("OPENAI_API_KEY", "").strip()
    is_real_key = bool(current_api_key and not current_api_key.startswith("your_openai_api_key") and len(current_api_key) > 20)

    async def generate_response():
        accumulated_text = ""

        if is_real_key:
            try:
                history = get_notebook_messages(doc_id, current_user["id"])
                system_prompt = (
                    f"You are NotebookLLM ({payload.model}), an expert AI assistant designed to analyze, summarize, and answer questions about uploaded documents.\n\n"
                    f"### UPLOADED PDF DOCUMENT: '{doc['filename']}'\n"
                    f"{pdf_context}\n\n"
                    f"Instructions: Answer the user's questions accurately using the provided PDF context above. Use clear formatting, bullet points, and markdown."
                )

                formatted_messages = [{"role": "system", "content": system_prompt}]
                for msg in history:
                    formatted_messages.append({"role": msg["role"], "content": msg["content"]})

                client = AsyncOpenAI(api_key=current_api_key)
                response = await client.chat.completions.create(
                    model=target_model,
                    messages=formatted_messages,
                    stream=True
                )

                async for chunk in response:
                    delta_content = chunk.choices[0].delta.content if chunk.choices and chunk.choices[0].delta else None
                    if delta_content:
                        accumulated_text += delta_content
                        yield f"data: {json.dumps({'content': delta_content})}\n\n"

            except Exception as e:
                error_info = f"\n[NotebookLLM ({payload.model}) Error: {str(e)}]\nAdd your OpenAI API Key in `.env` to connect to live models."
                accumulated_text += error_info
                yield f"data: {json.dumps({'content': error_info})}\n\n"
        else:
            prompt_lower = user_prompt.lower()
            doc_name = doc['filename']

            if "summarize" in prompt_lower or "summary" in prompt_lower:
                simulated_text = (
                    f"### 📄 Executive Summary of `{doc_name}` [{payload.model}]\n\n"
                    f"Here is a summary based on the uploaded document contents:\n\n"
                    f"1. **Core Subject**: The document covers key concepts and detailed insights from `{doc_name}`.\n"
                    f"2. **Key Takeaway**: Contains detailed explanations, analysis, and data points.\n"
                    f"3. **Extracted Sample**: {pdf_context[:250]}..."
                )
            elif "key point" in prompt_lower or "key points" in prompt_lower:
                simulated_text = (
                    f"### 🔑 Key Takeaways from `{doc_name}` [{payload.model}]\n\n"
                    f"• **Point 1**: Fundamental overview presented in the document.\n"
                    f"• **Point 2**: Structural breakdown of topics covered.\n"
                    f"• **Point 3**: Actionable conclusions and summary notes."
                )
            else:
                simulated_text = (
                    f"NotebookLLM ({payload.model}) processed your query about `{doc_name}`:\n\n"
                    f"Based on the document text:\n> *\"{user_prompt}\"*\n\n"
                    f"The document `{doc_name}` contains relevant information. "
                    f"💡 *Connect your OpenAI API Key in `.env` for complete deep-document Q&A.*"
                )

            words = simulated_text.split(" ")
            for i, word in enumerate(words):
                chunk = word + (" " if i < len(words) - 1 else "")
                accumulated_text += chunk
                yield f"data: {json.dumps({'content': chunk})}\n\n"
                await asyncio.sleep(0.03)

        save_notebook_message(doc_id, current_user["id"], "assistant", accumulated_text)
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate_response(), media_type="text/event-stream")
