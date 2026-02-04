# Cred AI - Compliance Intelligence Playground

An AI-powered playground for testing compliance automation capabilities before production implementation. Built with Next.js, Supabase, and Anthropic Claude.

**Note:** This is a playground application for internal testing and demonstration purposes. It uses a hybrid data approach: some tools connect to the Credentially API for live candidate data, while others use local Supabase seed data for experimentation.

## Features

### Chat Interface
- Streaming chat with Claude 4.5 models
- Tool calling with inline UI rendering
- Artifacts for code, documents, and data visualisation
- Model switching (Sonnet/Haiku)

### Agents Framework
- Four specialised agents: BLS Verification, Reference Check, Onboarding Companion, Inbound Email Responder
- Agent runner with step-by-step execution tracking
- Memory persistence across sessions
- Tool resolution and access control per agent

### AI Tools (25+)
- **Profile Management**: lookup, create, update candidate profiles
- **Compliance**: packages, status, document classification
- **Documents**: create, update, extract data, classify
- **Search**: knowledge base (Ragie), local candidates
- **Communication**: draft emails, initiate voice calls
- **Forms**: dynamic form generation
- **Web Automation**: browse and verify (Browserbase + Stagehand)
- **Tasks**: create and manage tasks
- **Memory**: agent memory persistence

### Candidates Management
- List view with filtering and search
- Profile detail pages
- Compliance status tracking
- Document management

### Voice Integration
- Vapi AI voice calling
- Call templates for different scenarios (reference checks, reminders)
- Session recording and playback
- Call status tracking

### Settings & Configuration
- Organisation settings
- User management and roles
- Compliance elements configuration
- Pipeline stages

### Tasks
- Task management dashboard
- Task creation from chat

### Reports
- Compliance reporting
- Analytics dashboards

### Search
- Global search
- Knowledge base search (Ragie)

### Data Model Visualisation
- ERD/schema explorer
- Interactive diagram

## Tech Stack

**Core**
- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **AI**: Anthropic Claude 4.5 via AI SDK 6
- **Database**: Supabase Postgres + Drizzle ORM (hybrid migrations)
- **Auth**: Supabase Auth (email/password)

**AI & Automation**
- **Voice**: Vapi AI (@vapi-ai/server-sdk)
- **Web Automation**: Browserbase + Stagehand
- **RAG/Search**: Ragie
- **Analytics**: PostHog

**UI & Editors**
- **Styling**: Tailwind CSS, shadcn/ui
- **Code Editor**: CodeMirror 6
- **Rich Text**: ProseMirror
- **Data Grid**: react-data-grid
- **Diagrams**: React Flow (@xyflow/react)
- **Charts**: Recharts

## Environment Setup

Create a `.env.local` file with the following variables:

```bash
# Supabase (Database & Auth)
DATABASE_URL="postgresql://user:password@host:6543/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# Credentially API (live candidate data)
CRED_API_URL="https://api.credentially.io"
CRED_API_KEY="your-cred-api-key"

# AI Provider - Anthropic (direct API)
ANTHROPIC_API_KEY="sk-ant-..."

# Voice - Vapi
VAPI_API_KEY="your-vapi-key"

# Web Automation - Browserbase
BROWSERBASE_API_KEY="your-browserbase-key"
BROWSERBASE_PROJECT_ID="your-project-id"

# RAG - Ragie
RAGIE_API_KEY="your-ragie-key"

# Email - Postmark
POSTMARK_API_KEY="your-postmark-key"
```

See `.env.example` for the complete list.

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- A Supabase account and project
- An Anthropic API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd cred-ai
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

4. **Apply database migrations**
   ```bash
   pnpm db:push
   ```

5. **Seed demo data**
   ```bash
   pnpm db:seed
   ```

6. **Start the development server**
   ```bash
   pnpm dev
   ```

Your app should now be running on [localhost:3000](http://localhost:3000).

## Database Management

The project uses a **hybrid migration approach**:

| Tool | Purpose |
|------|---------|
| **Drizzle ORM** | Schema definitions, type-safe queries |
| **Drizzle Kit** | Generate SQL migrations from schema |
| **Supabase CLI** | Apply migrations to database |

**Why hybrid?** Drizzle Kit has a [known bug](https://github.com/drizzle-team/drizzle-orm/issues/4632) when introspecting Supabase databases (fails on auth schema). We use Drizzle Kit for migration *generation* (no introspection needed) and Supabase CLI for *application* (just runs SQL).

### Workflow

```bash
# 1. Edit schema in lib/db/schema/
# 2. Generate SQL migration
pnpm db:generate

# 3. Apply to database
pnpm db:push

# Browse data
pnpm db:studio

# Seed demo data
pnpm db:seed

# Clear all data
pnpm db:clear
```

See `lib/db/CLAUDE.md` for detailed workflow.

## AI Models

This project uses Claude 4.5 models via direct Anthropic API integration:

- **Chat Model**: `claude-sonnet-4-5` - Primary conversational model with tool support
- **Reasoning Model**: `claude-sonnet-4-5` - Extended thinking for complex problems
- **Title Model**: `claude-haiku-4-5` - Fast model for generating chat titles

Models are configured in `lib/ai/providers.ts` and can be switched in the UI.

## Project Structure

```
├── app/
│   ├── (app)/              # Main application routes
│   │   ├── agents/         # Agent execution UI
│   │   ├── candidates/     # Candidate list and profiles
│   │   ├── chat/           # Chat interface
│   │   ├── data-model/     # ERD visualisation
│   │   ├── reports/        # Compliance reports
│   │   ├── search/         # Search interface
│   │   ├── settings/       # Org and user settings
│   │   ├── tasks/          # Task management
│   │   └── voice/          # Voice call interface
│   ├── (public)/           # Public routes (landing)
│   ├── api/                # API routes
│   └── auth/               # Auth callbacks
├── components/             # React components
├── lib/
│   ├── ai/
│   │   ├── agents/         # Agent definitions and runner
│   │   ├── tools/          # 25+ AI tools
│   │   └── prompts.ts      # System prompts
│   ├── db/                 # Drizzle schema and queries
│   ├── ragie/              # Ragie RAG client
│   ├── supabase/           # Supabase client utilities
│   └── voice/              # Vapi voice integration
├── hooks/                  # Custom React hooks
└── docs/                   # Architecture and design docs
```

## Authentication

The app uses Supabase email/password authentication:

- Users must sign up with email and password to access the application
- Unauthenticated users are redirected to the login page
- User sessions are managed via SSR-safe Supabase client
- User data is automatically synced from Supabase auth to the app's User table

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is open source and available under the MIT License.
