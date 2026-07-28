import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  User,
  LogOut,
  Upload,
  CheckCircle,
  AlertCircle,
  Code,
  Compass,
  Lightbulb,
  MessageSquare,
  ChevronDown,
  X,
  Sun,
  Moon,
  Plus,
  Trash2,
  Menu,
  MessageCircle,
  Bot,
  Zap,
  Lock,
  KeyRound,
  FileText,
  BookOpen,
  Sparkles,
  Layers,
  FileUp
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000';

// Helper to render inline formatting (**bold**)
const renderInlineFormatting = (text) => {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((chunk, i) => {
    if (chunk.startsWith('**') && chunk.endsWith('**')) {
      return <strong key={i} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{chunk.slice(2, -2)}</strong>;
    }
    return chunk;
  });
};

// Markdown Renderer Component for Headers, Lists, Bold, and Code Blocks
const renderFormattedText = (text) => {
  if (!text) return null;

  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const codeLines = part.slice(3, -3).trim().split('\n');
      const lang = codeLines[0].match(/^[a-zA-Z0-9_-]+$/) ? codeLines[0] : '';
      const codeContent = lang ? codeLines.slice(1).join('\n') : codeLines.join('\n');

      return (
        <div key={index} style={{ background: '#18181b', borderRadius: 12, margin: '0.75rem 0', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          {lang && (
            <div style={{ background: 'var(--bg-elevated)', padding: '0.4rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', textTransform: 'uppercase' }}>
              {lang}
            </div>
          )}
          <pre style={{ padding: '1rem', overflowX: 'auto', fontFamily: 'monospace', fontSize: '0.9rem', color: '#e3e3e3', margin: 0, lineHeight: 1.5 }}>
            <code>{codeContent}</code>
          </pre>
        </div>
      );
    }

    const lines = part.split('\n');
    return (
      <div key={index}>
        {lines.map((line, lIdx) => {
          let content = line;

          if (content.startsWith('### ')) {
            return (
              <h3 key={lIdx} style={{ fontSize: '1.15rem', fontWeight: 700, margin: '1rem 0 0.4rem 0', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                {renderInlineFormatting(content.slice(4))}
              </h3>
            );
          }
          if (content.startsWith('## ')) {
            return (
              <h2 key={lIdx} style={{ fontSize: '1.35rem', fontWeight: 700, margin: '1.25rem 0 0.5rem 0', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                {renderInlineFormatting(content.slice(3))}
              </h2>
            );
          }
          if (content.startsWith('# ')) {
            return (
              <h1 key={lIdx} style={{ fontSize: '1.55rem', fontWeight: 700, margin: '1.5rem 0 0.6rem 0', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                {renderInlineFormatting(content.slice(2))}
              </h1>
            );
          }
          if (content.trim().startsWith('- ') || content.trim().startsWith('* ')) {
            return (
              <div key={lIdx} style={{ display: 'flex', gap: '0.5rem', margin: '0.35rem 0 0.35rem 0.5rem', lineHeight: 1.6 }}>
                <span style={{ color: '#10a37f', fontWeight: 700 }}>•</span>
                <span>{renderInlineFormatting(content.trim().slice(2))}</span>
              </div>
            );
          }

          if (!content.trim()) {
            return <div key={lIdx} style={{ height: '0.5rem' }} />;
          }

          return (
            <p key={lIdx} style={{ margin: '0.35rem 0', lineHeight: 1.6 }}>
              {renderInlineFormatting(content)}
            </p>
          );
        })}
      </div>
    );
  });
};

export default function App() {
  // App Mode State ('chat' | 'notebook')
  const [appMode, setAppMode] = useState('chat');

  // Theme State ('dark' | 'light')
  const [theme, setTheme] = useState(localStorage.getItem('app_theme') || 'dark');

  // Authentication & User State
  const [token, setToken] = useState(localStorage.getItem('access_token') || '');
  const [user, setUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState('login');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileTab, setProfileTab] = useState('info');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // SuperGPT Chat State
  const [conversations, setConversations] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [promptInput, setPromptInput] = useState('');

  // NotebookLLM State
  const [documents, setDocuments] = useState([]);
  const [activeDocId, setActiveDocId] = useState(null);
  const [activeDoc, setActiveDoc] = useState(null);
  const [docMessages, setDocMessages] = useState([]);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [notebookPromptInput, setNotebookPromptInput] = useState('');
  const [isNotebookStreaming, setIsNotebookStreaming] = useState(false);

  // Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  
  // Profile & Password Edit States
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // UI / Toast States
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedModel, setSelectedModel] = useState('GPT-4o mini');

  const fileInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const notebookChatEndRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (token) {
      fetchUserProfile(token);
      fetchConversations(token);
      fetchUserDocuments(token);
    } else {
      setUser(null);
      setConversations([]);
      setActiveChatId(null);
      setMessages([]);
      setDocuments([]);
      setActiveDocId(null);
      setActiveDoc(null);
      setDocMessages([]);
    }
  }, [token]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  useEffect(() => {
    notebookChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [docMessages, isNotebookStreaming]);

  useEffect(() => {
    if (activeChatId && token) {
      fetchChatMessages(activeChatId, token);
    } else {
      setMessages([]);
    }
  }, [activeChatId]);

  useEffect(() => {
    if (activeDocId && token) {
      fetchDocumentDetails(activeDocId, token);
      fetchDocumentMessages(activeDocId, token);
    } else {
      setActiveDoc(null);
      setDocMessages([]);
    }
  }, [activeDocId]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const showToast = (msg, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 4000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const handleUnauthorized = () => {
    localStorage.removeItem('access_token');
    setToken('');
    setUser(null);
    setConversations([]);
    setActiveChatId(null);
    setMessages([]);
    setDocuments([]);
    setActiveDocId(null);
    setActiveDoc(null);
    setDocMessages([]);
    setUserMenuOpen(false);
    setProfileModalOpen(false);
    setAuthTab('login');
    setAuthModalOpen(true);
    showToast('Session expired. Please sign in again.', true);
  };

  const fetchUserProfile = async (authToken) => {
    try {
      const res = await fetch(`${API_BASE}/me`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setEditName(data.name || '');
        setEditPhone(data.phone_number || '');
      } else if (res.status === 401) {
        handleUnauthorized();
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    }
  };

  const fetchConversations = async (authToken) => {
    try {
      const res = await fetch(`${API_BASE}/chats`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      } else if (res.status === 401) {
        handleUnauthorized();
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  };

  const fetchChatMessages = async (chatId, authToken) => {
    try {
      const res = await fetch(`${API_BASE}/chats/${chatId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.map(m => ({ sender: m.role, text: m.content })));
      } else if (res.status === 401) {
        handleUnauthorized();
      }
    } catch (err) {
      console.error('Failed to fetch chat messages:', err);
    }
  };

  const fetchUserDocuments = async (authToken) => {
    try {
      const res = await fetch(`${API_BASE}/notebook/documents`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
        if (data.length > 0 && !activeDocId) {
          setActiveDocId(data[0].id);
        }
      } else if (res.status === 401) {
        handleUnauthorized();
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }
  };

  const fetchDocumentDetails = async (docId, authToken) => {
    try {
      const res = await fetch(`${API_BASE}/notebook/documents/${docId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveDoc(data);
      } else if (res.status === 401) {
        handleUnauthorized();
      }
    } catch (err) {
      console.error('Failed to fetch document details:', err);
    }
  };

  const fetchDocumentMessages = async (docId, authToken) => {
    try {
      const res = await fetch(`${API_BASE}/notebook/documents/${docId}/messages`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDocMessages(data.map(m => ({ sender: m.role, text: m.content })));
      } else if (res.status === 401) {
        handleUnauthorized();
      }
    } catch (err) {
      console.error('Failed to fetch document messages:', err);
    }
  };

  // UPLOAD PDF DOCUMENT TO NOTEBOOKLLM (Fixed JS file validation)
  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!token) {
      setAuthTab('login');
      setAuthModalOpen(true);
      return;
    }

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      showToast('Please upload a valid PDF document.', true);
      return;
    }

    setUploadingPdf(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/notebook/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setDocuments(prev => [data, ...prev]);
        setActiveDocId(data.id);
        setActiveDoc(data);
        setDocMessages([]);
        showToast(`PDF '${data.filename}' uploaded successfully!`);
      } else if (res.status === 401) {
        handleUnauthorized();
      } else {
        showToast(data.detail || 'PDF upload failed.', true);
      }
    } catch (err) {
      showToast('Network error during PDF upload.', true);
    } finally {
      setUploadingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  const handleDeleteDocument = async (e, docId) => {
    e.stopPropagation();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/notebook/documents/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setDocuments(prev => prev.filter(d => d.id !== docId));
        if (activeDocId === docId) {
          const remaining = documents.filter(d => d.id !== docId);
          setActiveDocId(remaining.length > 0 ? remaining[0].id : null);
        }
        showToast('Document deleted');
      } else if (res.status === 401) {
        handleUnauthorized();
      }
    } catch (err) {
      showToast('Failed to delete document.', true);
    }
  };

  // STREAM NOTEBOOKLLM DOCUMENT RESPONSE (Includes selectedModel)
  const handleSendNotebookMessage = async (promptText) => {
    const query = promptText || notebookPromptInput;
    if (!query.trim()) return;

    if (!token) {
      setAuthTab('login');
      setAuthModalOpen(true);
      return;
    }

    if (!activeDocId) {
      showToast('Please upload or select a PDF document first!', true);
      return;
    }

    setDocMessages(prev => [...prev, { sender: 'user', text: query }]);
    if (!promptText) setNotebookPromptInput('');
    setIsNotebookStreaming(true);

    setDocMessages(prev => [...prev, { sender: 'assistant', text: '' }]);

    try {
      const response = await fetch(`${API_BASE}/notebook/documents/${activeDocId}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: query, model: selectedModel })
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleUnauthorized();
        } else {
          const errData = await response.json().catch(() => null);
          showToast(errData?.detail || `Server error (${response.status})`, true);
        }
        setIsNotebookStreaming(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataContent = trimmed.slice(6);
            if (dataContent === '[DONE]') break;

            let textToAdd = dataContent;
            try {
              const parsed = JSON.parse(dataContent);
              if (parsed && parsed.content !== undefined) {
                textToAdd = parsed.content;
              }
            } catch (e) {}

            if (textToAdd) {
              setDocMessages(prev => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (lastIdx >= 0 && updated[lastIdx].sender === 'assistant') {
                  updated[lastIdx] = {
                    ...updated[lastIdx],
                    text: updated[lastIdx].text + textToAdd
                  };
                }
                return updated;
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('Error during notebook streaming:', err);
      showToast('Network error during notebook streaming.', true);
    } finally {
      setIsNotebookStreaming(false);
    }
  };

  const handleCreateNewChat = async () => {
    if (!token) {
      setAuthModalOpen(true);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title: 'New Chat' })
      });
      if (res.ok) {
        const newChat = await res.json();
        setConversations(prev => [newChat, ...prev]);
        setActiveChatId(newChat.id);
        setMessages([]);
      } else if (res.status === 401) {
        handleUnauthorized();
      } else {
        const errData = await res.json().catch(() => null);
        showToast(errData?.detail || 'Failed to create new chat session.', true);
      }
    } catch (err) {
      showToast('Failed to create new chat session.', true);
    }
  };

  const handleDeleteChat = async (e, chatId) => {
    e.stopPropagation();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/chats/${chatId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setConversations(prev => prev.filter(c => c.id !== chatId));
        if (activeChatId === chatId) {
          setActiveChatId(null);
          setMessages([]);
        }
        showToast('Conversation deleted');
      } else if (res.status === 401) {
        handleUnauthorized();
      }
    } catch (err) {
      showToast('Failed to delete conversation.', true);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('access_token', data.access_token);
        setToken(data.access_token);
        setUser(data.user);
        setAuthModalOpen(false);
        showToast('Successfully logged in!');
      } else {
        showToast(data.detail || 'Login failed. Check your credentials.', true);
      }
    } catch (err) {
      showToast('Network error during login.', true);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (regPassword !== regConfirmPassword) {
      showToast('Passwords do not match!', true);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: regEmail,
          password: regPassword,
          name: regName || null,
          phone_number: regPhone || null
        })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('access_token', data.access_token);
        setToken(data.access_token);
        setUser(data.user);
        setAuthModalOpen(false);
        showToast('Registration successful! Welcome to SuperGPT.');
      } else {
        showToast(data.detail || 'Registration failed.', true);
      }
    } catch (err) {
      showToast('Network error during registration.', true);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editName,
          phone_number: editPhone
        })
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data);
        showToast('Profile updated successfully!');
      } else if (res.status === 401) {
        handleUnauthorized();
      } else {
        showToast(data.detail || 'Failed to update profile.', true);
      }
    } catch (err) {
      showToast('Network error while updating profile.', true);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!token) return;

    if (newPassword !== confirmNewPassword) {
      showToast('New password and confirm password do not match!', true);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/me/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
          confirm_password: confirmNewPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        setOldPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        showToast('Password changed successfully!');
      } else if (res.status === 401) {
        handleUnauthorized();
      } else {
        showToast(data.detail || 'Failed to change password.', true);
      }
    } catch (err) {
      showToast('Network error while changing password.', true);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !token) return;

    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/me/photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data);
        showToast('Profile photo updated!');
      } else if (res.status === 401) {
        handleUnauthorized();
      } else {
        showToast(data.detail || 'Photo upload failed.', true);
      }
    } catch (err) {
      showToast('Network error during photo upload.', true);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setToken('');
    setUser(null);
    setConversations([]);
    setActiveChatId(null);
    setMessages([]);
    setDocuments([]);
    setActiveDocId(null);
    setActiveDoc(null);
    setDocMessages([]);
    setUserMenuOpen(false);
    setProfileModalOpen(false);
    showToast('Logged out successfully.');
  };

  // STREAM SUPERGPT CHAT RESPONSE (Includes selectedModel)
  const handleSendMessage = async (textToSend) => {
    const query = textToSend || promptInput;
    if (!query.trim()) return;

    if (!token) {
      setAuthTab('login');
      setAuthModalOpen(true);
      return;
    }

    let currentChatId = activeChatId;

    if (!currentChatId) {
      try {
        const createRes = await fetch(`${API_BASE}/chats`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ title: query.slice(0, 25) })
        });
        if (createRes.ok) {
          const newChat = await createRes.json();
          currentChatId = newChat.id;
          setActiveChatId(newChat.id);
        } else if (createRes.status === 401) {
          handleUnauthorized();
          return;
        } else {
          const errData = await createRes.json().catch(() => null);
          showToast(errData?.detail || 'Failed to create chat session.', true);
          return;
        }
      } catch (err) {
        showToast('Network error creating chat session.', true);
        return;
      }
    }

    setMessages(prev => [...prev, { sender: 'user', text: query }]);
    if (!textToSend) setPromptInput('');
    setIsStreaming(true);

    setMessages(prev => [...prev, { sender: 'assistant', text: '' }]);

    try {
      const response = await fetch(`${API_BASE}/chats/${currentChatId}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: query, model: selectedModel })
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleUnauthorized();
        } else {
          const errData = await response.json().catch(() => null);
          showToast(errData?.detail || `Server error (${response.status})`, true);
        }
        setIsStreaming(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataContent = trimmed.slice(6);
            if (dataContent === '[DONE]') break;

            let textToAdd = dataContent;
            try {
              const parsed = JSON.parse(dataContent);
              if (parsed && parsed.content !== undefined) {
                textToAdd = parsed.content;
              }
            } catch (e) {}

            if (textToAdd) {
              setMessages(prev => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (lastIdx >= 0 && updated[lastIdx].sender === 'assistant') {
                  updated[lastIdx] = {
                    ...updated[lastIdx],
                    text: updated[lastIdx].text + textToAdd
                  };
                }
                return updated;
              });
            }
          }
        }
      }

      fetchConversations(token);
    } catch (err) {
      console.error('Error during chunk streaming:', err);
      showToast('Network error during response streaming.', true);
    } finally {
      setIsStreaming(false);
    }
  };

  const samplePrompts = [
    { title: 'Explain quantum computing', desc: 'In simple terms with real-world analogies', icon: Lightbulb },
    { title: 'Write a Python script', desc: 'To fetch data from FastAPI endpoint', icon: Code },
    { title: 'Help me debug code', desc: 'Find issues in JWT token validation', icon: MessageSquare },
    { title: 'Create a learning path', desc: 'For modern fullstack web development', icon: Compass }
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--bg-canvas)' }}>
      
      {/* UNCONDITIONAL HIDDEN PDF FILE INPUT */}
      <input
        type="file"
        ref={pdfInputRef}
        onChange={handlePdfUpload}
        accept="application/pdf,.pdf"
        style={{ display: 'none' }}
      />

      {/* Toast Notifications */}
      {errorMsg && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 2000, background: '#7f1d1d', color: '#fca5a5', padding: '0.75rem 1.25rem', borderRadius: 12, border: '1px solid #ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 2000, background: '#064e3b', color: '#6ee7b7', padding: '0.75rem 1.25rem', borderRadius: 12, border: '1px solid #10b981', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* LEFT SIDEBAR (SUPERGPT CHAT OR NOTEBOOKLLM PDF LIBRARY) */}
      {sidebarOpen && (
        <aside
          style={{
            width: 280,
            background: 'var(--bg-surface)',
            borderRight: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 90,
            transition: 'all 0.3s ease'
          }}
        >
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: appMode === 'notebook' ? '#3b82f6' : '#10a37f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {appMode === 'notebook' ? <BookOpen size={18} color="#fff" /> : <Bot size={20} color="#fff" />}
              </div>
              <span style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                {appMode === 'notebook' ? 'NotebookLLM' : 'SuperGPT'}
              </span>
            </div>

            {appMode === 'chat' ? (
              <button
                className="btn-primary"
                onClick={handleCreateNewChat}
                style={{ width: '100%', justifyContent: 'flex-start', padding: '0.65rem 1rem', fontSize: '0.9rem', borderRadius: 14, background: '#10a37f' }}
              >
                <Plus size={18} />
                <span>New chat</span>
              </button>
            ) : (
              <button
                className="btn-primary"
                onClick={() => {
                  if (!token) {
                    setAuthTab('login');
                    setAuthModalOpen(true);
                    return;
                  }
                  pdfInputRef.current?.click();
                }}
                disabled={uploadingPdf}
                style={{ width: '100%', justifyContent: 'flex-start', padding: '0.65rem 1rem', fontSize: '0.9rem', borderRadius: 14, background: '#3b82f6' }}
              >
                <FileUp size={18} />
                <span>{uploadingPdf ? 'Parsing PDF...' : 'Upload PDF Document'}</span>
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0 0.75rem 1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', padding: '0.5rem 0.5rem 0.25rem 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {appMode === 'notebook' ? 'PDF Sources' : 'Recent Chats'}
            </p>

            {appMode === 'chat' ? (
              conversations.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '0.5rem', fontStyle: 'italic' }}>
                  {token ? 'No past chats yet' : 'Sign in to save chats'}
                </p>
              ) : (
                conversations.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => setActiveChatId(conv.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'space-between',
                      padding: '0.6rem 0.75rem',
                      borderRadius: 10,
                      background: activeChatId === conv.id ? 'var(--bg-elevated)' : 'transparent',
                      color: activeChatId === conv.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '0.88rem',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => { if (activeChatId !== conv.id) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { if (activeChatId !== conv.id) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden' }}>
                      <MessageCircle size={15} color={activeChatId === conv.id ? '#10a37f' : 'var(--text-muted)'} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {conv.title}
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleDeleteChat(e, conv.id)}
                      title="Delete chat"
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', opacity: 0.7, padding: 2 }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )
            ) : (
              documents.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '0.5rem', fontStyle: 'italic' }}>
                  {token ? 'No PDF documents uploaded yet.' : 'Sign in to upload PDFs.'}
                </p>
              ) : (
                documents.map(doc => (
                  <div
                    key={doc.id}
                    onClick={() => setActiveDocId(doc.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'space-between',
                      padding: '0.6rem 0.75rem',
                      borderRadius: 10,
                      background: activeDocId === doc.id ? 'var(--bg-elevated)' : 'transparent',
                      color: activeDocId === doc.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '0.88rem',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => { if (activeDocId !== doc.id) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { if (activeDocId !== doc.id) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden' }}>
                      <FileText size={16} color={activeDocId === doc.id ? '#3b82f6' : 'var(--text-muted)'} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {doc.filename}
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleDeleteDocument(e, doc.id)}
                      title="Delete document"
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', opacity: 0.7, padding: 2 }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )
            )}
          </div>
        </aside>
      )}

      {/* RIGHT MAIN WORKSPACE */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        
        {/* TOP HEADER */}
        <header style={{ height: 64, borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', background: 'var(--bg-surface)', zIndex: 100 }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="btn-secondary"
              style={{ width: 36, height: 36, padding: 0, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Menu size={18} />
            </button>

            {/* APP MODE SWITCH TABS: SuperGPT | NotebookLLM */}
            <div style={{ display: 'flex', background: 'var(--bg-elevated)', padding: '0.25rem', borderRadius: 24, border: '1px solid var(--border-color)' }}>
              <button
                onClick={() => setAppMode('chat')}
                style={{
                  border: 'none',
                  padding: '0.35rem 1rem',
                  borderRadius: 20,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: appMode === 'chat' ? '#10a37f' : 'transparent',
                  color: appMode === 'chat' ? '#fff' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.2s'
                }}
              >
                <Bot size={15} />
                <span>SuperGPT Chat</span>
              </button>

              <button
                onClick={() => setAppMode('notebook')}
                style={{
                  border: 'none',
                  padding: '0.35rem 1rem',
                  borderRadius: 20,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: appMode === 'notebook' ? '#3b82f6' : 'transparent',
                  color: appMode === 'notebook' ? '#fff' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.2s'
                }}
              >
                <BookOpen size={15} />
                <span>NotebookLLM Studio</span>
              </button>
            </div>

            {/* DYNAMIC MODEL SELECTOR DROPDOWN */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-elevated)', padding: '0.35rem 0.85rem', borderRadius: 20, border: '1px solid var(--border-color)' }}>
              <Zap size={14} color={appMode === 'notebook' ? '#3b82f6' : '#10a37f'} />
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}
              >
                <option value="GPT-4o mini" style={{ background: 'var(--bg-surface)' }}>GPT-4o mini</option>
                <option value="GPT-4o" style={{ background: 'var(--bg-surface)' }}>GPT-4o</option>
                <option value="GPT-3.5 Turbo" style={{ background: 'var(--bg-surface)' }}>GPT-3.5 Turbo</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={toggleTheme}
              className="btn-secondary"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              style={{ width: 38, height: 38, padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {theme === 'dark' ? <Sun size={18} color="#facc15" /> : <Moon size={18} color="#3b82f6" />}
            </button>

            {token && user ? (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem' }}
                >
                  {user.profile_photo ? (
                    <img
                      src={`${API_BASE}${user.profile_photo}`}
                      alt="Profile"
                      style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid #10a37f' }}
                    />
                  ) : (
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#10a37f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600 }}>
                      {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>

                {userMenuOpen && (
                  <div className="glass-panel" style={{ position: 'absolute', right: 0, top: 48, width: 240, borderRadius: 16, padding: '0.5rem', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', zIndex: 200 }}>
                    <div style={{ padding: '0.75rem 0.75rem 0.5rem 0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                      <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{user.name || 'User Account'}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</p>
                    </div>

                    <button
                      onClick={() => { setProfileTab('info'); setProfileModalOpen(true); setUserMenuOpen(false); }}
                      style={{ width: '100%', background: 'none', border: 'none', padding: '0.6rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: 8, textAlign: 'left', marginTop: 4 }}
                      onMouseEnter={(e) => e.target.style.background = 'var(--bg-elevated)'}
                      onMouseLeave={(e) => e.target.style.background = 'none'}
                    >
                      <User size={16} />
                      <span style={{ fontSize: '0.9rem' }}>Edit Profile</span>
                    </button>

                    <button
                      onClick={() => { setProfileTab('security'); setProfileModalOpen(true); setUserMenuOpen(false); }}
                      style={{ width: '100%', background: 'none', border: 'none', padding: '0.6rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: 8, textAlign: 'left' }}
                      onMouseEnter={(e) => e.target.style.background = 'var(--bg-elevated)'}
                      onMouseLeave={(e) => e.target.style.background = 'none'}
                    >
                      <KeyRound size={16} />
                      <span style={{ fontSize: '0.9rem' }}>Change Password</span>
                    </button>

                    <button
                      onClick={handleLogout}
                      style={{ width: '100%', background: 'none', border: 'none', padding: '0.6rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#f87171', cursor: 'pointer', borderRadius: 8, textAlign: 'left' }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.1)'}
                      onMouseLeave={(e) => e.target.style.background = 'none'}
                    >
                      <LogOut size={16} />
                      <span style={{ fontSize: '0.9rem' }}>Log out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                className="btn-primary"
                onClick={() => { setAuthTab('login'); setAuthModalOpen(true); }}
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem', background: '#10a37f' }}
              >
                <User size={16} />
                <span>Sign in / Register</span>
              </button>
            )}
          </div>
        </header>

        {/* WORKSPACE MODE SWITCH: SUPERGPT CHAT vs NOTEBOOKLLM SPLIT-SCREEN */}
        {appMode === 'chat' ? (
          /* --- MODE A: SUPERGPT CHAT --- */
          <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem 7rem 1rem' }}>
            {messages.length === 0 ? (
              <div style={{ maxWidth: 800, width: '100%', marginTop: 'auto', marginBottom: 'auto', textAlign: 'center' }} className="animate-fade-in">
                <h1 style={{ fontSize: '3.2rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '0.5rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                  What can SuperGPT help with today?
                </h1>
                <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', fontWeight: 400, marginBottom: '2.5rem' }}>
                  Model: {selectedModel}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', textAlign: 'left' }}>
                  {samplePrompts.map((item, idx) => {
                    const IconComp = item.icon;
                    return (
                      <div
                        key={idx}
                        className="prompt-card"
                        onClick={() => handleSendMessage(item.title)}
                      >
                        <p style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4 }}>{item.title}</p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.desc}</span>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconComp size={16} color="#10a37f" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ maxWidth: 800, width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      gap: '1rem',
                      alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: msg.sender === 'user' ? '80%' : '100%',
                      flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row'
                    }}
                    className="animate-fade-in"
                  >
                    {msg.sender === 'user' ? (
                      user?.profile_photo ? (
                        <img src={`${API_BASE}${user.profile_photo}`} alt="Me" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#10a37f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>
                          {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                      )
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#10a37f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Bot size={20} color="#fff" />
                      </div>
                    )}

                    <div
                      style={{
                        background: msg.sender === 'user' ? 'var(--bg-elevated)' : 'transparent',
                        padding: msg.sender === 'user' ? '0.85rem 1.25rem' : '0.25rem 0',
                        borderRadius: msg.sender === 'user' ? '20px 20px 4px 20px' : '0',
                        color: 'var(--text-primary)',
                        fontSize: '1rem',
                        lineHeight: 1.6
                      }}
                    >
                      {msg.sender === 'user' ? (
                        <span style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</span>
                      ) : (
                        renderFormattedText(msg.text) || (isStreaming && index === messages.length - 1 ? '▋' : '')
                      )}
                    </div>
                  </div>
                ))}

                <div ref={chatEndRef} />
              </div>
            )}

            {/* SUPERGPT INPUT BAR */}
            <div style={{ position: 'fixed', bottom: 24, left: sidebarOpen ? 280 : 0, right: 0, display: 'flex', justifyContent: 'center', padding: '0 1rem', pointerEvents: 'none', transition: 'left 0.3s' }}>
              <div
                className="glass-panel"
                style={{
                  maxWidth: 800,
                  width: '100%',
                  borderRadius: 32,
                  padding: '0.6rem 0.8rem 0.6rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  pointerEvents: 'auto',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.2), 0 0 0 1px var(--border-color)'
                }}
              >
                <input
                  type="text"
                  placeholder={`Message SuperGPT (${selectedModel})...`}
                  value={promptInput}
                  disabled={isStreaming}
                  onChange={(e) => setPromptInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '1rem', fontFamily: 'var(--font-sans)' }}
                />

                <button
                  onClick={() => handleSendMessage()}
                  disabled={isStreaming}
                  className="btn-primary"
                  style={{ width: 42, height: 42, padding: 0, borderRadius: '50%', opacity: isStreaming ? 0.5 : 1, background: '#10a37f' }}
                >
                  <Send size={18} color="#fff" />
                </button>
              </div>
            </div>
          </main>
        ) : (
          /* --- MODE B: NOTEBOOKLLM SPLIT-SCREEN WORKSPACE --- */
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            
            {/* LEFT SPLIT PANEL: PDF READER & PREVIEW */}
            <div style={{ flex: 1, borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'var(--bg-canvas)', overflow: 'hidden' }}>
              {activeDoc ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {/* PDF Header Bar */}
                  <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={20} color="#3b82f6" />
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{activeDoc.filename}</p>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Uploaded on {activeDoc.created_at ? new Date(activeDoc.created_at).toLocaleDateString() : 'Today'}</p>
                      </div>
                    </div>

                    <a
                      href={`${API_BASE}${activeDoc.file_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}
                    >
                      Open PDF File
                    </a>
                  </div>

                  {/* PDF Reader Content Area */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                    <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 16, border: '1px solid var(--border-color)', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#3b82f6', fontWeight: 600 }}>
                        <Sparkles size={18} />
                        <span>Extracted Document Text</span>
                      </div>

                      <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-sans)', fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--text-primary)', margin: 0 }}>
                        {activeDoc.extracted_text || 'No text extracted from PDF.'}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                /* EMPTY PDF STATE */
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                    <BookOpen size={32} color="#3b82f6" />
                  </div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>NotebookLLM Source Studio</h2>
                  <p style={{ color: 'var(--text-muted)', maxWidth: 400, marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                    Upload a PDF document to extract text, read contents, summarize insights, and chat with your document.
                  </p>

                  <button
                    className="btn-primary"
                    onClick={() => {
                      if (!token) {
                        setAuthTab('login');
                        setAuthModalOpen(true);
                        return;
                      }
                      pdfInputRef.current?.click();
                    }}
                    disabled={uploadingPdf}
                    style={{ background: '#3b82f6', padding: '0.75rem 1.5rem', borderRadius: 12, fontSize: '0.95rem' }}
                  >
                    <FileUp size={18} />
                    <span>{uploadingPdf ? 'Uploading PDF...' : 'Select PDF Document'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* RIGHT SPLIT PANEL: NOTEBOOK AI CHAT WORKSPACE */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)', overflow: 'hidden' }}>
              
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={18} color="#3b82f6" />
                  <span style={{ fontWeight: 700, fontSize: '1rem' }}>Notebook Assistant ({selectedModel})</span>
                </div>
                {activeDoc && (
                  <span style={{ fontSize: '0.8rem', background: 'var(--bg-elevated)', padding: '0.35rem 0.75rem', borderRadius: 12, border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    Active PDF: {activeDoc.filename}
                  </span>
                )}
              </div>

              {/* QUICK ACTION BUTTONS */}
              {activeDoc && (
                <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', background: 'var(--bg-canvas)' }}>
                  <button
                    onClick={() => handleSendNotebookMessage('Summarize this PDF document in detail with bullet points')}
                    className="btn-secondary"
                    style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem', borderRadius: 16 }}
                  >
                    📄 Summarize PDF
                  </button>
                  <button
                    onClick={() => handleSendNotebookMessage('Extract key takeaways and main insights from this document')}
                    className="btn-secondary"
                    style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem', borderRadius: 16 }}
                  >
                    🔑 Key Takeaways
                  </button>
                  <button
                    onClick={() => handleSendNotebookMessage('Generate a quick study guide and Q&A from this document')}
                    className="btn-secondary"
                    style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem', borderRadius: 16 }}
                  >
                    📝 Study Guide
                  </button>
                </div>
              )}

              {/* NOTEBOOK CHAT MESSAGES */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {docMessages.length === 0 ? (
                  <div style={{ marginTop: 'auto', marginBottom: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <BookOpen size={40} style={{ opacity: 0.4, marginBottom: '0.75rem' }} />
                    <p style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>Chat with your Document</p>
                    <p style={{ fontSize: '0.85rem' }}>Ask questions, generate summaries, or analyze your PDF source.</p>
                  </div>
                ) : (
                  docMessages.map((msg, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        gap: '0.85rem',
                        alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: msg.sender === 'user' ? '85%' : '100%',
                        flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row'
                      }}
                      className="animate-fade-in"
                    >
                      {msg.sender === 'user' ? (
                        user?.profile_photo ? (
                          <img src={`${API_BASE}${user.profile_photo}`} alt="Me" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>
                            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                        )
                      ) : (
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <BookOpen size={18} color="#fff" />
                        </div>
                      )}

                      <div
                        style={{
                          background: msg.sender === 'user' ? 'var(--bg-elevated)' : 'transparent',
                          padding: msg.sender === 'user' ? '0.75rem 1.15rem' : '0.25rem 0',
                          borderRadius: msg.sender === 'user' ? '18px 18px 4px 18px' : '0',
                          color: 'var(--text-primary)',
                          fontSize: '0.95rem',
                          lineHeight: 1.6
                        }}
                      >
                        {msg.sender === 'user' ? (
                          <span style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</span>
                        ) : (
                          renderFormattedText(msg.text) || (isNotebookStreaming && index === docMessages.length - 1 ? '▋' : '')
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={notebookChatEndRef} />
              </div>

              {/* NOTEBOOK INPUT BAR */}
              <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-canvas)' }}>
                <div
                  className="glass-panel"
                  style={{
                    borderRadius: 24,
                    padding: '0.5rem 0.75rem 0.5rem 1.15rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
                  }}
                >
                  <input
                    type="text"
                    placeholder={activeDoc ? `Ask NotebookLLM (${selectedModel}) about ${activeDoc.filename}...` : 'Upload a PDF to start chatting...'}
                    value={notebookPromptInput}
                    disabled={isNotebookStreaming || !activeDoc}
                    onChange={(e) => setNotebookPromptInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendNotebookMessage()}
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '0.95rem', fontFamily: 'var(--font-sans)' }}
                  />

                  <button
                    onClick={() => handleSendNotebookMessage()}
                    disabled={isNotebookStreaming || !activeDoc}
                    className="btn-primary"
                    style={{ width: 38, height: 38, padding: 0, borderRadius: '50%', opacity: (isNotebookStreaming || !activeDoc) ? 0.5 : 1, background: '#3b82f6' }}
                  >
                    <Send size={16} color="#fff" />
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* AUTHENTICATION MODAL */}
      {authModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Bot size={20} color="#10a37f" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{authTab === 'login' ? 'Welcome Back' : 'Create Account'}</h3>
              </div>
              <button onClick={() => setAuthModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
              <button
                onClick={() => setAuthTab('login')}
                style={{ flex: 1, padding: '0.85rem', background: authTab === 'login' ? 'var(--bg-elevated)' : 'none', border: 'none', color: authTab === 'login' ? '#10a37f' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', borderBottom: authTab === 'login' ? '2px solid #10a37f' : 'none' }}
              >
                Sign In
              </button>
              <button
                onClick={() => setAuthTab('register')}
                style={{ flex: 1, padding: '0.85rem', background: authTab === 'register' ? 'var(--bg-elevated)' : 'none', border: 'none', color: authTab === 'register' ? '#10a37f' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', borderBottom: authTab === 'register' ? '2px solid #10a37f' : 'none' }}
              >
                Register
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {authTab === 'login' ? (
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="user@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Password *</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem', width: '100%', background: '#10a37f' }}>
                    Sign In
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="user@example.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Password * (min 6 chars)</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Confirm Password *</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Full Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Phone Number (Optional)</label>
                    <input
                      type="text"
                      placeholder="+1234567890"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem', width: '100%', background: '#10a37f' }}>
                    Create Account
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* USER PROFILE & PASSWORD EDIT MODAL */}
      {profileModalOpen && user && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Account Settings</h3>
              <button onClick={() => setProfileModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
              <button
                onClick={() => setProfileTab('info')}
                style={{ flex: 1, padding: '0.85rem', background: profileTab === 'info' ? 'var(--bg-elevated)' : 'none', border: 'none', color: profileTab === 'info' ? '#10a37f' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', borderBottom: profileTab === 'info' ? '2px solid #10a37f' : 'none' }}
              >
                Profile Details
              </button>
              <button
                onClick={() => setProfileTab('security')}
                style={{ flex: 1, padding: '0.85rem', background: profileTab === 'security' ? 'var(--bg-elevated)' : 'none', border: 'none', color: profileTab === 'security' ? '#10a37f' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', borderBottom: profileTab === 'security' ? '2px solid #10a37f' : 'none' }}
              >
                Security & Password
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {profileTab === 'info' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'var(--bg-elevated)', padding: '1rem', borderRadius: 16 }}>
                    <div style={{ position: 'relative' }}>
                      {user.profile_photo ? (
                        <img
                          src={`${API_BASE}${user.profile_photo}`}
                          alt="Avatar"
                          style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid #10a37f' }}
                        />
                      ) : (
                        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#10a37f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.8rem', fontWeight: 600 }}>
                          {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: '1rem' }}>Profile Picture</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>PNG, JPG, or WEBP images</p>
                      
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handlePhotoUpload}
                        accept="image/*"
                        style={{ display: 'none' }}
                      />

                      <button
                        className="btn-secondary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <Upload size={14} />
                        <span>{uploadingPhoto ? 'Uploading...' : 'Upload New Photo'}</span>
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Email Address (Read only)</label>
                      <input type="text" value={user.email} disabled className="form-input" style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Full Name</label>
                      <input
                        type="text"
                        placeholder="Enter your name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Phone Number</label>
                      <input
                        type="text"
                        placeholder="+1234567890"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <button type="button" className="btn-secondary" onClick={() => setProfileModalOpen(false)}>
                        Cancel
                      </button>
                      <button type="submit" className="btn-primary" style={{ background: '#10a37f' }}>
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Current Password *</label>
                    <input
                      type="password"
                      required
                      placeholder="Enter current password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>New Password * (min 6 chars)</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Confirm New Password *</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="Confirm new password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button type="button" className="btn-secondary" onClick={() => setProfileModalOpen(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary" style={{ background: '#10a37f' }}>
                      Update Password
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
