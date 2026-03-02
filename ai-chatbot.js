const chatArea = document.getElementById('chatArea');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const welcomeScreen = document.getElementById('welcomeScreen');

let currentMode = 'all';
let isLoading = false;
let conversationHistory = [];

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
    all:       'You are NOVA, a friendly, sharp AI assistant. You excel at Q&A, general knowledge, math calculations (always show your work clearly), and small talk. Be concise but warm. When doing calculations, format the steps clearly.',
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

  // Hide welcome screen
  if (welcomeScreen) welcomeScreen.style.display = 'none';

  // Add user message
  addMessage('user', text);
  conversationHistory.push({ role: 'user', content: text });
  userInput.value = '';
  userInput.style.height = 'auto';

  // Show typing indicator
  const typingEl = addTyping();
  isLoading = true;
  sendBtn.disabled = true;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': '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',
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
    const reply = data.content?.map(b => b.text || '').join('') || 'Sorry, I had trouble responding. Try again!';

    typingEl.remove();
    conversationHistory.push({ role: 'assistant', content: reply });
    addMessage('bot', reply, detectTag(text));

  } catch (err) {
    typingEl.remove();
    addMessage('bot', '⚠ Error: ' + err.message + ' | ' + JSON.stringify(err), 'qa');
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
