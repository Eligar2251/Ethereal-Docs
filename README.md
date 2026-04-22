```markdown
# Ethereal Docs

Premium minimalist document editor with GitHub Flavored Markdown, live preview, and cloud sync.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Auth+%20DB-green?style=flat-square&logo=supabase)
![Framer Motion](https://img.shields.io/badge/Framer%20Motion-12-red?style=flat-square)

---

## What is Ethereal Docs

A distraction-free writing environment for Markdown. Clean editor, instant preview, and automatic cloud save — no noise, no clutter.

Think of it as **Notion meets iA Writer**, but lighter, faster, and fully yours.

---

## Features

### Editor

- **CodeMirror 6** editor with full syntax highlighting for Markdown
- **GitHub Flavored Markdown** support:
  - Headings (`#`, `##`, `###`)
  - Bold, italic, strikethrough
  - Task checkboxes (`- [ ]` / `- [x]`)
  - Tables with GFM pipe syntax
  - Code blocks with fenced syntax
  - Blockquotes, horizontal rules
  - Inline links and images

### Preview

- Live rendered Markdown preview via `react-markdown` + `remark-gfm`
- Serif typography for headings
- Styled blockquotes, tables, code blocks
- Syntax-highlighted code via Shiki

### Editor Modes

- **Write** — full-width editor for raw Markdown
- **Split** — editor on the left, live preview on the right
- **Preview** — full-width rendered document view

### Document Management

- Create, rename, and delete documents
- Sidebar with document list sorted by last modified
- Real-time search/filter across document titles and content
- Soft delete with trash recovery

### Auto-Save

- 2-second debounce after last keystroke
- Save indicator with spring animation (Saving… → Saved)
- Never loses data — every change is queued

### Appearance

- **Themes**: Light, Dark, Sepia — per-document setting
- **Font styles**: Serif (Garamond) or Sans-serif (Geist) — switchable
- **Focus Mode**: UI fades out while typing, returns on mouse move
- Settings saved to Supabase per user

### Export

- **Export to Word (.docx)** — one click download
- Preserves document structure:
  - Title, headings hierarchy
  - Bold, italic, strikethrough
  - Blockquotes with left border styling
  - Code blocks with Courier New monospace
  - Task lists with checkbox symbols
  - Tables with header styling
  - Ordered and unordered lists
  - Horizontal rules

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + \` | Toggle sidebar |
| `Ctrl + Z` / `Y` | Undo / Redo |

### Performance

- Code-split heavy components (`Editor`, `MarkdownPreview`, `SettingsPanel`) with `dynamic()`
- `useDeferredValue` prevents preview from blocking editor input
- All animations use `transform` and `opacity` only — 60 FPS guaranteed
- Skeleton loading screens instead of spinners
- Responsive design for mobile screens

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| Editor | CodeMirror 6 |
| Markdown | react-markdown + remark-gfm |
| Backend | Supabase (PostgreSQL + Auth + Row Level Security) |
| Animations | Framer Motion |
| Icons | Lucide React |
| Export | docx.js |
| Styling | CSS Modules + Tailwind (utilities only) |

---

## Prerequisites

- Node.js ≥ 18.18 (20.x LTS recommended)
- pnpm ≥ 9
- A [Supabase](https://supabase.com) account

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/ethereal-docs.git
cd ethereal-docs
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Create a Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Open **SQL Editor** → **New Query**
4. Paste the full SQL script from `supabase/schema.sql` and run it

### 4. Environment variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Find these values in your Supabase dashboard under **Settings → API**.

### 5. Start the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Database Schema

### `documents`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner (references `auth.users`) |
| `title` | TEXT | Document title |
| `content` | TEXT | Raw Markdown content |
| `settings` | JSONB | Theme, font, editor mode, focus mode |
| `is_deleted` | BOOLEAN | Soft delete flag |
| `deleted_at` | TIMESTAMPTZ | When soft-deleted |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last modification (auto-updated) |

### `profiles`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (references `auth.users`) |
| `display_name` | TEXT | User display name |
| `avatar_url` | TEXT | Profile picture URL |
| `theme` | ENUM | Global default theme |
| `font` | ENUM | Global default font style |
| `editor_mode` | ENUM | Global default editor mode |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last modification |

### RLS Policies

All tables use Row Level Security. Users can only read, create, update, and delete their own data.

### Auto-Triggers

- `updated_at` is automatically updated on every row modification
- User profiles are automatically created on first sign-up

---

## Project Structure

```
src/
├── app/
│   ├── auth/               # Auth actions, login, callback
│   ├── editor/             # Editor page, loading, error boundaries
│   ├── globals.css         # Global styles and CSS variables
│   ├── layout.tsx          # Root layout with fonts
│   └── page.tsx            # Root redirect
├── components/
│   ├── AppShell/           # Main layout with sidebar + editor area
│   ├── Editor/             # CodeMirror editor component
│   ├── EditorShell/        # Editor orchestrator (toolbar, panes, settings)
│   ├── MarkdownPreview/    # Rendered Markdown preview
│   ├── SaveIndicator/      # Save state indicator
│   ├── SettingsPanel/      # Theme, font, focus mode settings
│   ├── Sidebar/            # Document list sidebar
│   ├── Skeleton/           # Loading skeleton components
│   ├── ThemeProvider/      # Theme font data-attribute applicator
│   └── Toolbar/            # Editor toolbar with mode switcher + export
├── hooks/
│   └── useFocusMode.ts     # Focus mode hook
├── lib/
│   ├── exportToWord.ts     # Markdown → .docx export engine
│   ├── performance.ts      # Debounce, throttle utilities
│   └── supabase/           # Supabase client/server/middleware
├── middleware.ts           # Supabase auth middleware
└── types/
    └── database.ts         # TypeScript types for DB schema
```

---

## Authentication

Ethereal Docs uses Supabase Auth with email/password login. The auth flow:

1. User visits the app
2. Redirected to `/auth/login` if not authenticated
3. Logs in or signs up with email
4. Supabase creates a `profiles` row automatically (via database trigger)
5. Redirected to `/editor`

---

## Deployment

### Deploy to Vercel

1. Push to GitHub
2. Import the project in [vercel.com](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy

```bash
# Or deploy via CLI
pnpm add -g vercel
vercel --prod
```

### Build locally

```bash
pnpm build
pnpm start
```