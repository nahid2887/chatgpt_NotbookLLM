from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")
    name: Optional[str] = None
    phone_number: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Full name of the user")
    phone_number: Optional[str] = Field(None, description="Phone number")
    profile_photo: Optional[str] = Field(None, description="URL or filepath of profile photo")

class UserPasswordChange(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6, description="New password must be at least 6 characters")
    confirm_password: str = Field(..., min_length=6, description="Confirm password must match new password")

class UserResponse(BaseModel):
    id: int
    email: str
    name: Optional[str] = None
    phone_number: Optional[str] = None
    profile_photo: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# --- CHAT & CONVERSATION SCHEMAS ---
class ConversationCreate(BaseModel):
    title: Optional[str] = "New Chat"

class ConversationResponse(BaseModel):
    id: str
    user_id: int
    title: str
    created_at: str
    updated_at: str

class ChatMessageCreate(BaseModel):
    prompt: str
    model: Optional[str] = "GPT-4o mini"

class ChatMessageResponse(BaseModel):
    id: int
    conversation_id: str
    user_id: int
    role: str
    content: str
    created_at: str

# --- NOTEBOOKLLM DOCUMENT SCHEMAS ---
class DocumentResponse(BaseModel):
    id: str
    user_id: int
    filename: str
    file_path: str
    extracted_text: Optional[str] = None
    created_at: str

class NotebookMessageResponse(BaseModel):
    id: int
    document_id: str
    user_id: int
    role: str
    content: str
    created_at: str
