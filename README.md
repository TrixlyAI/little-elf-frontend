# 🧝 Little Elf – AI Page Assistant

A Chrome extension that lets you chat with any webpage using AI. Extract page content, ask questions, and get intelligent answers powered by OpenAI’s Assistant API with RAG (Retrieval-Augmented Generation).

<p align="center">
  <img src="assets/icon128.png" alt="Little Elf Logo" width="128">
</p>

---

## ✨ Features

* **🗣️ Chat with any page**
  Ask questions about the content you are viewing

* **📄 Smart extraction**
  Automatically extracts clean, readable content from web pages

* **🤖 AI-powered answers**
  Uses OpenAI Assistant API with `file_search` for accurate responses

* **💾 Session persistence**
  Continue conversations where you left off

* **🌙 Dark mode**
  Automatically matches system theme preferences

* **⌨️ Keyboard shortcuts**
  Quick access using `Ctrl + Shift + L`

* **📤 Export chats**
  Download conversations as Markdown files

* **🔒 Privacy-focused**
  Your data stays in your browser and your own backend

---

## 📦 Project Structure

```text
little-elf/
├── manifest.json              # Extension manifest (v3)
├── popup/
│   ├── popup.html             # Quick actions popup
│   ├── popup.js               # Popup logic
│   └── popup.css              # Popup styles
├── sidepanel/
│   ├── sidepanel.html         # Chat interface
│   ├── sidepanel.js           # Chat logic with API integration
│   └── sidepanel.css          # Modern chat UI styles
├── content/
│   └── content.js             # Page content extraction
├── background/
│   └── background.js          # Service worker
├── assets/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── backend/                   # Next.js API (deploy separately)
│   ├── src/
│   │   ├── app/api/           # API routes
│   │   ├── lib/               # Utilities
│   │   └── models/            # MongoDB schemas
│   └── package.json
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

* Chrome browser version 116+
* Node.js 18+
* MongoDB (local or Atlas)
* OpenAI API key

---

## 🔧 Step 1: Setup Backend

1. Navigate to backend directory

   ```bash
   cd backend
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Create environment file

   ```bash
   cp .env.example .env.local
   ```

4. Edit `.env.local`

   ```env
   MONGODB_URI=mongodb://localhost:27017/little-elf
   OPENAI_API_KEY=sk-your-openai-api-key-here
   ```

5. Start backend

   ```bash
   npm run dev
   ```

6. Verify backend

   ```bash
   curl http://localhost:3000/api/health
   ```

---

## 🧩 Step 2: Install Chrome Extension

1. Open Chrome Extensions

   * Go to `chrome://extensions/`
   * Enable **Developer mode**

2. Load the extension

   * Click **Load unpacked**
   * Select the `little-elf` folder (not the backend)

3. Pin the extension

   * Click the puzzle icon
   * Pin **Little Elf**

---

## 💬 Step 3: Start Chatting

1. Open any webpage
2. Click the Little Elf icon or press `Ctrl + Shift + L`
3. Open **Chat with Page**
4. Ask questions about the page content

---

## 🎯 Usage Guide

### Opening the Chat

| Method       | Action                                 |
| ------------ | -------------------------------------- |
| Popup        | Click extension icon → Chat with Page  |
| Keyboard     | `Ctrl + Shift + L` / `Cmd + Shift + L` |
| Context Menu | Right-click → Little Elf               |

---

### Quick Actions

* 📄 Summarize Page
* 📌 Extract Key Points
* 💡 Explain Simply

---

### Chat Features

| Feature         | How to Use                    |
| --------------- | ----------------------------- |
| Ask Questions   | Type and press Enter          |
| Copy Messages   | Hover and click Copy          |
| Export Chat     | Settings → Export as Markdown |
| Clear Chat      | Settings → Clear Conversation |
| Refresh Context | Click refresh icon            |
| Change API URL  | Settings → Backend URL        |

---

## ⚙️ Configuration

### Extension Settings

* API Endpoint (default `http://localhost:3000`)
* Enable or disable extension

---

### Backend Environment Variables

| Variable             | Description               | Required |
| -------------------- | ------------------------- | -------- |
| MONGODB_URI          | MongoDB connection string | Yes      |
| OPENAI_API_KEY       | OpenAI API key            | Yes      |
| NEXT_PUBLIC_API_URL  | Public API URL            | No       |
| CORS_ALLOWED_ORIGINS | Allowed origins           | No       |

---

## 🛠️ Development

### Local Development

1. Start MongoDB

   ```bash
   mongod
   ```

2. Start backend

   ```bash
   cd backend && npm run dev
   ```

3. Reload extension after changes

---

### API Testing

```bash
curl http://localhost:3000/api/health
```

```bash
curl -X POST http://localhost:3000/api/content/store \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","title":"Test","content":"Hello world"}'
```

```bash
curl -X POST http://localhost:3000/api/assistant/create \
  -H "Content-Type: application/json" \
  -d '{"contentId":"YOUR_CONTENT_ID"}'
```

---

## 🚀 Deployment

### Backend (Vercel)

1. Push backend to GitHub
2. Import into Vercel
3. Add environment variables
4. Deploy

---

### Chrome Web Store

```bash
zip -r little-elf.zip \
  manifest.json \
  popup/ \
  sidepanel/ \
  content/ \
  background/ \
  assets/ \
  -x "*.DS_Store" -x "*__MACOSX*"
```

---

### Publishing Checklist

* Icons sized correctly
* Manifest v3
* Permissions justified
* Backend live
* Production API tested
* Privacy policy ready

---

## 🛡️ Privacy & Security

* Local storage only
* API keys never in extension
* Backend fully user-controlled
* OpenAI used only for processing

---

## 🐛 Troubleshooting

| Issue                 | Solution                            |
| --------------------- | ----------------------------------- |
| Page not accessible   | Chrome internal pages not supported |
| Backend error         | Check API URL                       |
| Assistant not created | Verify OpenAI key                   |
| Sidepanel issue       | Use keyboard shortcut               |

---

## 📄 License

MIT License

---

## 🙏 Credits

* Next.js
* OpenAI
* MongoDB

---

**Made with 🧝 by Little Elf**
