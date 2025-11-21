// Client-side storage service using browser localStorage
// Stores files, folders, and workspace state locally in the browser

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  extension?: string;
  content?: string;
  children?: FileNode[];
}

export interface WorkspaceState {
  id: string;
  name: string;
  fileTree: FileNode[];
  openTabs: string[];
  activeTab: string | null;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEYS = {
  WORKSPACES: 'fluxo_workspaces',
  CURRENT_WORKSPACE: 'fluxo_current_workspace',
  WORKSPACE_PREFIX: 'fluxo_workspace_',
};

class LocalStorageService {
  // Workspace Management
  getAllWorkspaces(): WorkspaceState[] {
    const workspacesJson = localStorage.getItem(STORAGE_KEYS.WORKSPACES);
    if (!workspacesJson) return [];
    
    try {
      const workspaceIds = JSON.parse(workspacesJson) as string[];
      return workspaceIds.map(id => this.getWorkspace(id)).filter(Boolean) as WorkspaceState[];
    } catch (error) {
      console.error('Failed to parse workspaces:', error);
      return [];
    }
  }

  getWorkspace(id: string): WorkspaceState | null {
    const key = `${STORAGE_KEYS.WORKSPACE_PREFIX}${id}`;
    const workspaceJson = localStorage.getItem(key);
    if (!workspaceJson) return null;
    
    try {
      return JSON.parse(workspaceJson) as WorkspaceState;
    } catch (error) {
      console.error(`Failed to parse workspace ${id}:`, error);
      return null;
    }
  }

  saveWorkspace(workspace: WorkspaceState): void {
    const key = `${STORAGE_KEYS.WORKSPACE_PREFIX}${workspace.id}`;
    workspace.updatedAt = new Date().toISOString();
    
    localStorage.setItem(key, JSON.stringify(workspace));
    
    // Update workspace list
    const workspaces = this.getAllWorkspaces();
    const workspaceIds = workspaces.map(w => w.id);
    if (!workspaceIds.includes(workspace.id)) {
      workspaceIds.push(workspace.id);
      localStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify(workspaceIds));
    }
  }

  deleteWorkspace(id: string): void {
    const key = `${STORAGE_KEYS.WORKSPACE_PREFIX}${id}`;
    localStorage.removeItem(key);
    
    // Update workspace list
    const workspacesJson = localStorage.getItem(STORAGE_KEYS.WORKSPACES);
    if (workspacesJson) {
      try {
        const workspaceIds = JSON.parse(workspacesJson) as string[];
        const filtered = workspaceIds.filter(wId => wId !== id);
        localStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify(filtered));
      } catch (error) {
        console.error('Failed to update workspace list:', error);
      }
    }
  }

  getCurrentWorkspaceId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_WORKSPACE);
  }

  setCurrentWorkspaceId(id: string): void {
    localStorage.setItem(STORAGE_KEYS.CURRENT_WORKSPACE, id);
  }

  // File Operations
  getFileTree(workspaceId: string): FileNode[] {
    const workspace = this.getWorkspace(workspaceId);
    return workspace?.fileTree || [];
  }

  saveFileTree(workspaceId: string, fileTree: FileNode[]): void {
    const workspace = this.getWorkspace(workspaceId);
    if (workspace) {
      workspace.fileTree = fileTree;
      this.saveWorkspace(workspace);
    }
  }

  getFileContent(workspaceId: string, path: string): string | null {
    const fileTree = this.getFileTree(workspaceId);
    const file = this.findFileByPath(fileTree, path);
    return file?.content || null;
  }

  saveFileContent(workspaceId: string, path: string, content: string): void {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) return;
    
    const file = this.findFileByPath(workspace.fileTree, path);
    if (file && file.type === 'file') {
      file.content = content;
      this.saveWorkspace(workspace);
    }
  }

  createFile(workspaceId: string, path: string, name: string, type: 'file' | 'folder'): FileNode | null {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) return null;
    
    const parentPath = path === '/' ? '/' : path;
    const parent = parentPath === '/' ? { children: workspace.fileTree } : this.findFileByPath(workspace.fileTree, parentPath);
    
    if (!parent) return null;
    if ('type' in parent && parent.type !== 'folder' && parentPath !== '/') return null;
    
    const fullPath = parentPath === '/' ? `/${name}` : `${parentPath}/${name}`;
    const extension = type === 'file' ? this.getExtension(name) : undefined;
    
    const newNode: FileNode = {
      id: this.generateId(),
      name,
      type,
      path: fullPath,
      extension,
      content: type === 'file' ? '' : undefined,
      children: type === 'folder' ? [] : undefined,
    };
    
    if (!parent.children) parent.children = [];
    parent.children.push(newNode);
    
    this.saveWorkspace(workspace);
    return newNode;
  }

  renameFile(workspaceId: string, oldPath: string, newName: string): boolean {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) return false;
    
    const file = this.findFileByPath(workspace.fileTree, oldPath);
    if (!file) return false;
    
    const parentPath = this.getParentPath(oldPath);
    const newPath = parentPath === '/' ? `/${newName}` : `${parentPath}/${newName}`;
    
    file.name = newName;
    file.path = newPath;
    if (file.type === 'file') {
      file.extension = this.getExtension(newName);
    }
    
    // Update paths of all children recursively
    if (file.children) {
      this.updateChildPaths(file, newPath);
    }
    
    this.saveWorkspace(workspace);
    return true;
  }

  deleteFile(workspaceId: string, path: string): boolean {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) return false;
    
    const parentPath = this.getParentPath(path);
    const parent = parentPath === '/' ? { children: workspace.fileTree } : this.findFileByPath(workspace.fileTree, parentPath);
    
    if (!parent || !parent.children) return false;
    
    const index = parent.children.findIndex(child => child.path === path);
    if (index === -1) return false;
    
    parent.children.splice(index, 1);
    this.saveWorkspace(workspace);
    return true;
  }

  // Workspace State (tabs)
  saveWorkspaceState(workspaceId: string, openTabs: string[], activeTab: string | null): void {
    const workspace = this.getWorkspace(workspaceId);
    if (workspace) {
      workspace.openTabs = openTabs;
      workspace.activeTab = activeTab;
      this.saveWorkspace(workspace);
    }
  }

  // Helper methods
  private findFileByPath(tree: FileNode[], path: string): FileNode | null {
    for (const node of tree) {
      if (node.path === path) return node;
      if (node.children) {
        const found = this.findFileByPath(node.children, path);
        if (found) return found;
      }
    }
    return null;
  }

  private updateChildPaths(parent: FileNode, newParentPath: string): void {
    if (!parent.children) return;
    
    for (const child of parent.children) {
      child.path = `${newParentPath}/${child.name}`;
      if (child.children) {
        this.updateChildPaths(child, child.path);
      }
    }
  }

  private getParentPath(path: string): string {
    const lastSlash = path.lastIndexOf('/');
    return lastSlash === 0 ? '/' : path.substring(0, lastSlash);
  }

  private getExtension(filename: string): string | undefined {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(lastDot) : undefined;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  // Initialize with default workspace if none exists
  initializeDefaultWorkspace(): WorkspaceState {
    const existingWorkspaces = this.getAllWorkspaces();
    
    if (existingWorkspaces.length > 0) {
      const currentId = this.getCurrentWorkspaceId();
      if (currentId && this.getWorkspace(currentId)) {
        return this.getWorkspace(currentId)!;
      }
      // Return first workspace
      this.setCurrentWorkspaceId(existingWorkspaces[0].id);
      return existingWorkspaces[0];
    }
    
    // Create default workspace with sample files
    const defaultWorkspace: WorkspaceState = {
      id: this.generateId(),
      name: 'Main Workspace',
      fileTree: [
        {
          id: this.generateId(),
          name: 'README.fxo',
          type: 'file',
          path: '/README.fxo',
          extension: '.fxo',
          content: `// Fluxo Programming Language - Quick Reference

/*
  VARIABLES
  ----------
  local name = "John"
  local age = 25
  local isActive = true
*/

/*
  FUNCTIONS
  ----------
  function add(a, b) {
    return a + b
  }
*/

/*
  OUTPUT & MESSAGING
  -------------------
  console.log("Hello, World!")
  console.error("Error message")
  console.warn("Warning message")
*/

console.log("Welcome to Fluxo IDE!")
console.log("Explore the scripts/ and modules/ folders to learn more")`,
        },
      ],
      openTabs: ['/README.fxo'],
      activeTab: '/README.fxo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    this.saveWorkspace(defaultWorkspace);
    this.setCurrentWorkspaceId(defaultWorkspace.id);
    
    return defaultWorkspace;
  }
}

export const localStorageService = new LocalStorageService();
