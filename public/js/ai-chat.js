/**
 * Udyog Samyog — Module G & H: Floating Conversational Assistant
 * Multilingual (English, Marathi, Hindi) with grounded citations.
 */
(function () {
  "use strict";

  let chatLang = "en";
  let conversationId = "conv-" + Math.random().toString(36).substring(2, 9);

  // Translations for Chat UI
  const CHAT_I18N = {
    en: {
      title: "उद्योग सहाय्यक | AI Assistant",
      subtitle: "Grounded Statutory Guidance",
      placeholder: "Ask about clearances, rules, or schemes...",
      send: "Send",
      chips: [
        "What clearances do I need for my factory?",
        "Explain MPCB Red vs Orange category",
        "Am I eligible for PSI 2019 subsidies?",
        "Statutory timeline under Right to Services Act"
      ],
      disclaimer: "Guidance only. Maharashtra Government departmental decisions are final and legally binding.",
    },
    mr: {
      title: "उद्योग सहाय्यक | AI सहाय्यक",
      subtitle: "अधिकृत शासकीय नियमांवर आधारित मार्गदर्शन",
      placeholder: "परवानग्या, अनुदान किंवा नियमांबद्दल विचारा...",
      send: "पाठवा",
      chips: [
        "नवीन कारखान्यासाठी कोणत्या परवानग्या लागतात?",
        "MPCB लाल आणि केशरी वर्गवारीतील फरक काय?",
        "PSI 2019 अंतर्गत अनुदानाची पात्रता काय आहे?",
        "लोकसेवा हमी कायद्यानुसार मंजुरीची मुदत किती?"
      ],
      disclaimer: "केवळ माहितीसाठी. महाराष्ट्र शासनाच्या संबंधित विभागाचे निर्णय अंतिम राहतील.",
    },
    hi: {
      title: "उद्योग सहायक | AI सहायक",
      subtitle: "आधिकारिक नियमों पर आधारित मार्गदर्शन",
      placeholder: "अनुमति, सब्सिडी या नियमों के बारे में पूछें...",
      send: "भेजें",
      chips: [
        "कारखाने के लिए कौन सी अनुमतियां आवश्यक हैं?",
        "MPCB रेड और ऑरेंज श्रेणी में क्या अंतर है?",
        "क्या मैं PSI 2019 सब्सिडी के लिए पात्र हूं?",
        "सेवा अधिकार कानून के तहत निपटान की समय सीमा?"
      ],
      disclaimer: "केवल मार्गदर्शन के लिए। महाराष्ट्र सरकार के विभागीय निर्णय अंतिम होंगे।",
    }
  };

  function createChatDrawer() {
    if (document.getElementById("udyog-ai-chat-root")) return;

    const style = document.createElement("style");
    style.textContent = `
      .ai-chat-fab {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 9999;
        background: linear-gradient(135deg, #0b2545 0%, #134074 100%);
        color: #fff;
        border: 2px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 8px 24px rgba(11, 37, 69, 0.35);
        border-radius: 50px;
        padding: 12px 20px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 700;
        font-size: 0.95rem;
        cursor: pointer;
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s;
        font-family: inherit;
      }
      .ai-chat-fab:hover {
        transform: translateY(-3px) scale(1.02);
        box-shadow: 0 12px 28px rgba(11, 37, 69, 0.45);
      }
      .ai-chat-badge {
        background: #e63946;
        color: #fff;
        border-radius: 10px;
        padding: 2px 6px;
        font-size: 0.7rem;
        font-weight: 800;
      }
      .ai-chat-box {
        position: fixed;
        bottom: 90px;
        right: 24px;
        width: 390px;
        height: 560px;
        max-width: calc(100vw - 32px);
        max-height: calc(100vh - 120px);
        background: var(--surface-card, #ffffff);
        color: var(--ink, #0f172a);
        border: 1px solid var(--line, #e2e8f0);
        border-radius: 16px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
        display: none;
        flex-direction: column;
        z-index: 10000;
        overflow: hidden;
        animation: chatSlideUp 0.25s ease-out;
      }
      @keyframes chatSlideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .ai-chat-box.open { display: flex; }
      .ai-chat-header {
        background: linear-gradient(135deg, #0b2545 0%, #134074 100%);
        color: #fff;
        padding: 14px 18px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .ai-chat-title-group h4 {
        margin: 0;
        font-size: 1rem;
        font-weight: 700;
        letter-spacing: 0.3px;
        color: #ffffff;
      }
      .ai-chat-title-group span {
        font-size: 0.72rem;
        opacity: 0.85;
        color: rgba(255, 255, 255, 0.85);
      }
      .ai-chat-controls {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .ai-chat-lang-select {
        background: rgba(255, 255, 255, 0.2);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 6px;
        font-size: 0.75rem;
        padding: 4px 6px;
        cursor: pointer;
        outline: none;
      }
      .ai-chat-lang-select option {
        background: #0b2545;
        color: #fff;
      }
      .ai-chat-close {
        background: transparent;
        border: none;
        color: #fff;
        font-size: 1.3rem;
        cursor: pointer;
        padding: 0 4px;
        line-height: 1;
      }
      .ai-chat-messages {
        flex: 1;
        padding: 14px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: var(--surface-base, #f8fafc);
      }
      .ai-msg {
        max-width: 86%;
        padding: 10px 14px;
        border-radius: 12px;
        font-size: 0.88rem;
        line-height: 1.45;
        word-break: break-word;
      }
      .ai-msg.user {
        align-self: flex-end;
        background: #134074;
        color: #fff;
        border-bottom-right-radius: 2px;
      }
      .ai-msg.bot {
        align-self: flex-start;
        background: var(--surface-card, #ffffff);
        color: var(--ink, #1e293b);
        border: 1px solid var(--line, #e2e8f0);
        border-bottom-left-radius: 2px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
      }
      .ai-citation-box {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px dashed var(--line, #cbd5e1);
        font-size: 0.74rem;
        color: var(--ink-secondary, #475569);
      }
      .ai-citation-tag {
        display: inline-block;
        background: var(--info-bg, #e0f2fe);
        color: var(--info-ink, #0369a1);
        border: 1px solid var(--info-line, transparent);
        padding: 2px 6px;
        border-radius: 4px;
        margin-top: 3px;
        margin-right: 4px;
        font-weight: 600;
        text-decoration: none;
      }
      .ai-chat-chips {
        padding: 8px 12px;
        display: flex;
        gap: 6px;
        overflow-x: auto;
        background: var(--surface-card, #ffffff);
        border-top: 1px solid var(--line, #e2e8f0);
      }
      .ai-chip {
        white-space: nowrap;
        background: var(--surface-card-alt, #f1f5f9);
        color: var(--ink, #334155);
        border: 1px solid var(--line, #cbd5e1);
        border-radius: 20px;
        padding: 4px 10px;
        font-size: 0.72rem;
        cursor: pointer;
        transition: background 0.15s;
      }
      .ai-chip:hover {
        background: var(--line, #e2e8f0);
      }
      .ai-chat-input-row {
        padding: 10px 12px;
        background: var(--surface-card, #ffffff);
        display: flex;
        gap: 8px;
        border-top: 1px solid var(--line, #e2e8f0);
      }
      .ai-chat-input {
        flex: 1;
        background: var(--surface-card, #ffffff);
        color: var(--ink, #0f172a);
        border: 1px solid var(--line, #cbd5e1);
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 0.88rem;
        outline: none;
        font-family: inherit;
      }
      .ai-chat-input:focus {
        border-color: #134074;
      }
      .ai-chat-send {
        background: #134074;
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 0 14px;
        font-weight: 600;
        font-size: 0.85rem;
        cursor: pointer;
      }
      .ai-chat-disclaimer {
        font-size: 0.65rem;
        color: var(--ink-muted, #64748b);
        text-align: center;
        padding: 4px 8px 6px 8px;
        background: var(--surface-card-alt, #f8fafc);
        border-top: 1px solid var(--line, #f1f5f9);
      }
      [data-theme="dark"] .ai-msg.user {
        background: #1d4ed8;
        color: #ffffff;
      }
      [data-theme="dark"] .ai-chat-box {
        background: var(--surface-card);
        color: var(--ink);
        border-color: var(--line);
      }
      [data-theme="dark"] .ai-chat-messages {
        background: var(--surface-base);
      }
      @media (max-width: 768px) {
        .ai-chat-input {
          font-size: 16px !important;
        }
      }
    `;
    document.head.appendChild(style);

    const root = document.createElement("div");
    root.id = "udyog-ai-chat-root";
    root.innerHTML = `
      <div class="ai-chat-fab" id="aiChatFab" title="Open AI Statutory Assistant">
        <span>🤖</span>
        <span>AI Assistant | उद्योग सहाय्यक</span>
        <span class="ai-chat-badge">LIVE</span>
      </div>

      <div class="ai-chat-box" id="aiChatBox">
        <div class="ai-chat-header">
          <div class="ai-chat-title-group">
            <h4 id="aiChatHeaderTitle">उद्योग सहाय्यक | AI Assistant</h4>
            <span id="aiChatHeaderSub">Grounded Statutory Guidance</span>
          </div>
          <div class="ai-chat-controls">
            <select class="ai-chat-lang-select" id="aiChatLangSelect">
              <option value="en">EN</option>
              <option value="mr">मराठी</option>
              <option value="hi">हिन्दी</option>
            </select>
            <button class="ai-chat-close" id="aiChatClose" aria-label="Close Chat">×</button>
          </div>
        </div>

        <div class="ai-chat-messages" id="aiChatMessages">
          <div class="ai-msg bot" id="aiWelcomeMsg">
            <strong>Namaskar! / नमस्कार!</strong><br>
            I am your official Udyog Samyog AI copilot. Ask any question regarding clearances, MPCB categorization, MIDC zoning, DISH safety, Fire NOC, or statutory subsidies.
          </div>
        </div>

        <div class="ai-chat-chips" id="aiChatChips"></div>

        <div class="ai-chat-input-row">
          <input type="text" class="ai-chat-input" id="aiChatInput" placeholder="Ask about clearances, rules, or schemes..." />
          <button class="ai-chat-send" id="aiChatSend">Send</button>
        </div>

        <div class="ai-chat-disclaimer" id="aiChatDisclaimer">
          Guidance only. Maharashtra Government departmental decisions are final and legally binding.
        </div>
      </div>
    `;
    document.body.appendChild(root);

    // Event Bindings
    const fab = document.getElementById("aiChatFab");
    const box = document.getElementById("aiChatBox");
    const closeBtn = document.getElementById("aiChatClose");
    const sendBtn = document.getElementById("aiChatSend");
    const input = document.getElementById("aiChatInput");
    const langSelect = document.getElementById("aiChatLangSelect");

    fab.addEventListener("click", () => {
      box.classList.toggle("open");
      if (box.classList.contains("open")) {
        input.focus();
        renderChips();
      }
    });

    closeBtn.addEventListener("click", () => box.classList.remove("open"));

    langSelect.addEventListener("change", (e) => {
      chatLang = e.target.value;
      updateLanguageUI();
    });

    sendBtn.addEventListener("click", handleSend);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleSend();
    });

    renderChips();
  }

  function updateLanguageUI() {
    const i18n = CHAT_I18N[chatLang] || CHAT_I18N.en;
    document.getElementById("aiChatHeaderTitle").textContent = i18n.title;
    document.getElementById("aiChatHeaderSub").textContent = i18n.subtitle;
    document.getElementById("aiChatInput").placeholder = i18n.placeholder;
    document.getElementById("aiChatSend").textContent = i18n.send;
    document.getElementById("aiChatDisclaimer").textContent = i18n.disclaimer;
    renderChips();
  }

  function renderChips() {
    const container = document.getElementById("aiChatChips");
    if (!container) return;
    container.innerHTML = "";
    const i18n = CHAT_I18N[chatLang] || CHAT_I18N.en;
    i18n.chips.forEach((c) => {
      const chip = document.createElement("button");
      chip.className = "ai-chip";
      chip.textContent = c;
      chip.onclick = () => {
        document.getElementById("aiChatInput").value = c;
        handleSend();
      };
      container.appendChild(chip);
    });
  }

  async function handleSend() {
    const input = document.getElementById("aiChatInput");
    const text = input.value.trim();
    if (!text) return;
    input.value = "";

    appendMessage("user", text);

    // Bot Typing Indicator
    const typingMsg = appendMessage("bot", "Scrutinizing statutory policies... ⏳");
    const container = document.getElementById("aiChatMessages");

    try {
      const resp = await fetch("/api/ai/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversation_id: conversationId,
          language: chatLang,
        }),
      });

      if (!resp.ok || !resp.body || !resp.body.getReader) {
        throw new Error("Stream endpoint not ready or unsupported");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";
      let citations = [];
      let buffer = "";

      typingMsg.innerHTML = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep last partial line

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;

          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.token) {
              accumulatedText += parsed.token;
              typingMsg.innerHTML = formatBotReply(accumulatedText);
              if (container) container.scrollTop = container.scrollHeight;
            }
            if (parsed.citations) {
              citations = parsed.citations;
            }
          } catch (_) {}
        }
      }

      // Render citations if present
      let citationsHtml = "";
      if (citations && citations.length > 0) {
        citationsHtml = `<div class="ai-citation-box"><strong>Official Citations:</strong><br>`;
        citations.forEach((c) => {
          citationsHtml += `<a href="${c.url || '#'}" target="_blank" class="ai-citation-tag">📜 ${c.title}${c.section ? ' (' + c.section + ')' : ''}</a>`;
        });
        citationsHtml += `</div>`;
      }
      typingMsg.innerHTML = `${formatBotReply(accumulatedText)}${citationsHtml}`;
      if (container) container.scrollTop = container.scrollHeight;

    } catch (streamErr) {
      // Graceful fallback to standard JSON endpoint
      try {
        const resp = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            conversation_id: conversationId,
            language: chatLang,
          }),
        });
        const data = await resp.json();

        if (!resp.ok) {
          typingMsg.innerHTML = `<span style="color:#e63946;">⚠️ ${data.error || "Security check or service notification"}</span>`;
          return;
        }

        let citationsHtml = "";
        if (data.citations && data.citations.length > 0) {
          citationsHtml = `<div class="ai-citation-box"><strong>Official Citations:</strong><br>`;
          data.citations.forEach((c) => {
            citationsHtml += `<a href="${c.url || '#'}" target="_blank" class="ai-citation-tag">📜 ${c.title}${c.section ? ' (' + c.section + ')' : ''}</a>`;
          });
          citationsHtml += `</div>`;
        }

        typingMsg.innerHTML = `${formatBotReply(data.reply)}${citationsHtml}`;
      } catch (err) {
        typingMsg.innerHTML = `<span style="color:#e63946;">Could not connect to AI service. Operating in offline mode.</span>`;
      }
    }
  }

  function appendMessage(sender, content) {
    const container = document.getElementById("aiChatMessages");
    const msg = document.createElement("div");
    msg.className = `ai-msg ${sender}`;
    msg.innerHTML = content;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
    return msg;
  }

  function formatBotReply(text) {
    // Basic formatting for markdown bold and newlines
    let formatted = (text || "").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    formatted = formatted.replace(/\n\n/g, "<br><br>").replace(/\n/g, "<br>");
    return formatted;
  }

  // Auto-initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createChatDrawer);
  } else {
    createChatDrawer();
  }
})();

