import { z } from "zod";

// Extension types (defined first to avoid circular reference)
export const extensionSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string(),
  author: z.string(),
  category: z.enum(['theme', 'language', 'utility', 'formatter', 'linter']),
  enabled: z.boolean(),
  downloadedAt: z.number().optional(),
  installedAt: z.number().optional(),
  isInstalled: z.boolean().default(false),
  packages: z.array(z.object({
    name: z.string(),
    description: z.string(),
    required: z.boolean().default(true),
  })).optional(),
});

export type Extension = z.infer<typeof extensionSchema>;

// File system types
export const fileNodeSchema: z.ZodType<any> = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['file', 'folder']),
  path: z.string(),
  content: z.string().optional(),
  children: z.array(z.lazy(() => fileNodeSchema)).optional(),
  extension: z.string().optional(),
});

export type FileNode = z.infer<typeof fileNodeSchema>;

// Workspace state
export const workspaceStateSchema = z.object({
  id: z.string(),
  name: z.string(),
  openTabs: z.array(z.string()),
  activeTab: z.string().optional(),
  fileTree: z.array(fileNodeSchema),
  extensions: z.array(extensionSchema).optional(),
});

export type WorkspaceState = z.infer<typeof workspaceStateSchema>;

// Workspace list item
export const workspaceListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type WorkspaceListItem = z.infer<typeof workspaceListItemSchema>;

// Create workspace request
export const createWorkspaceRequestSchema = z.object({
  name: z.string(),
});

export type CreateWorkspaceRequest = z.infer<typeof createWorkspaceRequestSchema>;

// Output message types
export const outputMessageSchema = z.object({
  id: z.string(),
  type: z.enum(['log', 'error', 'warning', 'success']),
  message: z.string(),
  timestamp: z.number(),
  filePath: z.string().optional(),
  line: z.number().optional(),
  column: z.number().optional(),
});

export type OutputMessage = z.infer<typeof outputMessageSchema>;

// API request/response types
export const createFileRequestSchema = z.object({
  parentPath: z.string(),
  name: z.string(),
  type: z.enum(['file', 'folder']),
  content: z.string().optional(),
});

export type CreateFileRequest = z.infer<typeof createFileRequestSchema>;

export const updateFileRequestSchema = z.object({
  path: z.string(),
  content: z.string(),
});

export type UpdateFileRequest = z.infer<typeof updateFileRequestSchema>;

export const renameFileRequestSchema = z.object({
  oldPath: z.string(),
  newName: z.string(),
});

export type RenameFileRequest = z.infer<typeof renameFileRequestSchema>;

export const deleteFileRequestSchema = z.object({
  path: z.string(),
});

export type DeleteFileRequest = z.infer<typeof deleteFileRequestSchema>;

export const moveFileRequestSchema = z.object({
  sourcePath: z.string(),
  targetPath: z.string(),
});

export type MoveFileRequest = z.infer<typeof moveFileRequestSchema>;

export const executeCodeRequestSchema = z.object({
  path: z.string(),
  code: z.string(),
});

export type ExecuteCodeRequest = z.infer<typeof executeCodeRequestSchema>;

export const executeWorkspaceRequestSchema = z.object({
  files: z.array(z.object({
    path: z.string(),
    code: z.string(),
  })),
  entryPoint: z.string(),
});

export type ExecuteWorkspaceRequest = z.infer<typeof executeWorkspaceRequestSchema>;

export const executeCodeResponseSchema = z.object({
  output: z.array(outputMessageSchema),
  error: z.string().optional(),
});

export type ExecuteCodeResponse = z.infer<typeof executeCodeResponseSchema>;

// Extension request schemas
export const downloadExtensionRequestSchema = z.object({
  id: z.string(),
});

export type DownloadExtensionRequest = z.infer<typeof downloadExtensionRequestSchema>;

export const installExtensionRequestSchema = z.object({
  id: z.string(),
});

export type InstallExtensionRequest = z.infer<typeof installExtensionRequestSchema>;

export const uninstallExtensionRequestSchema = z.object({
  id: z.string(),
});

export type UninstallExtensionRequest = z.infer<typeof uninstallExtensionRequestSchema>;

export const toggleExtensionRequestSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
});

export type ToggleExtensionRequest = z.infer<typeof toggleExtensionRequestSchema>;

// Terminal command types
export const terminalCommandSchema = z.object({
  id: z.string(),
  command: z.string(),
  timestamp: z.number(),
  output: z.array(outputMessageSchema),
});

export type TerminalCommand = z.infer<typeof terminalCommandSchema>;
