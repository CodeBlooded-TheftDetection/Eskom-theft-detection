/* ═══════════════════════════════════════════════════════════════
   AI OPERATIONS ASSISTANT
   • Real-time database context via /api/chatbot (authenticated)
   • gpt-4o-mini with full system prompt & live data
   • Typing indicator animation while waiting for response
   • Char-by-char typewriter animation for AI replies
   • Markdown-lite formatting (bold, italic, code, line breaks)
   • App navigation guidance built into system prompt
═══════════════════════════════════════════════════════════════ */

let aiOpen   = false;
let isTyping = false;
let typeTimer = null;
let statusTimer = null;  // cycles the loading status messages
let conversationHistory = [];

// Status messages shown while waiting for a response — cycles every 2s
const STATUS_MESSAGES = [
  'Checking live data...',
  'AI is thinking...',
  'Working on it...',
  'Querying the database...',
  'Analysing your request...',
  'Preparing your answer...',
  'Almost there...'
];

// ── TOGGLE CHAT ───────────────────────────────────────────────
function toggleAIChat() {
  const container = document.getElementById('aiChatContainer');
  aiOpen = !aiOpen;

  if (aiOpen) {
    container.style.display = 'block';
    container.classList.remove('chat-close');
    // Force reflow so the animation restarts cleanly
    void container.offsetWidth;
    container.classList.add('chat-open');
    renderSuggestions();
    document.getElementById('aiInput').focus();
  } else {
    container.classList.remove('chat-open');
    container.classList.add('chat-close');
    // Hide after the close animation finishes (220ms)
    setTimeout(() => {
      if (!aiOpen) {
        container.style.display = 'none';
        container.classList.remove('chat-close');
      }
    }, 230);
  }
}

// ── KEYBOARD ─────────────────────────────────────────────────
function handleAIKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendAIMessage();
  }
}

// ── QUICK PROMPTS ─────────────────────────────────────────────
function quickPrompt(text) {
  if (isTyping) return;
  document.getElementById('aiInput').value = text;
  sendAIMessage();
}

// ── ADD USER BUBBLE ───────────────────────────────────────────
function addUserMessage(text) {
  const messages = document.getElementById('aiMessages');
  const div = document.createElement('div');
  div.className = 'user-message';
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

// ── STATUS INDICATOR (rotating contextual messages) ─────────
function showTypingIndicator() {
  const messages = document.getElementById('aiMessages');
  const div = document.createElement('div');
  div.className = 'ai-message status-indicator';
  div.id = 'aiTypingIndicator';
  div.textContent = STATUS_MESSAGES[0];
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;

  let idx = 1;
  statusTimer = setInterval(() => {
    const el = document.getElementById('aiTypingIndicator');
    if (!el) { clearInterval(statusTimer); return; }
    el.classList.add('status-fade-out');
    setTimeout(() => {
      if (!el.parentNode) return;
      el.textContent = STATUS_MESSAGES[idx % STATUS_MESSAGES.length];
      el.classList.remove('status-fade-out');
      idx++;
    }, 300);
  }, 2000);
}

function removeTypingIndicator() {
  clearInterval(statusTimer);
  statusTimer = null;
  const el = document.getElementById('aiTypingIndicator');
  if (el) el.remove();
}

// ── MARKDOWN-LITE FORMATTER ───────────────────────────────────
function formatAIResponse(raw) {
  return raw
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="ai-code">$1</code>')
    // Line breaks
    .replace(/\n/g, '<br>');
}

// ── TYPEWRITER ANIMATION ──────────────────────────────────────
// Types the raw text char-by-char into `container`,
// applying formatting at each step for live markdown rendering.
function typeMessage(container, rawText) {
  return new Promise((resolve) => {
    if (typeTimer) clearInterval(typeTimer);
    let i = 0;
    isTyping = true;
    container.innerHTML = '';

    const messages = document.getElementById('aiMessages');

    typeTimer = setInterval(() => {
      if (i < rawText.length) {
        i++;
        // Render formatted version of the partial text so far
        container.innerHTML = formatAIResponse(rawText.substring(0, i));
        messages.scrollTop = messages.scrollHeight;
      } else {
        clearInterval(typeTimer);
        typeTimer = null;
        isTyping = false;
        // Final pass — full formatted text
        container.innerHTML = formatAIResponse(rawText);
        messages.scrollTop = messages.scrollHeight;
        resolve();
      }
    }, 12); // 12ms per char — fast but visibly animated
  });
}

// ── ADD AI BUBBLE ─────────────────────────────────────────────
function addAIMessage(text, instant = false) {
  const messages = document.getElementById('aiMessages');
  const div = document.createElement('div');
  div.className = 'ai-message';

  if (instant) {
    div.innerHTML = formatAIResponse(text);
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  } else {
    messages.appendChild(div);
    typeMessage(div, text);
  }
}

// ── CLEAR CHAT ────────────────────────────────────────────────
function clearAIChat() {
  if (typeTimer) { clearInterval(typeTimer); typeTimer = null; }
  isTyping = false;
  conversationHistory = [];  // reset history so context doesn't carry over

  const messages = document.getElementById('aiMessages');
  messages.innerHTML = '';
  addAIMessage('Chat cleared. How can I assist you?', true);
}

// ── SHOW SERVER-SIDE ERROR ────────────────────────────────────
async function extractError(res) {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    const body = await res.json().catch(() => ({}));
    return body.error || `Server error (${res.status})`;
  }
  // Non-JSON (e.g. 404 HTML from Express) — server likely not restarted
  if (res.status === 404) return 'Route not found (status 404). Please restart the server.';
  return `Server error (${res.status}). Check the server console for details.`;
}

// ── DISABLE / ENABLE INPUT ────────────────────────────────────
function setInputState(disabled) {
  const btn   = document.querySelector('#aiInputArea button');
  const input = document.getElementById('aiInput');
  if (input) input.disabled = disabled;
  if (btn)   btn.disabled   = disabled;
}

// ── RENDER ROLE-AWARE SUGGESTIONS ───────────────────────────
function renderSuggestions() {
  const role = (localStorage.getItem('userRole') || '').toLowerCase();
  const container = document.getElementById('aiSuggestions');
  if (!container) return;

  // Base queries anyone can ask
  const suggestions = [
    { label: 'Case summary',           prompt: 'Give me a summary of all cases right now' },
    { label: 'High risk cases',        prompt: 'Show me all high risk cases' },
    { label: 'Available investigators',prompt: 'Which investigators are currently available?' },
    { label: 'Pending cases',          prompt: 'Show me all pending cases' },
  ];

  // Agent actions — admin only
  if (role === 'admin') {
    suggestions.push({ label: 'Add a user',     prompt: 'I want to add a new user' });
    suggestions.push({ label: 'Delete a user',  prompt: 'I want to delete a user' });
  }
  // Agent actions — admin + commander
  if (role === 'admin' || role === 'commander') {
    suggestions.push({ label: 'Create a case',      prompt: 'I want to create a new case' });
    suggestions.push({ label: 'Assign investigator', prompt: 'I want to assign an investigator to a case' });
  }
  // Investigator
  if (role === 'investigator') {
    suggestions.push({ label: 'My assigned cases', prompt: 'Show me my assigned cases' });
    suggestions.push({ label: 'Mark case resolved', prompt: 'I want to mark a case as resolved' });
  }

  container.innerHTML = suggestions
    .map(s => `<button onclick="quickPrompt('${s.prompt.replace(/'/g, "\\'")}')">${s.label}</button>`)
    .join('');
}

// ── SEND MESSAGE ─────────────────────────────────────────────
async function sendAIMessage() {
  if (isTyping) return;

  const input = document.getElementById('aiInput');
  const text  = input.value.trim();
  if (!text) return;

  const token = localStorage.getItem('token');
  if (!token) {
    addUserMessage(text);
    input.value = '';
    addAIMessage('You must be logged in to use the AI assistant.', true);
    return;
  }

  addUserMessage(text);
  input.value = '';
  setInputState(true);
  showTypingIndicator();

  try {
    // Send current message + prior conversation history (last 20 messages)
    const res = await fetch(`${window.location.origin}/api/chatbot`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ message: text, history: conversationHistory.slice(-20) })
    });

    removeTypingIndicator();
    setInputState(false);

    if (!res.ok) {
      const errMsg = await extractError(res);
      addAIMessage(errMsg, true);
      return;
    }

    const data = await res.json();
    // Update conversation history with this turn
    conversationHistory.push({ role: 'user',      content: text });
    conversationHistory.push({ role: 'assistant', content: data.reply });
    // Keep at most 40 entries (20 turns)
    if (conversationHistory.length > 40) conversationHistory.splice(0, conversationHistory.length - 40);
    addAIMessage(data.reply);

  } catch (err) {
    removeTypingIndicator();
    setInputState(false);
    console.error('Chatbot error:', err);
    addAIMessage('Connection error. Ensure the server is running and try again.', true);
  }
}






