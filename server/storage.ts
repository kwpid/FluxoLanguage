import { type FileNode, type WorkspaceState, type WorkspaceListItem, type Extension } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getWorkspace(): Promise<WorkspaceState>;
  getWorkspaceList(): Promise<WorkspaceListItem[]>;
  getCurrentWorkspaceId(): Promise<string>;
  createWorkspace(name: string): Promise<WorkspaceState>;
  switchWorkspace(workspaceId: string): Promise<void>;
  deleteWorkspace(workspaceId: string): Promise<void>;
  getFileTree(): Promise<FileNode[]>;
  getFileContent(path: string): Promise<string | undefined>;
  createFile(parentPath: string, name: string, type: 'file' | 'folder', content?: string): Promise<FileNode>;
  updateFile(path: string, content: string): Promise<void>;
  renameFile(oldPath: string, newName: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  moveFile(sourcePath: string, targetPath: string): Promise<void>;
  updateWorkspaceState(openTabs: string[], activeTab?: string): Promise<void>;
  getExtensions(): Promise<Extension[]>;
  downloadExtension(extension: Extension): Promise<void>;
  installExtension(extensionId: string): Promise<Extension>;
  uninstallExtension(extensionId: string): Promise<void>;
  toggleExtension(extensionId: string, enabled: boolean): Promise<void>;
}

export class MemStorage implements IStorage {
  private workspaces: Map<string, WorkspaceState>;
  private currentWorkspaceId: string;

  constructor() {
    this.workspaces = new Map();
    const defaultWorkspace = this.createDefaultWorkspace("Main Workspace");
    this.workspaces.set(defaultWorkspace.id, defaultWorkspace);
    this.currentWorkspaceId = defaultWorkspace.id;
  }

  private createDefaultWorkspace(name: string): WorkspaceState {
    return {
      id: randomUUID(),
      name,
      fileTree: this.createInitialFileTree(),
      openTabs: ['/README.fxo'],
      activeTab: '/README.fxo',
      extensions: [],
    };
  }

  private createInitialFileTree(): FileNode[] {
    return [
      {
        id: randomUUID(),
        name: 'index.html',
        type: 'file',
        path: '/index.html',
        extension: '.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fluxo Live Preview</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    
    .container {
      background: white;
      padding: 40px;
      border-radius: 10px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 600px;
      width: 100%;
      text-align: center;
    }
    
    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 32px;
    }
    
    p {
      color: #666;
      margin-bottom: 30px;
      line-height: 1.6;
    }
    
    .btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 14px 35px;
      font-size: 16px;
      border-radius: 6px;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      font-weight: 500;
    }
    
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
    }
    
    .btn:active {
      transform: translateY(0);
    }
    
    #output {
      margin-top: 25px;
      padding: 20px;
      background: #f5f5f5;
      border-radius: 6px;
      color: #333;
      font-weight: 500;
      min-height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px dashed #ddd;
    }
    
    #output.active {
      background: #e8f5e9;
      border-color: #4caf50;
      color: #2e7d32;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Fluxo Live Preview</h1>
    <p>This page automatically updates when you edit Fluxo code. Click the button to test the interactive functionality!</p>
    <button id="actionButton" class="btn">Click Me!</button>
    <div id="output">Waiting for interaction...</div>
  </div>
  
  <script type="module" data-fluxo-entry="main.fxm"></script>
</body>
</html>`,
      },
      {
        id: randomUUID(),
        name: 'main.fxm',
        type: 'file',
        path: '/main.fxm',
        extension: '.fxm',
        content: `// main.fxm - Main Fluxo Module
// This module is loaded by index.html

module main {
  local clickCount = 0
  
  export function handleButtonClick() {
    clickCount = clickCount + 1
    console.log("Button clicked! Count:", clickCount)
    
    // Update button text
    local button = document.getElementById("actionButton")
    if (button != null) {
      button.textContent = "Clicked " + clickCount + " time" + (clickCount > 1 ? "s" : "") + "!"
    }
    
    // Update output area
    local outputDiv = document.getElementById("output")
    if (outputDiv != null) {
      outputDiv.textContent = "Success! You clicked the button " + clickCount + " times."
      outputDiv.classList.add("active")
    }
  }
  
  export function init() {
    console.log("Fluxo main module initialized!")
    
    // Attach click event to button
    local button = document.getElementById("actionButton")
    if (button != null) {
      button.addEventListener("click", main.handleButtonClick)
      console.log("✓ Button click handler attached")
    }
  }
}

// Initialize when module loads
main.init()`,
      },
      {
        id: randomUUID(),
        name: 'README.fxo',
        type: 'file',
        path: '/README.fxo',
        extension: '.fxo',
        content: `// Fluxo Programming Language - Quick Reference

/* 
  VARIABLES
  ---------
  local name = "John"
  local age = 25
  local isActive = true
*/

/* 
  FUNCTIONS
  ---------
  function add(a, b) {
    return a + b
  }
*/

/* 
  MODULES (.fxm files)
  --------------------
  module myModule {
    export function doSomething() {
      // code here
    }
  }
*/

/* 
  IMPORTING MODULES
  -----------------
  // Import entire module:
  import("modules/myModule")
  
  // Then use:
  myModule.doSomething()
  
  // Or selectively import specific functions/variables:
  import from "modules/myModule" { doSomething, myVariable }
  
  // Then use directly:
  doSomething()
*/

/* 
  CONTROL FLOW
  ------------
  if (condition) {
    // code
  } else {
    // code
  }
  
  while (condition) {
    // code
  }
  
  for (local i = 0; i < 10; i = i + 1) {
    // code
  }
*/

console.log("Welcome to Fluxo IDE!")
console.log("Explore the scripts/ and modules/ folders to learn more")
`,
      },
    ];
  }

  private getCurrentWorkspace(): WorkspaceState {
    const workspace = this.workspaces.get(this.currentWorkspaceId);
    if (!workspace) {
      throw new Error('Current workspace not found');
    }
    return workspace;
  }

  async getWorkspaceList(): Promise<WorkspaceListItem[]> {
    return Array.from(this.workspaces.values()).map(ws => ({
      id: ws.id,
      name: ws.name,
    }));
  }

  async getCurrentWorkspaceId(): Promise<string> {
    return this.currentWorkspaceId;
  }

  async createWorkspace(name: string): Promise<WorkspaceState> {
    const newWorkspace: WorkspaceState = {
      id: randomUUID(),
      name,
      fileTree: [],
      openTabs: [],
      activeTab: undefined,
    };
    this.workspaces.set(newWorkspace.id, newWorkspace);
    return newWorkspace;
  }

  async switchWorkspace(workspaceId: string): Promise<void> {
    if (!this.workspaces.has(workspaceId)) {
      throw new Error('Workspace not found');
    }
    this.currentWorkspaceId = workspaceId;
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    if (this.workspaces.size <= 1) {
      throw new Error('Cannot delete the last workspace');
    }
    if (workspaceId === this.currentWorkspaceId) {
      const workspaceIds = Array.from(this.workspaces.keys());
      const newCurrentId = workspaceIds.find(id => id !== workspaceId);
      if (newCurrentId) {
        this.currentWorkspaceId = newCurrentId;
      }
    }
    this.workspaces.delete(workspaceId);
  }

  private findNode(path: string, nodes?: FileNode[]): FileNode | undefined {
    const searchNodes = nodes || this.getCurrentWorkspace().fileTree;
    for (const node of searchNodes) {
      if (node.path === path) {
        return node;
      }
      if (node.children) {
        const found = this.findNode(path, node.children);
        if (found) return found;
      }
    }
    return undefined;
  }

  private findParentNode(path: string): FileNode | undefined {
    const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
    if (parentPath === '/') {
      return undefined;
    }
    return this.findNode(parentPath);
  }

  private deleteNodeFromTree(path: string, nodes: FileNode[]): boolean {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].path === path) {
        nodes.splice(i, 1);
        return true;
      }
      if (nodes[i].children) {
        if (this.deleteNodeFromTree(path, nodes[i].children!)) {
          return true;
        }
      }
    }
    return false;
  }

  async getWorkspace(): Promise<WorkspaceState> {
    return this.getCurrentWorkspace();
  }

  async updateWorkspaceState(openTabs: string[], activeTab?: string): Promise<void> {
    const workspace = this.getCurrentWorkspace();
    const validTabs = openTabs.filter(path => this.findNode(path) !== undefined);
    workspace.openTabs = validTabs;
    
    if (activeTab && validTabs.includes(activeTab)) {
      workspace.activeTab = activeTab;
    } else if (validTabs.length > 0) {
      workspace.activeTab = validTabs[0];
    } else {
      workspace.activeTab = undefined;
    }
  }

  async getFileTree(): Promise<FileNode[]> {
    return this.getCurrentWorkspace().fileTree;
  }

  async getFileContent(path: string): Promise<string | undefined> {
    const node = this.findNode(path);
    return node?.content;
  }

  async createFile(parentPath: string, name: string, type: 'file' | 'folder', content?: string): Promise<FileNode> {
    const workspace = this.getCurrentWorkspace();
    const newPath = parentPath === '/' ? `/${name}` : `${parentPath}/${name}`;
    
    const newNode: FileNode = {
      id: randomUUID(),
      name,
      type,
      path: newPath,
      extension: type === 'file' ? name.substring(name.lastIndexOf('.')) : undefined,
      content: type === 'file' ? (content || '') : undefined,
      children: type === 'folder' ? [] : undefined,
    };

    if (parentPath === '/') {
      workspace.fileTree.push(newNode);
    } else {
      const parent = this.findNode(parentPath);
      if (parent && parent.children) {
        parent.children.push(newNode);
      }
    }

    return newNode;
  }

  async updateFile(path: string, content: string): Promise<void> {
    const node = this.findNode(path);
    if (node && node.type === 'file') {
      node.content = content;
    }
  }

  async renameFile(oldPath: string, newName: string): Promise<void> {
    const node = this.findNode(oldPath);
    if (node) {
      const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/')) || '/';
      const newPath = parentPath === '/' ? `/${newName}` : `${parentPath}/${newName}`;
      
      node.name = newName;
      node.path = newPath;
      
      if (node.type === 'file') {
        node.extension = newName.substring(newName.lastIndexOf('.'));
      }

      if (node.children) {
        this.updateChildrenPaths(node.children, newPath);
      }

      this.updateOpenTabPaths(oldPath, newPath);
    }
  }

  private updateChildrenPaths(children: FileNode[], parentPath: string) {
    for (const child of children) {
      const oldChildPath = child.path;
      child.path = `${parentPath}/${child.name}`;
      if (child.children) {
        this.updateChildrenPaths(child.children, child.path);
      }
      this.updateOpenTabPaths(oldChildPath, child.path);
    }
  }

  private updateOpenTabPaths(oldPath: string, newPath: string) {
    const workspace = this.getCurrentWorkspace();
    const index = workspace.openTabs.indexOf(oldPath);
    if (index !== -1) {
      workspace.openTabs[index] = newPath;
      if (workspace.activeTab === oldPath) {
        workspace.activeTab = newPath;
      }
    }
  }

  async deleteFile(path: string): Promise<void> {
    const workspace = this.getCurrentWorkspace();
    const node = this.findNode(path);
    if (node) {
      this.removeFromOpenTabs(path);
      
      if (node.type === 'folder' && node.children) {
        this.removeDescendantsFromOpenTabs(node.children);
      }
      
      this.deleteNodeFromTree(path, workspace.fileTree);
    }
  }

  private removeFromOpenTabs(path: string) {
    const workspace = this.getCurrentWorkspace();
    const index = workspace.openTabs.indexOf(path);
    if (index !== -1) {
      workspace.openTabs.splice(index, 1);
      if (workspace.activeTab === path) {
        workspace.activeTab = workspace.openTabs[0];
      }
    }
  }

  private removeDescendantsFromOpenTabs(children: FileNode[]) {
    for (const child of children) {
      this.removeFromOpenTabs(child.path);
      if (child.children) {
        this.removeDescendantsFromOpenTabs(child.children);
      }
    }
  }

  async moveFile(sourcePath: string, targetPath: string): Promise<void> {
    const workspace = this.getCurrentWorkspace();
    const sourceNode = this.findNode(sourcePath);
    const targetNode = this.findNode(targetPath);
    
    if (!sourceNode) {
      throw new Error('Source file not found');
    }
    
    if (!targetNode || targetNode.type !== 'folder') {
      throw new Error('Target must be a folder');
    }
    
    if (targetPath.startsWith(sourcePath + '/')) {
      throw new Error('Cannot move a folder into itself');
    }
    
    this.deleteNodeFromTree(sourcePath, workspace.fileTree);
    
    const newPath = `${targetPath}/${sourceNode.name}`;
    sourceNode.path = newPath;
    
    if (sourceNode.children) {
      this.updateChildrenPaths(sourceNode.children, newPath);
    }
    
    if (targetNode.children) {
      targetNode.children.push(sourceNode);
    } else {
      targetNode.children = [sourceNode];
    }
    
    this.updateOpenTabPaths(sourcePath, newPath);
  }

  async getExtensions(): Promise<Extension[]> {
    const workspace = this.getCurrentWorkspace();
    return workspace.extensions || [];
  }

  async downloadExtension(extension: Extension): Promise<void> {
    const workspace = this.getCurrentWorkspace();
    if (!workspace.extensions) {
      workspace.extensions = [];
    }
    
    const existing = workspace.extensions.find(ext => ext.id === extension.id);
    if (existing) {
      throw new Error('Extension already downloaded');
    }
    
    workspace.extensions.push({
      ...extension,
      downloadedAt: Date.now(),
      isInstalled: false,
      enabled: false,
    });
  }

  async installExtension(extensionId: string): Promise<Extension> {
    const workspace = this.getCurrentWorkspace();
    if (!workspace.extensions) {
      throw new Error('No extensions downloaded');
    }
    
    const extension = workspace.extensions.find(ext => ext.id === extensionId);
    if (!extension) {
      throw new Error('Extension not downloaded. Please download it from the store first.');
    }
    
    if (extension.isInstalled) {
      throw new Error('Extension already installed');
    }
    
    extension.isInstalled = true;
    extension.installedAt = Date.now();
    extension.enabled = true;
    
    return extension;
  }

  async uninstallExtension(extensionId: string): Promise<void> {
    const workspace = this.getCurrentWorkspace();
    if (!workspace.extensions) {
      return;
    }
    
    const extension = workspace.extensions.find(ext => ext.id === extensionId);
    if (!extension) {
      throw new Error('Extension not found');
    }
    
    if (!extension.isInstalled) {
      throw new Error('Extension is not installed');
    }
    
    extension.isInstalled = false;
    extension.installedAt = undefined;
    extension.enabled = false;
  }

  async toggleExtension(extensionId: string, enabled: boolean): Promise<void> {
    const workspace = this.getCurrentWorkspace();
    if (!workspace.extensions) {
      throw new Error('No extensions installed');
    }
    
    const extension = workspace.extensions.find(ext => ext.id === extensionId);
    if (!extension) {
      throw new Error('Extension not found');
    }
    
    extension.enabled = enabled;
  }
}

export const storage = new MemStorage();
