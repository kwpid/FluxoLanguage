import { z } from "zod";

// File system types
export const fileNodeSchema = z.object({
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

export const executeCodeResponseSchema = z.object({
  output: z.array(outputMessageSchema),
  error: z.string().optional(),
});

export type ExecuteCodeResponse = z.infer<typeof executeCodeResponseSchema>;
