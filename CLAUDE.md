# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a NextJS starter application built on top of the OpenAI Responses API (gpt-4.1-nano-2025-04-14). It implements a conversational AI assistant with streaming capabilities, function calling, web search, and file search functionality.

## Development Commands

### Core Commands
```bash
npm run dev        # Start development server on localhost:3000
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
npm run deploy     # Deploy with Wrangler (Cloudflare)
```

### Development Workflow
- Always run `npm run lint` after making code changes
- Test the streaming functionality by interacting with the chat interface
- Use the tools panel to configure web search and file search capabilities

## Architecture Overview

### Key Architecture Patterns
- **State Management**: Uses Zustand for conversation and tools state
- **Streaming**: Server-Sent Events (SSE) for real-time response streaming
- **Function Calling**: Modular function system with strict typing
- **Tool Integration**: Built-in web search and file search through OpenAI tools

### Directory Structure
```
app/
├── api/                    # API routes for OpenAI integration
│   ├── turn_response/      # Main streaming endpoint
│   ├── functions/          # Custom function endpoints
│   └── vector_stores/      # File search functionality
components/                 # React components
├── ui/                     # Reusable UI components (shadcn/ui)
├── assistant.tsx           # Main chat interface
├── tools-panel.tsx         # Tools configuration panel
└── ...
config/                     # Configuration files
├── constants.ts            # Model and prompt configuration
├── functions.ts            # Function implementations
└── tools-list.ts           # Function definitions
lib/
├── assistant.ts            # Core conversation logic
├── tools/                  # Tool handling utilities
└── utils.ts                # Utilities
stores/                     # Zustand state management
├── useConversationStore.ts # Chat state
└── useToolsStore.ts        # Tools configuration state
```

### Core Components

#### State Flow
1. **Conversation State** (`useConversationStore`): Manages chat messages and conversation items
2. **Tools State** (`useToolsStore`): Manages web search, file search, and function calling configurations
3. **Streaming Handler** (`lib/assistant.ts`): Processes SSE events and updates state

#### Function Calling System
- **Function Definitions**: `config/tools-list.ts` - JSON schema definitions
- **Function Implementations**: `config/functions.ts` - Actual function code
- **Function Routing**: API routes in `app/api/functions/` handle execution
- **Tool Handling**: `lib/tools/tools-handling.ts` orchestrates function calls

#### Streaming Architecture
- **Client**: `handleTurn()` in `lib/assistant.ts` manages SSE connection
- **Server**: `app/api/turn_response/route.ts` streams OpenAI responses
- **Event Types**: Handles text deltas, function calls, tool outputs, and annotations

### Key Technical Details

#### OpenAI Responses API Integration
- Uses `openai.responses.create()` with streaming enabled
- Supports parallel tool calls (disabled by default for gpt-4.1-nano)
- Implements strict mode for function calling
- Handles web search and file search tools

#### Function Calling Pattern
1. Define function schema in `config/tools-list.ts`
2. Implement function in `config/functions.ts`
3. Add API route in `app/api/functions/[function_name]/route.ts`
4. Function automatically available when `functionsEnabled` is true

#### Vector Store/File Search
- Manage vector stores through `app/api/vector_stores/` endpoints
- Upload files for searchable knowledge base
- Configure through tools panel interface

### Environment Variables
```bash
OPENAI_API_KEY=your_api_key_here
```

### Important Implementation Notes

#### Streaming Event Handling
The app handles multiple SSE event types:
- `response.output_text.delta` - Text streaming
- `response.function_call_arguments.delta` - Function argument streaming
- `response.output_item.added` - New items (messages, function calls, tool calls)
- `response.output_item.done` - Completed items
- Tool completion events for web/file search

#### State Management Pattern
- Separate `chatMessages` (UI display) from `conversationItems` (API communication)
- Real-time updates during streaming
- Automatic function execution and result incorporation

#### Adding New Functions
1. Add schema to `toolsList` in `config/tools-list.ts`
2. Implement function in `functionsMap` in `config/functions.ts`
3. Create API route following existing pattern
4. Function will be automatically included when functions are enabled

### UI Framework
- **Styling**: Tailwind CSS with custom configuration
- **Components**: Radix UI primitives with shadcn/ui patterns
- **Icons**: Lucide React
- **Typography**: Geist Sans and Geist Mono fonts

### Deployment
- Supports Cloudflare Workers deployment via Wrangler
- Uses `@cloudflare/workers-types` for type support
- Build artifacts optimized for edge deployment