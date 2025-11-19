# Fluxo IDE

## Overview

Fluxo IDE is a modern, browser-based integrated development environment specifically designed for the Fluxo programming language. The application provides a full-featured coding experience with file/folder management, Monaco Editor integration for syntax highlighting and code editing, and live code execution with real-time output display. Built as a single-page application, it features a three-panel layout (file explorer, editor, and output panel) optimized for developer productivity and follows a dark-mode design system inspired by VS Code and modern code editors.

## Recent Changes (November 19, 2025)

**Monaco Editor Enhancements:**
- Added auto-closing brackets and quotes for improved coding efficiency
- Enabled bracket pair colorization and matching for better code readability
- Implemented occurrence highlighting to show all instances of selected text
- Added format-on-type and format-on-paste capabilities for automatic code formatting

**Extensions System:**
- Created Extensions UI with Sheet component featuring Installed and Browse tabs
- Added search functionality to filter extensions
- Implemented HTMLSupporter extension for HTML/CSS element creation
- Extensions can be installed, enabled/disabled, and uninstalled through the UI
- HTMLSupporter extension automatically creates template files (example.html, styles.css) when installed

**Fluxo Language Extensions:**
- Extended language syntax to support HTML element creation (createButton, createDiv, createInput, etc.)
- Added event handler support (onClick, onChange, onHover, onFocus, onBlur, onSubmit)
- Implemented autocomplete suggestions for HTML elements and event handlers
- All HTML features available when HTMLSupporter extension is installed

**Documentation Improvements:**
- Completely reorganized documentation with tabbed sections:
  - Getting Started
  - Language Basics (Variables, Functions, Operators)
  - Control Flow (If-Else, Loops)
  - Modules
  - HTML Support (Elements, Events, Examples)
  - Best Practices
- Added search functionality with keyword filtering across all documentation sections
- Comprehensive examples for HTML element creation and event handling
- Added "Copy Raw" button to copy complete documentation as plain text

**Code Execution & Preview:**
- Implemented Run button functionality to execute Fluxo code and display output
- Added Stop button that appears during code execution
- Created HTML Preview pane with tabs to switch between Output and Preview modes
- Preview tab displays HTML files in a sandboxed iframe for security
- Preview automatically updates when HTML file content changes
- Output panel shows execution results with timestamped, color-coded messages

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