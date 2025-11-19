# Fluxo IDE Design Guidelines

## Design Approach
**System-Based Approach**: Drawing from VS Code and modern code editor patterns (Monaco Editor, GitHub Codespaces, Replit) with emphasis on information density, readability, and developer productivity.

## Core Design Principles
1. **Function over Form**: Maximize coding real estate, minimize chrome
2. **Information Density**: Efficient use of space without clutter
3. **Developer Focus**: Zero distractions, keyboard-first interactions
4. **Consistent Patterns**: Predictable layouts across all panels

---

## Layout System

### Grid Structure
- **3-Panel Layout**: File Explorer (sidebar) | Editor (main) | Output Panel (right or bottom)
- **Sidebar Width**: 240px-280px (resizable with drag handle)
- **Output Panel**: 30% of viewport or dockable to bottom at 40% height
- **Min Panel Widths**: 200px for explorer, 400px for editor, 300px for output

### Spacing Primitives
Use Tailwind units: **2, 3, 4, 6, 8** for consistent rhythm
- Tight spacing (panels, lists): `p-2`, `gap-2`
- Standard spacing (sections, groups): `p-4`, `gap-4`
- Generous spacing (major sections): `p-6`, `py-8`

### Responsive Behavior
- Desktop (>1024px): 3-panel layout
- Tablet (768-1024px): Collapsible sidebar, 2-panel view
- Mobile (<768px): Single panel with tab switching

---

## Typography

### Font Families
- **UI Text**: Inter or System UI (`font-sans`)
- **Code Editor**: JetBrains Mono or Fira Code (`font-mono`) with ligatures enabled
- **Load via CDN**: Google Fonts for both families

### Type Scale
- **Panel Headers**: 14px, semibold (600)
- **File/Folder Names**: 13px, medium (500)
- **Tab Labels**: 13px, medium (500)
- **Code Editor**: 14px, regular (400), 1.6 line-height
- **Output Console**: 13px, regular (400)
- **Tooltips/Meta**: 12px, regular (400)

### Text Hierarchy
- Active elements: Brighter text treatment
- Inactive elements: Reduced opacity
- Code syntax: Full Monaco highlighting
- Errors/Warnings: Distinct visual weight

---

## Component Library

### Navigation & Structure
**Top Bar** (h-10 or h-12):
- Logo/title left-aligned
- File operations center (New File, New Folder, Import, Save)
- Settings/theme toggle right-aligned

**File Explorer Panel**:
- Collapsible tree with chevron icons
- Indent: 16px per level (`pl-4` increments)
- File/folder icons (use Heroicons: DocumentText, Folder, FolderOpen)
- Right-click context menus for operations
- Hover states on tree items

**Editor Tabs**:
- Height: 36px
- Close button on hover (X icon)
- Active tab: Distinct visual treatment
- Dirty indicator (dot) when unsaved
- Tab scrolling for overflow with arrow controls

**Panel Resize Handles**:
- 4px width, draggable dividers between panels
- Hover state indicates draggability

### Editor Components
**Monaco Container**:
- Full-height minus tab bar
- Minimap enabled by default (can be toggled)
- Line numbers always visible
- Breadcrumb navigation at top of editor

**Output Panel**:
- Toggle between "Console" and "Preview" modes (tab switcher)
- Clear output button (trash icon)
- Timestamp on each output line
- Error/warning/info message styling
- Auto-scroll to bottom option

### Interactive Elements
**Buttons**:
- Primary: Used for "Run Script", "Save"
- Secondary: Used for "New File", panel toggles
- Icon buttons: 32px × 32px, 8px padding
- Text buttons: px-4 py-2

**Context Menus**:
- Appear on right-click
- Width: 200px
- Item height: 32px
- Icons aligned left, labels left-aligned, shortcuts right-aligned
- Dividers between groups (1px line)

**File Tree Items**:
- Height: 28px per item
- Full-width hover area
- Icon (16px) + spacing (gap-2) + label

### Forms & Inputs
**Modal Dialogs** (New File/Folder):
- Width: 400px, centered
- Backdrop blur
- Input fields: h-10, px-3
- Actions right-aligned (Cancel, Create)

**Search/Filter**:
- File explorer search: Full-width input, 32px height
- Command palette (Cmd/Ctrl+P): Centered modal, 600px width

---

## Interaction Patterns

### File Operations
- **Create**: Modal with name input + file type selector (.fxo / .fxm)
- **Delete**: Confirmation tooltip (inline or small modal)
- **Rename**: Inline editing in file tree
- **Drag & Drop**: Visual feedback during drag, drop zones highlighted

### Code Editing
- **Syntax Highlighting**: Monaco's built-in with custom Fluxo language definition
- **Autocomplete**: Dropdown appears below cursor, max 10 items visible, scrollable
- **Error Indicators**: Squiggly underlines, gutter icons, hover tooltips
- **Find/Replace**: Inline widget at top of editor (Monaco default pattern)

### Live Execution
- **Run Button**: Primary action in toolbar or Cmd/Ctrl+Enter
- **Output Streaming**: Real-time append to console as code executes
- **Error Highlighting**: Red text for errors, yellow for warnings in console

---

## Animations & Transitions
**Minimal Motion**:
- Panel resize: Smooth drag (no animation)
- Tab switching: Instant (no fade/slide)
- File tree expand/collapse: 150ms ease-out
- Hover states: Instant (no transition)
- Modals: 200ms fade-in for backdrop only

---

## Accessibility
- **Keyboard Navigation**: Full keyboard support (Tab, Arrow keys, Enter, Escape)
- **Focus Indicators**: Clear visible focus states on all interactive elements
- **Screen Readers**: ARIA labels for icon buttons, panel roles, tree structure
- **Contrast**: Maintain WCAG AA standards (minimum 4.5:1 for text)
- **Resizable Text**: Support browser zoom without breaking layout

---

## Special Considerations

### Monaco Editor Integration
- Use `monaco-editor` CDN or npm package
- Configure for dark theme: `vs-dark` theme
- Custom language definition for Fluxo (.fxo, .fxm)
- Register custom tokens: `require`, `export`, `module`, function syntax

### State Persistence
- Visual indicators for unsaved files (dot on tab)
- Auto-save option (toggle in settings)
- Session restore: Reopen tabs on load

### Developer-Focused UX
- **Command Palette**: Quick access to all commands (Cmd/Ctrl+Shift+P)
- **Keyboard Shortcuts**: Display in tooltips and menus
- **Breadcrumbs**: Show file path above editor
- **Status Bar**: Show file type, cursor position, line/column count (bottom bar, h-6)

---

## Preloaded Content Structure
**Initial Workspace**:
- `/scripts` folder with 2-3 sample .fxo files
- `/modules` folder with 1-2 sample .fxm files
- README.fxo explaining Fluxo syntax
- Auto-open README on first load

---

This IDE prioritizes developer efficiency with a clean, distraction-free interface that maximizes coding space while providing powerful file management and live execution capabilities.