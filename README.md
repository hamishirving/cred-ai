# Cred AI - Employee Management Chatbot

An AI-powered chatbot for employee data management, built with Next.js, Supabase, and Anthropic Claude.

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
  - Anonymous authentication for instant access
  - SSR-ready auth with automatic session management

- **Drizzle ORM**
  - Type-safe database queries
  - Automated migrations
  - Full control over database schema

- **Credentially API Integration**
  - Employee profile lookup and management
  - Document retrieval
  - Organization metadata access

- **shadcn/ui Components**
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com)

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Database**: Supabase Postgres + Drizzle ORM
- **Authentication**: Supabase Auth (anonymous sign-ins)
- **AI Provider**: Anthropic Claude 4.5 (direct API)
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

4. **Enable anonymous auth in Supabase**
   - Go to your Supabase dashboard
   - Navigate to **Authentication** → **Providers**
   - Enable **Anonymous Users**

5. **Run database migrations**
   ```bash
   pnpm db:migrate
   ```

6. **Start the development server**
   ```bash
   pnpm dev
   ```

Your app should now be running on [localhost:3000](http://localhost:3000).

## Database Management

The project uses Drizzle ORM for database operations:

```bash
# Generate new migration
pnpm db:generate

# Run migrations
pnpm db:migrate

# Open Drizzle Studio (GUI)
pnpm db:studio

# Push schema changes (dev only)
pnpm db:push
```

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

The app uses Supabase anonymous authentication:

- Users are automatically signed in anonymously on first visit
- Anonymous users get full functionality without registration
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
