import { type FileNode, type WorkspaceState } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getWorkspace(): Promise<WorkspaceState>;
  getFileTree(): Promise<FileNode[]>;
  getFileContent(path: string): Promise<string | undefined>;
  createFile(parentPath: string, name: string, type: 'file' | 'folder', content?: string): Promise<FileNode>;
  updateFile(path: string, content: string): Promise<void>;
  renameFile(oldPath: string, newName: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  updateWorkspaceState(openTabs: string[], activeTab?: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private fileTree: FileNode[];
  private openTabs: string[];
  private activeTab: string | undefined;

  constructor() {
    this.fileTree = this.createInitialWorkspace();
    this.openTabs = ['/README.fxo'];
    this.activeTab = '/README.fxo';
  }

  private createInitialWorkspace(): FileNode[] {
    return [
      {
        id: randomUUID(),
        name: 'scripts',
        type: 'folder',
        path: '/scripts',
        children: [
          {
            id: randomUUID(),
            name: 'hello.fxo',
            type: 'file',
            path: '/scripts/hello.fxo',
            extension: '.fxo',
            content: `// Welcome to Fluxo IDE!
// This is a simple hello world script

function greet(name) {
  return "Hello, " + name + "!"
}

var message = greet("World")
console.log(message)
console.log("Fluxo is running!")
`,
          },
          {
            id: randomUUID(),
            name: 'calculator.fxo',
            type: 'file',
            path: '/scripts/calculator.fxo',
            extension: '.fxo',
            content: `// Simple calculator using Fluxo

function add(a, b) {
  return a + b
}

function multiply(a, b) {
  return a * b
}

var result1 = add(5, 3)
var result2 = multiply(4, 7)

console.log("5 + 3 =", result1)
console.log("4 * 7 =", result2)
`,
          },
          {
            id: randomUUID(),
            name: 'module-demo.fxo',
            type: 'file',
            path: '/scripts/module-demo.fxo',
            extension: '.fxo',
            content: `// Example using a module
require("modules/math-utils")

var sum = mathUtils.sum(10, 20, 30)
var product = mathUtils.product(2, 3, 4)

console.log("Sum:", sum)
console.log("Product:", product)
`,
          },
        ],
      },
      {
        id: randomUUID(),
        name: 'modules',
        type: 'folder',
        path: '/modules',
        children: [
          {
            id: randomUUID(),
            name: 'math-utils.fxm',
            type: 'file',
            path: '/modules/math-utils.fxm',
            extension: '.fxm',
            content: `// Math utilities module
module mathUtils {
  export function sum(...numbers) {
    var total = 0
    for (var i = 0; i < numbers.length; i = i + 1) {
      total = total + numbers[i]
    }
    return total
  }

  export function product(...numbers) {
    var result = 1
    for (var i = 0; i < numbers.length; i = i + 1) {
      result = result * numbers[i]
    }
    return result
  }

  export function average(...numbers) {
    return sum(...numbers) / numbers.length
  }
}
`,
          },
          {
            id: randomUUID(),
            name: 'string-utils.fxm',
            type: 'file',
            path: '/modules/string-utils.fxm',
            extension: '.fxm',
            content: `// String utilities module
module stringUtils {
  export function uppercase(str) {
    return str.toUpperCase()
  }

  export function lowercase(str) {
    return str.toLowerCase()
  }

  export function reverse(str) {
    var result = ""
    for (var i = str.length - 1; i >= 0; i = i - 1) {
      result = result + str[i]
    }
    return result
  }
}
`,
          },
        ],
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
  var name = "John"
  var age = 25
  var isActive = true
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
  require("modules/myModule")
  
  // Then use:
  myModule.doSomething()
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
  
  for (var i = 0; i < 10; i = i + 1) {
    // code
  }
*/

console.log("Welcome to Fluxo IDE!")
console.log("Explore the scripts/ and modules/ folders to learn more")
`,
      },
    ];
  }

  private findNode(path: string, nodes: FileNode[] = this.fileTree): FileNode | undefined {
    for (const node of nodes) {
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
    return {
      openTabs: this.openTabs,
      activeTab: this.activeTab,
      fileTree: this.fileTree,
    };
  }

  async updateWorkspaceState(openTabs: string[], activeTab?: string): Promise<void> {
    const validTabs = openTabs.filter(path => this.findNode(path) !== undefined);
    this.openTabs = validTabs;
    
    if (activeTab && validTabs.includes(activeTab)) {
      this.activeTab = activeTab;
    } else if (validTabs.length > 0) {
      this.activeTab = validTabs[0];
    } else {
      this.activeTab = undefined;
    }
  }

  async getFileTree(): Promise<FileNode[]> {
    return this.fileTree;
  }

  async getFileContent(path: string): Promise<string | undefined> {
    const node = this.findNode(path);
    return node?.content;
  }

  async createFile(parentPath: string, name: string, type: 'file' | 'folder', content?: string): Promise<FileNode> {
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
      this.fileTree.push(newNode);
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
    const index = this.openTabs.indexOf(oldPath);
    if (index !== -1) {
      this.openTabs[index] = newPath;
      if (this.activeTab === oldPath) {
        this.activeTab = newPath;
      }
    }
  }

  async deleteFile(path: string): Promise<void> {
    const node = this.findNode(path);
    if (node) {
      this.removeFromOpenTabs(path);
      
      if (node.type === 'folder' && node.children) {
        this.removeDescendantsFromOpenTabs(node.children);
      }
      
      this.deleteNodeFromTree(path, this.fileTree);
    }
  }

  private removeFromOpenTabs(path: string) {
    const index = this.openTabs.indexOf(path);
    if (index !== -1) {
      this.openTabs.splice(index, 1);
      if (this.activeTab === path) {
        this.activeTab = this.openTabs[0];
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
}

export const storage = new MemStorage();
