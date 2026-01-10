# 🧝 Little Elf - AI Page Assistant

A Chrome extension that lets you chat with any webpage using AI. Extract page content, ask questions, and get intelligent answers powered by OpenAI's Assistant API with RAG (Retrieval-Augmented Generation).

<p align="center">
  <img src="assets/icon128.png" alt="Little Elf Logo" width="128">
</p>

## ✨ Features

- **🗣️ Chat with any page** - Ask questions about the content you're viewing
- **📄 Smart extraction** - Automatically extracts clean content from web pages
- **🤖 AI-powered answers** - Uses OpenAI's Assistant API with file_search for accurate responses
- **💾 Session persistence** - Continue conversations where you left off
- **🌙 Dark mode** - Automatic theme matching with system preferences
- **⌨️ Keyboard shortcuts** - Quick access with Ctrl+Shift+L
- **📤 Export chats** - Download conversations as Markdown
- **🔒 Privacy-focused** - Your data stays in your browser and your own backend

## 📦 Project Structure

```
little-elf/
├── manifest.json              # Extension manifest (v3)
├── popup/
│   ├── popup.html            # Quick actions popup
│   ├── popup.js              # Popup logic
│   └── popup.css             # Popup styles
├── sidepanel/
│   ├── sidepanel.html        # Chat interface
│   ├── sidepanel.js          # Chat logic with API integration
│   └── sidepanel.css         # Modern chat UI styles
├── content/
│   └── content.js            # Page content extraction
├── background/
│   └── background.js         # Service worker
├── assets/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── backend/                   # Next.js API (deploy separately)
│   ├── src/
│   │   ├── app/api/          # API routes
│   │   ├── lib/              # Utilities
│   │   └── models/           # MongoDB schemas
│   └── package.json
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Chrome browser (version 116+)
- Node.js 18+ (for backend)
- MongoDB (local or Atlas)
- OpenAI API key

### Step 1: Setup Backend

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env.local
   ```

4. **Edit `.env.local` with your credentials:**
   ```env
   MONGODB_URI=mongodb://localhost:27017/little-elf
   OPENAI_API_KEY=sk-your-openai-api-key-here
   ```

5. **Start the backend:**
   ```bash
   npm run dev
   ```

6. **Verify it's working:**
   ```bash
   curl http://localhost:3000/api/health
   ```

### Step 2: Install Chrome Extension

1. **Open Chrome Extensions:**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)

2. **Load the extension:**
   - Click "Load unpacked"
   - Select the `little-elf` folder (NOT the backend folder)
   - Click "Select Folder"

3. **Pin the extension:**
   - Click the puzzle icon in Chrome toolbar
   - Pin "Little Elf" for easy access

### Step 3: Start Chatting!

1. Navigate to any webpage
2. Click the Little Elf icon or press `Ctrl+Shift+L`
3. Click "Chat with Page" to open the sidepanel
4. Start asking questions about the page!

## 🎯 Usage Guide

### Opening the Chat

| Method | Action |
|--------|--------|
| **Popup** | Click extension icon → "Chat with Page" |
| **Keyboard** | `Ctrl+Shift+L` (Windows/Linux) or `Cmd+Shift+L` (Mac) |
| **Context Menu** | Right-click → "Little Elf" (if enabled) |

### Quick Actions

The sidepanel includes quick action buttons:
- 📄 **Summarize Page** - Get a quick summary
- 📌 **Key Points** - Extract main points
- 💡 **Explain Simply** - Get a simple explanation

### Features

| Feature | How to Use |
|---------|------------|
| **Ask Questions** | Type in the chat input and press Enter |
| **Copy Messages** | Hover over a message and click "Copy" |
| **Export Chat** | Settings → "Export as Markdown" |
| **Clear Conversation** | Settings → "Clear Conversation" |
| **Refresh Context** | Click the refresh button to re-extract page |
| **Change API URL** | Settings → Enter your backend URL |

## ⚙️ Configuration

### Extension Settings

Open the popup and click "Settings" to configure:

- **API Endpoint**: Your backend URL (default: `http://localhost:3000`)
- **Enable/Disable**: Toggle the extension on/off

### Backend Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | ✅ |
| `OPENAI_API_KEY` | OpenAI API key | ✅ |
| `NEXT_PUBLIC_API_URL` | Public API URL | ❌ |
| `CORS_ALLOWED_ORIGINS` | Allowed origins | ❌ |

## 🔧 Development

### Running Locally

1. **Start MongoDB:**
   ```bash
   mongod
   ```

2. **Start backend:**
   ```bash
   cd backend && npm run dev
   ```

3. **Load extension in Chrome:**
   - Go to `chrome://extensions/`
   - Click "Load unpacked"
   - Select project folder

4. **Make changes:**
   - Edit files
   - Click "Reload" on extension card (or press `Ctrl+R` on the extension page)

### Testing

**Test the API:**
```bash
# Health check
curl http://localhost:3000/api/health

# Store content
curl -X POST http://localhost:3000/api/content/store \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","title":"Test","content":"Hello world"}'

# Create assistant
curl -X POST http://localhost:3000/api/assistant/create \
  -H "Content-Type: application/json" \
  -d '{"contentId":"YOUR_CONTENT_ID"}'
```

## 🚀 Deployment

### Backend Deployment (Vercel)

1. Push backend to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

### Chrome Web Store

1. **Create ZIP:**
   ```bash
   # Include only extension files (NOT backend)
   zip -r little-elf.zip \
     manifest.json \
     popup/ \
     sidepanel/ \
     content/ \
     background/ \
     assets/ \
     -x "*.DS_Store" -x "*__MACOSX*"
   ```

2. **Prepare listing:**
   - Screenshots (1280x800 or 640x400)
   - Promotional images
   - Description

3. **Submit:**
   - Go to [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - Pay $5 registration fee (one-time)
   - Upload ZIP
   - Fill in listing details
   - Submit for review

### Checklist for Publishing

- [ ] Icons are correct sizes (16x16, 48x48, 128x128)
- [ ] Manifest version is 3
- [ ] All permissions are justified
- [ ] Privacy policy URL (if needed)
- [ ] Backend is deployed and accessible
- [ ] Extension works with production API URL
- [ ] Tested on multiple websites

## 🛡️ Privacy & Security

- **Local Storage**: Extension data is stored locally in Chrome
- **API Keys**: Never stored in extension code
- **Backend**: You control your own backend and data
- **OpenAI**: Content is sent to OpenAI for processing

## 🐛 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "Cannot access this page" | Chrome internal pages (chrome://) are not supported |
| "Failed to initialize" | Make sure backend is running at the configured URL |
| "No assistant created" | Check OpenAI API key in backend .env.local |
| Sidepanel doesn't open | Try the keyboard shortcut Ctrl+Shift+L |

### Debug Mode

1. Open Chrome DevTools (F12)
2. Go to "Console" tab
3. Filter by "Little Elf" to see extension logs

### Backend Logs

Check the terminal running `npm run dev` for API logs.

## 📄 License

MIT License - See LICENSE file for details.

## 🙏 Credits

- Built with [Next.js](https://nextjs.org/)
- AI powered by [OpenAI](https://openai.com/)
- Database by [MongoDB](https://www.mongodb.com/)

---

Made with 🧝 by Trixly AI Solutions
#   l i t t l e - e l f - f r o n t e n d 
 
 
