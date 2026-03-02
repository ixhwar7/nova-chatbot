const chatArea = document.getElementById('chatArea');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const welcomeScreen = document.getElementById('welcomeScreen');

let currentMode = 'all';
let isLoading = false;
let conversationHistory = [];

// ── API Key Setup Box ──
function createApiKeyBox() {
  const box = document.createElement('div');
  box.id = 'apiKeyBox';
  box.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(10,10,15,0.97);
    display: flex; align-items: center; justify-content: center;
    z-index: 9999; font-family: 'DM Mono', monospace;
  `;
  box.innerHTML = `
    <div style="background:#12121a; border:1px solid #2a2a3e; border-radius:20px; padding:32px; max-width:420px; width:90%; text-align:center;">
      <div style="font-size:40px; margin-bottom:16px;">🔑</div>
      <h2 style="font-family:'Syne',sans-serif; color:#e8e8f0; font-size:20px; margin-bottom:8px;">Enter Your API Key</h2>
      <p style="color:#6b6b88; font-size:12px; margin-bottom:24px; line-height:1.6;">
        Get your free key from<br>
        <strong style="color:#7c6aff;">console.anthropic.com</strong><br>
        → API Keys → Create Key
      </p>
      <input id="apiKeyInput" type="password"
        placeholder="sk-ant-api03-..."
        style="width:100%; padding:12px 16px; border-radius:12px; border:1px solid #2a2a3e;
               background:#0a0a0f; color:#e8e8f0; font-family:'DM Mono',monospace;
               font-size:13px; outline:none; margin-bottom:12px;"
      />
      <div id="apiKeyError" style="color:#ff6ab0; font-size:12px; margin-bottom:12px; display:none;">
        ⚠ Invalid key! Make sure it starts with sk-ant-
      </div>
      <button onclick="saveApiKey()"
        style="width:100%; padding:14px; border:none; border-radius:12px;
               background:#7c6aff; color:white; font-family:'DM Mono',monospace;
               font-size:14px; font-weight:600; cursor:pointer;">
        Start Chatting ➤
      </button>
      <p style="color:#3a3a5e; font-size:10px; margin-top:16px;">
        🔒 Key is saved only in your browser — never shared
      </p>
    </div>
  `;
  document.body.appendChild(box);
}

function saveApiKey() {
  const key = document.getElementById('apiKeyInput').value.trim();
  if (!key.startsWith('sk-ant-')) {
    document.getElementById('apiKeyError').style.display = 'block';
    return;
  }
  localStorage.setItem('nova_api_key', key);
  document.getElementById('apiKeyBox').remove();
}

function getApiKey() {
  return localStorage.getItem('nova_api_key');
}

// Show API key box if no key saved
window.addEventListener('DOMContentLoaded', () => {
  if (!getApiKey()) createApiKeyBox();
});

// ── Mode Switching ──
document.querySelectorAll('.mode-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.mode-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentMode = pill.dataset.mode;
  });
});

// ── Auto-resize textarea ──
userInput.addEventListener('input', () => {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
});

// ── Send on Enter ──
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// ── Suggestion Cards ──
function sendSuggestion(text) {
  userInput.value = text;
  sendMessage();
}

// ── Auto-detect message type ──
function detectTag(text) {
  const t = text.toLowerCase();
  if (/(\d[\d\s\+\-\*\/\%\^\.]+[\d]|calculat|how much|percent|tip|convert|\bplus\b|\bminus\b|\btimes\b|\bdivide\b|sqrt|square root)/.test(t)) return 'calc';
  if (/(who is|what is|when did|where is|how does|why does|tell me about|define|explain|history of|invented|discovered|capital of|population)/.test(t)) return 'knowledge';
  if (/(hello|hi |hey|how are you|what's up|good morning|good evening|how do you|are you|do you like|favorite|feeling|mood|fun fact|joke|laugh|happy|sad|bored|excited)/.test(t)) return 'chat';
  return 'qa';
}

// ── System Prompt by Mode ──
function getSystemPrompt() {
  const modeInstructions = {
    all:       'You are NOVA, a friendly, sharp AI assistant. You excel at Q&A, general knowledge, math calculations (always show your work clearly), and small talk. Be concise but warm.',
    qa:        'You are NOVA, focused on answering questions accurately and concisely. Give clear, direct answers.',
    knowledge: 'You are NOVA, a knowledgeable assistant. Provide accurate, fascinating general knowledge answers. Add interesting context when relevant.',
    calc:      'You are NOVA, a precise calculator assistant. Always show calculation steps clearly. Format math results prominently. Be accurate.',
    chat:      'You are NOVA, a friendly and fun conversationalist. Be warm, witty, and engaging. Keep responses light and enjoyable.'
  };
  return modeInstructions[currentMode] || modeInstructions.all;
}

// ── Send Message ──
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text || isLoading) return;

  const apiKey = getApiKey();
  if (!apiKey) { createApiKeyBox(); return; }

  if (welcomeScreen) welcomeScreen.style.display = 'none';

  addMessage('user', text);
  conversationHistory.push({ role: 'user', content: text });
  userInput.value = '';
  userInput.style.height = 'auto';

  const typingEl = addTyping();
  isLoading = true;
  sendBtn.disabled = true;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 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,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: getSystemPrompt(),
        messages: conversationHistory
      })
    });

    const data = await response.json();

    if (data.error) {
      typingEl.remove();
      if (data.error.type === 'authentication_error') {
        localStorage.removeItem('nova_api_key');
        addMessage('bot', '🔑 API key is invalid or expired! Please enter a new key.', 'qa');
        setTimeout(createApiKeyBox, 1500);
      } else {
        addMessage('bot', '⚠ Error: ' + data.error.message, 'qa');
      }
    } else {
      const reply = data.content?.map(b => b.text || '').join('') || 'Sorry, try again!';
      typingEl.remove();
      conversationHistory.push({ role: 'assistant', content: reply });
      addMessage('bot', reply, detectTag(text));
    }

  } catch (err) {
    typingEl.remove();
    addMessage('bot', '⚠ Network error: ' + err.message, 'qa');
  }

  isLoading = false;
  sendBtn.disabled = false;
  userInput.focus();
}

// ── Add Message Bubble ──
function addMessage(role, text, tag) {
  const msg = document.createElement('div');
  msg.className = `message ${role}`;

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  if (role === 'user') avatar.textContent = 'U';

  const bubble = document.createElement('div');
  bubble.className = 'bubble';

  if (role === 'bot' && tag) {
    const labels = { qa: 'Answer', calc: 'Calculation', knowledge: 'Knowledge', chat: 'Chat' };
    const tagEl = document.createElement('div');
    tagEl.className = `tag ${tag}`;
    tagEl.textContent = labels[tag] || 'NOVA';
    bubble.appendChild(tagEl);
  }

  const content = document.createElement('div');
  content.style.whiteSpace = 'pre-wrap';
  content.textContent = text;
  bubble.appendChild(content);

  msg.appendChild(avatar);
  msg.appendChild(bubble);
  chatArea.appendChild(msg);
  chatArea.scrollTop = chatArea.scrollHeight;
  return msg;
}

// ── Typing Indicator ──
function addTyping() {
  const msg = document.createElement('div');
  msg.className = 'message bot';
  msg.innerHTML = `
    <div class="avatar"></div>
    <div class="bubble">
      <div class="typing">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>`;
  chatArea.appendChild(msg);
  chatArea.scrollTop = chatArea.scrollHeight;
  return msg;
}
