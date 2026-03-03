# Directory Site Template

Template for creating SEO-optimized directory websites with Claude Code configuration.

## Usage

1. Copy this folder to create a new project:
   ```bash
   cp -r directory-template my-new-directory
   cd my-new-directory
   ```

2. Update the memory bank files with your project details:
   - `memory-bank/core/quickstart.md` - Project overview and commands
   - `memory-bank/core/projectbrief.md` - Product definition and schema
   - `memory-bank/development/activeContext.md` - Current focus
   - `memory-bank/architecture/techStack.md` - Technology stack

3. Replace `[PROJECT_NAME]` and other placeholders with your actual values

4. Initialize your project:
   ```bash
   npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir
   npm install @supabase/supabase-js zod lucide-react
   ```

## Structure

```
.claude/
├── settings.local.json          # Claude permissions
├── agents/                      # Specialized agents
│   ├── backend-architect.md
│   ├── code-architect.md
│   ├── code-reviewer.md
│   ├── frontend-developer.md
│   ├── trend-researcher.md
│   ├── ui-designer.md
│   └── visual-storyteller.md
└── skills/
    ├── settings.local.json
    └── frontend-design/
        └── SKILL.md             # Frontend design guidelines

memory-bank/
├── core/
│   ├── quickstart.md            # Project overview
│   └── projectbrief.md          # Product definition
├── development/
│   ├── activeContext.md         # Current focus
│   └── progress.md              # Work log
├── architecture/
│   └── techStack.md             # Technology decisions
└── archive/                     # Historical docs

CLAUDE.md                        # Main Claude instructions
```

## Included Agents

| Agent | Use For |
|-------|---------|
| **backend-architect** | API design, database architecture |
| **code-architect** | Project structure, folder organization |
| **code-reviewer** | Code quality and security reviews |
| **frontend-developer** | UI implementation, performance |
| **ui-designer** | Interface design, visual aesthetics |
| **trend-researcher** | Market research, trend analysis |
| **visual-storyteller** | Infographics, presentations |

## Tech Stack (Default)

- **Frontend**: Next.js 15+, React 19+, Tailwind CSS 4
- **Backend**: Next.js API routes, Supabase (PostgreSQL)
- **Maps**: MapLibre GL JS (if needed)
- **Analytics**: PostHog
- **Hosting**: Vercel
