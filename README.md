# C1 AI Agent - Generative UI

A production-ready conversational AI agent with C1 Generative UI capabilities and multi-provider LLM support.

## Features

### Core Features
- **Multi-Provider LLM Support**: OpenAI, Google Gemini, Kimi K2 (Moonshot AI), and Qwen (Alibaba)
- **Automatic Fallback Chain**: Primary → OpenAI, Fallbacks: Gemini → Kimi → Qwen
- **C1 Generative UI Integration**: Render interactive components and artifacts
- **Artifact System**: Code, documents, diagrams, React components, charts, images, and SQL
- **Real-time Streaming**: Smooth streaming responses with loading states
- **Inline Editing**: Edit artifacts with syntax highlighting
- **Dark Mode**: Beautiful glassmorphism design with dark theme
- **State Persistence**: Conversation history saved locally
- **Production-Ready**: Error handling, retry logic, and health checks

### Advanced Features ✨
- **Voice Input**: Record audio and transcribe with OpenAI Whisper API
- **PDF Export**: Export artifacts to beautifully formatted PDFs
- **CodeSandbox Integration**: Open code artifacts directly in CodeSandbox
- **GitHub Gist Publishing**: Publish artifacts as GitHub Gists
- **Image Generation**: Create images with DALL-E 3 integration
- **Rate Limiting**: Upstash Redis-based rate limiting for production use
- **Analytics Dashboard**: Track usage, costs, and performance metrics
- **Cost Estimation**: Real-time cost tracking for all LLM providers
- **Export Options**: Download, share, copy, PDF, Gist, or CodeSandbox

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **UI Components**: shadcn/ui
- **LLM Integration**: OpenAI SDK, AI SDK
- **Code Highlighting**: react-syntax-highlighter
- **Markdown**: react-markdown

## Project Structure

```
/app
  /api
    /chat              # Main chat endpoint with streaming
  /page.tsx            # Main application page
  /layout.tsx          # Root layout with metadata
  /globals.css         # Global styles and dark mode theme

/components
  /chat
    /chat-interface.tsx    # Main chat UI component
    /chat-input.tsx        # Message input with auto-resize
    /message-bubble.tsx    # Message display with markdown
  /artifacts
    /artifact-viewer.tsx   # Artifact viewer/editor
    /artifact-panel.tsx    # Artifact list panel
  /providers
    /provider-selector.tsx # Provider dropdown selector
  /ui                      # shadcn/ui components

/lib
  /providers
    /config.ts         # Provider configurations and routing
  /c1
    /client.ts         # C1 API client and utilities
  /store.ts            # Zustand store for state management
  /types.ts            # TypeScript type definitions
  /utils
    /cn.ts             # Tailwind className utility
```

## Getting Started

### 1. Clone and Install

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# C1 API Configuration (optional)
THESYS_API_KEY=your_thesys_api_key_here

# Provider API Keys (at least one required)
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_API_KEY=your_google_api_key_here
KIMI_API_KEY=your_kimi_api_key_here
QWEN_API_KEY=your_qwen_api_key_here

# Optional: Set primary provider (default: openai)
PRIMARY_PROVIDER=openai
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### 4. Build for Production

```bash
npm run build
npm start
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Environment Variables in Vercel

Add the following environment variables in your Vercel project settings:

- `OPENAI_API_KEY`
- `GOOGLE_API_KEY` (optional)
- `KIMI_API_KEY` (optional)
- `QWEN_API_KEY` (optional)
- `THESYS_API_KEY` (optional)
- `PRIMARY_PROVIDER` (optional, default: openai)

## Usage

### Starting a Conversation

1. Type your message in the input field
2. Press Enter or click the Send button
3. AI will respond with streaming text
4. Artifacts (code, diagrams) appear in the sidebar

### Artifact Features

- **View**: Click any artifact to view it in full
- **Edit**: Click the edit icon to modify content
- **Copy**: Copy artifact content to clipboard
- **Download**: Save artifact as a file
- **Share**: Use native share API (mobile) or copy

### Switching Providers

1. Click the provider selector in the header
2. Choose your preferred provider
3. The system automatically falls back if the primary provider fails

### Supported Artifact Types

- **Code**: JavaScript, Python, TypeScript, Go, Rust, etc.
- **Markdown**: Documentation and formatted text
- **Mermaid**: Diagrams and flowcharts
- **React**: JSX/TSX components
- **HTML**: Web components
- **Charts**: Data visualizations

## API Routes

### POST `/api/chat`

Chat endpoint with streaming support.

**Request Body:**
```json
{
  "messages": [
    { "role": "user", "content": "Hello" }
  ],
  "provider": "openai",
  "temperature": 0.7,
  "maxTokens": 4096
}
```

**Response:**
Streaming text response with Server-Sent Events (SSE).

**Response Headers:**
- `X-Provider-Used`: The provider that successfully handled the request

## Development

### Adding a New Provider

1. Update `lib/types.ts` to add the provider type
2. Add configuration in `lib/providers/config.ts`
3. Add environment variable in `.env.example`
4. Update fallback order if needed

### Customizing UI

- **Colors**: Modify `tailwind.config.ts` and `app/globals.css`
- **Components**: All UI components are in `components/ui/`
- **Layout**: Adjust `app/page.tsx` for main layout changes

## Performance

- **Edge Runtime**: API routes use Edge runtime for optimal streaming
- **Lazy Loading**: Components are client-side rendered when needed
- **Code Splitting**: Automatic code splitting with Next.js
- **Caching**: Conversation history cached in localStorage

## Error Handling

- **Provider Fallback**: Automatically tries alternative providers
- **Retry Logic**: Built-in retry for transient failures
- **User Feedback**: Clear error messages in the UI
- **Logging**: Console logs for debugging

## Security

- **API Keys**: All keys stored in environment variables
- **Edge Runtime**: Secure execution environment
- **No Client Exposure**: API keys never sent to client
- **Input Validation**: All inputs validated before processing

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Support

For issues and questions, please open a GitHub issue.
