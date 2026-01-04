# Cred AI - Employee Management Chatbot

An AI-powered chatbot for employee data management, built with Next.js, Supabase, and Anthropic Claude.

**Note:** This is a playground application for internal testing and demonstration purposes.

## Features

- **Next.js App Router**
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions for server-side rendering

- **AI SDK 6**
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat and generative user interfaces
  - Direct Anthropic integration with Claude 4.5 models

- **Supabase Backend**
  - PostgreSQL database with connection pooling
  - Email/password authentication
  - SSR-ready auth with automatic session management

- **Drizzle ORM + Hybrid Migrations**
  - Type-safe database queries with full schema inference
  - Drizzle Kit generates SQL migrations from schema changes
  - Supabase CLI applies migrations (avoids [drizzle-kit introspection bug](https://github.com/drizzle-team/drizzle-orm/issues/4632))

- **Credentially API Integration**
  - Employee profile lookup and management
  - Document retrieval
  - Organization metadata access

- **PostHog Analytics**
  - User behaviour tracking and event analytics
  - Session recording and error capturing
  - Reverse proxy for reliable data collection

- **shadcn/ui Components**
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com)

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Database**: Supabase Postgres + Drizzle ORM (hybrid migrations)
- **Authentication**: Supabase Auth (email/password)
- **AI Provider**: Anthropic Claude 4.5 (direct API)
- **Analytics**: PostHog (client + server-side)
- **Styling**: Tailwind CSS, shadcn/ui
- **External API**: Credentially Public API v2.0.0

## Environment Setup

Create a `.env.local` file with the following variables:

```bash
# Supabase (Database & Auth)
DATABASE_URL="postgresql://user:password@host:6543/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# AI Provider - Anthropic (direct API)
ANTHROPIC_API_KEY="sk-ant-..."

# Credentially Public API v2.0.0
CREDENTIALLY_API_URL="https://dev-eu-london.drfocused.com/gateway"
CREDENTIALLY_API_KEY="your-api-key"
CREDENTIALLY_ORG_ID="your-org-id"
```

See `.env.example` for more details.

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- A Supabase account and project
- An Anthropic API key
- Credentially API credentials

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

5. **Start the development server**
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
```

See `lib/db/CLAUDE.md` for detailed workflow.

## AI Models

This project uses Claude 4.5 models via direct Anthropic API integration:

- **Chat Model**: `claude-sonnet-4-5` - Primary conversational model with tool support
- **Reasoning Model**: `claude-sonnet-4-5` - Extended thinking for complex problems
- **Title Model**: `claude-haiku-4-5` - Fast model for generating chat titles

Models are configured in `lib/ai/providers.ts` and can be switched in the UI.

## Credentially API Tools

The chatbot includes specialized tools for employee management:

- **Profile Lookup** (`lookupProfile`) - Search employees by email or ID
- **Document Retrieval** (`getDocuments`) - Fetch employee documents
- **Organization Metadata** (`getMetadata`) - Get custom field schemas
- **Profile Management** (`manageProfile`) - Create and update employee profiles

Tools are defined in `lib/ai/tools/` and registered in `app/(chat)/api/chat/route.ts`.

## Authentication

The app uses Supabase email/password authentication:

- Users must sign up with email and password to access the application
- Unauthenticated users are redirected to the login page
- User sessions are managed via SSR-safe Supabase client
- User data is automatically synced from Supabase auth to the app's User table

## Project Structure

```
├── app/
│   ├── (auth)/          # Authentication logic
│   ├── (chat)/          # Chat interface and API routes
│   └── layout.tsx       # Root layout with providers
├── components/          # React components
├── lib/
│   ├── ai/             # AI SDK configuration and tools
│   ├── api/            # Credentially API client
│   ├── db/             # Drizzle schema and queries
│   └── supabase/       # Supabase client utilities
└── hooks/              # Custom React hooks
```

## Known Limitations

- File uploads are temporarily disabled
- No Redis caching (removed for simplicity)

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is open source and available under the MIT License.
