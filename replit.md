# Fluxo IDE

## Overview

Fluxo IDE is a modern, browser-based integrated development environment specifically designed for the Fluxo programming language. The application provides a full-featured coding experience with file/folder management, Monaco Editor integration for syntax highlighting and code editing, and live code execution with real-time output display. Built as a single-page application, it features a three-panel layout (file explorer, editor, and output panel) optimized for developer productivity and follows a dark-mode design system inspired by VS Code and modern code editors.

## Recent Changes (November 19, 2025)

**Latest Update - HTML/Fluxo Manifest Architecture:**
- **BREAKING CHANGE**: HTML files can no longer embed Fluxo code inline
- HTML files now import external Fluxo modules using `<script type="module" data-fluxo-entry="filename.fxm">`
- This separation improves code organization and maintainability
- HTML path resolution correctly handles both relative and absolute module paths
- Interpreter properly resolves relative paths by prepending HTML file's directory

**Extension System Redesign:**
- Two-step extension lifecycle: Download from UI, then install via terminal
- Extensions must be downloaded from Extensions panel before installation
- Terminal command `fluxo install <extension-id>` installs downloaded extensions
- Extension state tracking: available → downloaded → installed
- Storage layer validates download state before allowing installation
- UI shows clear distinction between downloaded and installed extensions

**Module Folder Import Feature:**
- New syntax: `module folder "/path" as alias` imports all .fxo and .fxm files from a folder
- Access imported modules via alias: `alias.moduleName.functionName()`
- Only files with module definitions are included in folder imports
- Modules execute in the current interpreter context for proper variable scope

**File Explorer Enhancements:**
- Different icons for file types: FileCode icon for .fxm (module files), File icon for .fxo (script files)
- Visual distinction helps users identify module files vs regular scripts

**Documentation Updates:**
- Updated HTML Support section to explain new manifest-based approach
- Added examples of HTML importing Fluxo modules
- Clarified two-step extension installation workflow
- Added documentation for module folder import syntax

**Previous Features:**
- Monaco Editor with auto-closing brackets, bracket colorization, and occurrence highlighting
- Workspace-wide variable tracking and cross-file autocomplete suggestions
- Output panel with source tracking and click-to-jump functionality
- HTML Preview pane for viewing rendered HTML files
- Terminal with command support for extension management
- Comprehensive documentation with search and filtering

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite for fast development and optimized production builds
- **Routing:** Wouter for lightweight client-side routing
- **State Management:** TanStack Query (React Query) for server state management and caching
- **UI Components:** Radix UI primitives with shadcn/ui component library
- **Styling:** Tailwind CSS with custom design tokens for consistent theming

**Design Decisions:**
- **Component Library Choice:** Uses shadcn/ui (Radix UI + Tailwind) to provide accessible, customizable components while maintaining full control over the codebase rather than depending on external component packages
- **Monaco Editor Integration:** Leverages `@monaco-editor/react` for professional code editing experience with syntax highlighting, autocomplete, and custom language support for Fluxo
- **Custom Language Definition:** Implements Fluxo language syntax highlighting through Monaco's `setMonarchTokensProvider` API with keyword recognition, operator highlighting, and comment support
- **Three-Panel Layout:** Uses `react-resizable-panels` for draggable panel resizing, providing flexible workspace configuration
- **Dark Mode First:** Design system built with dark mode as the primary theme, matching modern IDE conventions

**Key Features:**
- Multi-tab editor with unsaved file tracking
- Custom Fluxo syntax highlighting (`.fxo` and `.fxm` files)
- Context menu operations (create, rename, delete files/folders)
- Keyboard shortcuts for common operations (Run: ⌘↵, Save: ⌘S)
- Real-time output panel with timestamped messages

### Backend Architecture

**Technology Stack:**
- **Runtime:** Node.js with Express.js
- **Language:** TypeScript with ES modules
- **Database:** PostgreSQL via Neon serverless driver (configured but not actively used for core functionality)
- **ORM:** Drizzle ORM (configured for potential database operations)

**Design Decisions:**
- **In-Memory Storage:** Core file system operations use a memory-based storage implementation (`MemStorage`) rather than persistent database storage, prioritizing simplicity and fast iteration for the IDE workspace
- **Custom Interpreter:** Implements a bespoke Fluxo language interpreter (`FluxoInterpreter`) in TypeScript that:
  - Parses and executes Fluxo syntax
  - Supports modules, functions, variables, and control flow
  - Provides built-in console methods for output
  - Handles module imports and exports
  - Executes code in isolated contexts per file

**API Structure:**
- RESTful endpoints for workspace operations:
  - `GET /api/workspace` - Retrieve workspace state (file tree, open tabs)
  - `GET /api/files/tree` - Get file hierarchy
  - `GET /api/files/content` - Fetch file content by path
  - `POST /api/files/create` - Create new file or folder
  - `POST /api/files/update` - Save file changes
  - `POST /api/files/rename` - Rename file/folder
  - `POST /api/files/delete` - Delete file/folder
  - `POST /api/code/execute` - Execute Fluxo code and return output

**Interpreter Architecture:**
- **Context Isolation:** Each code execution creates a fresh interpreter context with separate variable/function scopes
- **Module System:** Supports `module`/`export` declarations and `require` statements for code organization
- **Built-in Functions:** Provides `console.log`, `console.error`, `console.warn` for debugging
- **Error Handling:** Catches and reports syntax/runtime errors with descriptive messages

### Data Schema

**File System Types (shared/schema.ts):**
- `FileNode`: Recursive tree structure representing files and folders with properties for id, name, type, path, content, and optional children
- `WorkspaceState`: Workspace configuration including open tabs, active tab, and file tree
- `OutputMessage`: Structured log messages with type classification (log, error, warning, success)

**Request/Response Schemas:**
- Zod schemas for type-safe API request validation
- Shared types between frontend and backend via `@shared` path alias

### External Dependencies

**Third-Party Services:**
- **Neon Database:** PostgreSQL serverless database configured via `@neondatabase/serverless` (connection string in `DATABASE_URL` environment variable)
- **Google Fonts CDN:** Loads Inter (UI) and JetBrains Mono/Fira Code (code editor) fonts

**Key NPM Packages:**
- **UI/Styling:** `@radix-ui/*` primitives, `tailwindcss`, `class-variance-authority`, `clsx`
- **State Management:** `@tanstack/react-query` for server state caching and synchronization
- **Editor:** `@monaco-editor/react` for Monaco Editor integration
- **Forms:** `react-hook-form`, `@hookform/resolvers`, `zod` for form validation
- **Database:** `drizzle-orm`, `drizzle-zod` for database operations (configured but minimal usage)
- **Development:** Replit-specific plugins (`@replit/vite-plugin-*`) for enhanced development experience on Replit platform

**Database Configuration:**
- Drizzle ORM configured with PostgreSQL dialect
- Schema location: `shared/schema.ts`
- Migrations directory: `./migrations`
- Database provisioning expected via `DATABASE_URL` environment variable

**Build & Development:**
- Development server runs via `tsx` for TypeScript execution
- Production build uses Vite for frontend and esbuild for backend bundling
- Vite configured with React plugin, custom error overlay, and Replit-specific development tools