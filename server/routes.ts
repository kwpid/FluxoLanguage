import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { FluxoInterpreter } from "./fluxo-interpreter";
import { extensionsCatalog } from "./extensions-catalog";
import JSZip from "jszip";
import {
  createFileRequestSchema,
  updateFileRequestSchema,
  renameFileRequestSchema,
  deleteFileRequestSchema,
  moveFileRequestSchema,
  createWorkspaceRequestSchema,
  executeCodeRequestSchema,
  executeWorkspaceRequestSchema,
  downloadExtensionRequestSchema,
  installExtensionRequestSchema,
  uninstallExtensionRequestSchema,
  toggleExtensionRequestSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get('/api/workspace', async (req, res) => {
    try {
      const workspace = await storage.getWorkspace();
      res.json(workspace);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get workspace' });
    }
  });

  app.get('/api/workspace/symbols', async (req, res) => {
    try {
      const workspace = await storage.getWorkspace();
      
      const variables: string[] = [];
      const functions: string[] = [];
      
      const extractSymbols = (content: string) => {
        const varRegex = /(?:local|const|let|var)\s+([a-zA-Z_]\w*)/g;
        const funcRegex = /function\s+([a-zA-Z_]\w*)\s*\(/g;
        
        let match;
        while ((match = varRegex.exec(content)) !== null) {
          if (!variables.includes(match[1])) {
            variables.push(match[1]);
          }
        }
        
        while ((match = funcRegex.exec(content)) !== null) {
          if (!functions.includes(match[1])) {
            functions.push(match[1]);
          }
        }
      };
      
      const processNode = (node: any) => {
        if (node.type === 'file' && node.path.endsWith('.fxm') && node.content) {
          extractSymbols(node.content);
        }
        if (node.children) {
          node.children.forEach(processNode);
        }
      };
      
      workspace.fileTree.forEach(processNode);
      
      res.json({ variables, functions });
    } catch (error) {
      console.error('Failed to get workspace symbols:', error);
      res.json({ variables: [], functions: [] });
    }
  });

  app.get('/api/workspaces', async (req, res) => {
    try {
      
      const workspaces = await storage.getWorkspaceList();
      res.json(workspaces);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get workspaces' });
    }
  });

  app.post('/api/workspaces/create', async (req, res) => {
    try {
      
      const data = createWorkspaceRequestSchema.parse(req.body);
      const workspace = await storage.createWorkspace(data.name);
      res.status(201).json(workspace);
    } catch (error: any) {
      console.error('Failed to create workspace:', error);
      res.status(error.statusCode || 400).json({ error: error.message || 'Failed to create workspace' });
    }
  });

  app.post('/api/workspaces/switch', async (req, res) => {
    try {
      
      const { workspaceId } = req.body;
      await storage.switchWorkspace(workspaceId);
      
      const workspace = await storage.getWorkspace();
      res.json(workspace);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to switch workspace' });
    }
  });

  app.get('/api/workspaces/download', async (req, res) => {
    try {
      
      const workspace = await storage.getWorkspace();
      
      const zip = new JSZip();
      
      const addFilesToZip = async (nodes: any[], currentPath: string = '') => {
        for (const node of nodes) {
          if (node.type === 'file' && node.content !== undefined) {
            const fileName = node.name;
            const filePath = currentPath ? `${currentPath}/${fileName}` : fileName;
            let fileContent = node.content;
            let finalFileName = fileName;
            
            if (fileName.endsWith('.fxm') || fileName.endsWith('.fxo')) {
              finalFileName = fileName.replace(/\.(fxm|fxo)$/, '.txt');
            }
            
            const finalPath = currentPath ? `${currentPath}/${finalFileName}` : finalFileName;
            zip.file(finalPath, fileContent);
          } else if (node.type === 'folder' && node.children) {
            const folderPath = currentPath ? `${currentPath}/${node.name}` : node.name;
            await addFilesToZip(node.children, folderPath);
          }
        }
      };
      
      await addFilesToZip(workspace.fileTree);
      
      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
      
      const sanitizedName = workspace.name.replace(/[^a-zA-Z0-9-_]/g, '_');
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizedName}_workspace.zip"`);
      res.send(zipBuffer);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to download workspace' });
    }
  });

  app.delete('/api/workspaces/:workspaceId', async (req, res) => {
    try {
      
      const { workspaceId } = req.params;
      
      await storage.deleteWorkspace(workspaceId);
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to delete workspace' });
    }
  });

  app.get('/api/files/tree', async (req, res) => {
    try {
      
      const fileTree = await storage.getFileTree();
      res.json(fileTree);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get file tree' });
    }
  });

  app.get('/api/files/content', async (req, res) => {
    try {
      
      const path = req.query.path as string;
      if (!path) {
        return res.status(400).json({ error: 'Path is required' });
      }

      const content = await storage.getFileContent(path);
      if (content === undefined) {
        return res.status(404).json({ error: 'File not found' });
      }

      res.json({ content });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get file content' });
    }
  });

  app.post('/api/files/create', async (req, res) => {
    try {
      
      const data = createFileRequestSchema.parse(req.body);
      const newNode = await storage.createFile(
        data.parentPath,
        data.name,
        data.type,
        data.content
      );
      res.status(201).json(newNode);
    } catch (error: any) {
      console.error('Failed to create file:', error);
      res.status(error.statusCode || 400).json({ error: error.message || 'Failed to create file' });
    }
  });

  app.post('/api/files/save', async (req, res) => {
    try {
      
      const data = updateFileRequestSchema.parse(req.body);
      await storage.updateFile(data.path, data.content);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Failed to save file:', error);
      res.status(400).json({ error: error.message || 'Failed to save file' });
    }
  });

  app.post('/api/files/rename', async (req, res) => {
    try {
      
      const data = renameFileRequestSchema.parse(req.body);
      await storage.renameFile(data.oldPath, data.newName);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Failed to rename file:', error);
      res.status(error.statusCode || 400).json({ error: error.message || 'Failed to rename file' });
    }
  });

  app.post('/api/files/delete', async (req, res) => {
    try {
      
      const data = deleteFileRequestSchema.parse(req.body);
      await storage.deleteFile(data.path);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Failed to delete file:', error);
      res.status(400).json({ error: error.message || 'Failed to delete file' });
    }
  });

  app.post('/api/files/move', async (req, res) => {
    try {
      
      const data = moveFileRequestSchema.parse(req.body);
      await storage.moveFile(data.sourcePath, data.targetPath);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Failed to move file:', error);
      res.status(error.statusCode || 400).json({ error: error.message || 'Failed to move file' });
    }
  });

  app.post('/api/execute', async (req, res) => {
    try {
      const data = executeCodeRequestSchema.parse(req.body);
      const interpreter = new FluxoInterpreter(data.path);
      const isHtmlFile = data.path.endsWith('.html') || data.path.endsWith('.htm');
      const output = await interpreter.execute(data.code, isHtmlFile);
      res.json({ output });
    } catch (error: any) {
      res.json({ 
        output: [],
        error: error.message || 'Execution failed' 
      });
    }
  });

  app.post('/api/execute-workspace', async (req, res) => {
    try {
      
      const data = executeWorkspaceRequestSchema.parse(req.body);
      
      // Sort files: modules (.fxm) first, then scripts (.fxo)
      const moduleFiles = data.files.filter(f => f.path.endsWith('.fxm'));
      const scriptFiles = data.files.filter(f => f.path.endsWith('.fxo'));
      const sortedFiles = [...moduleFiles, ...scriptFiles];
      
      // Store all files temporarily in storage so imports can find them
      for (const file of data.files) {
        const fileContent = await storage.getFileContent(file.path);
        if (fileContent === undefined) {
          // File doesn't exist, create it
          const fileName = file.path.substring(file.path.lastIndexOf('/') + 1);
          const parentPath = file.path.substring(0, file.path.lastIndexOf('/')) || '/';
          
          // Ensure parent folder exists
          if (parentPath !== '/') {
            const parentParts = parentPath.split('/').filter(p => p);
            let currentPath = '';
            for (const part of parentParts) {
              const folderPath = currentPath === '' ? `/${part}` : `${currentPath}/${part}`;
              const folderContent = await storage.getFileContent(folderPath);
              if (folderContent === undefined) {
                // Create folder
                const folderParent = currentPath === '' ? '/' : currentPath;
                await storage.createFile(folderParent, part, 'folder');
              }
              currentPath = folderPath;
            }
          }
          
          await storage.createFile(parentPath, fileName, 'file', file.code);
        } else {
          // File exists, update it
          await storage.updateFile(file.path, file.code);
        }
      }
      
      // Create a shared interpreter context using the entry point
      const interpreter = new FluxoInterpreter(data.entryPoint);
      let allOutput: any[] = [];
      
      // Execute all files in order
      for (const file of sortedFiles) {
        try {
          // Create interpreter with correct file path for each file
          const fileInterpreter = new FluxoInterpreter(file.path);
          // Copy context from main interpreter to share modules/variables
          fileInterpreter['context'] = interpreter['context'];
          const output = await fileInterpreter.execute(file.code, false);
          allOutput = [...allOutput, ...output];
        } catch (error: any) {
          allOutput.push({
            id: crypto.randomUUID(),
            type: 'error',
            message: `Error in ${file.path}: ${error.message}`,
            timestamp: Date.now(),
            filePath: file.path,
          });
        }
      }
      
      res.json({ output: allOutput });
    } catch (error: any) {
      res.json({ 
        output: [],
        error: error.message || 'Workspace execution failed' 
      });
    }
  });

  app.post('/api/workspace/state', async (req, res) => {
    try {
      
      const { openTabs, activeTab } = req.body;
      await storage.updateWorkspaceState(openTabs || [], activeTab);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Failed to update workspace state:', error);
      res.status(400).json({ error: error.message || 'Failed to update workspace state' });
    }
  });

  app.get('/api/extensions', async (req, res) => {
    try {
      
      const extensions = await storage.getExtensions();
      res.json(extensions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get extensions' });
    }
  });

  app.post('/api/extensions/download', async (req, res) => {
    try {
      
      const data = downloadExtensionRequestSchema.parse(req.body);
      
      // Get extension metadata from extensions catalog, or use defaults for custom extensions
      const catalogExtension = extensionsCatalog.find(ext => ext.id === data.id);
      
      const extension = catalogExtension ? {
        ...catalogExtension,
        enabled: false,
        downloadedAt: Date.now(),
        isInstalled: false,
        isCustom: false,
      } : {
        id: data.id,
        name: data.id,
        version: '1.0.0',
        description: 'Custom extension',
        author: 'User',
        category: 'utility' as const,
        enabled: false,
        downloadedAt: Date.now(),
        isInstalled: false,
        isCustom: true,
        packages: [], // Empty packages array for custom extensions
      };
      
      await storage.downloadExtension(extension);
      res.json(extension);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to download extension' });
    }
  });

  app.post('/api/extensions/install', async (req, res) => {
    try {
      
      const data = installExtensionRequestSchema.parse(req.body);
      const extension = await storage.installExtension(data.id);
      
      // If HTML Supporter extension, create template files
      if (data.id === 'html-supporter') {
        try {
          // Create HTML templates folder first (ignore if it already exists)
          try {
            await storage.createFile('/', 'html-templates', 'folder');
          } catch (folderError: any) {
            // Folder might already exist, that's OK
            if (!folderError.message?.includes('already exists')) {
              throw folderError;
            }
          }
          
          const htmlTemplateContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fluxo HTML Template</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">
    <h1>Welcome to Fluxo HTML Support!</h1>
    <p>This template demonstrates importing Fluxo modules from HTML.</p>
    <button id="myButton" class="btn">Click Me!</button>
    <div id="output"></div>
  </div>
  
  <!-- Import Fluxo module using data-fluxo-entry attribute -->
  <script type="module" data-fluxo-entry="app.fxm"></script>
</body>
</html>`;

          const cssTemplateContent = `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
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
  max-width: 500px;
  width: 100%;
  text-align: center;
}

h1 {
  color: #333;
  margin-bottom: 20px;
  font-size: 28px;
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
  padding: 12px 30px;
  font-size: 16px;
  border-radius: 5px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
}

.btn:active {
  transform: translateY(0);
}

#output {
  margin-top: 20px;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 5px;
  color: #333;
  font-weight: 500;
  min-height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}`;

          const fluxoModuleContent = `// app.fxm - Main Fluxo Module for HTML Template
// This module is imported by the HTML file using data-fluxo-entry

require("loader.fxm")

module app {
  // Export a function to handle button click
  export function handleButtonClick() {
    console.log("Button clicked from Fluxo module!")
    
    // Get the button element and change its text
    local button = document.getElementById("myButton")
    if (button != null) {
      button.textContent = "Clicked!"
    }
    
    // Show a message in the output area
    local outputDiv = document.getElementById("output")
    if (outputDiv != null) {
      outputDiv.textContent = "Button was clicked successfully!"
    }
  }
  
  // Example: Log a message when module loads
  export function init() {
    console.log("Fluxo app module initialized!")
    
    // Attach click event to button
    local button = document.getElementById("myButton")
    if (button != null) {
      button.addEventListener("click", app.handleButtonClick)
    }
  }
}

// Call init when module loads
app.init()`;

          const loaderModuleContent = `// loader.fxm - Loader/Utilities Module
// This module is loaded by app.fxm and provides helper functions

module loader {
  // Helper function to safely get elements
  export function getElement(id) {
    local element = document.getElementById(id)
    if (element == null) {
      console.log("Warning: Element with ID '" + id + "' not found")
    }
    return element
  }
  
  // Helper function to set text content safely
  export function setText(id, text) {
    local element = loader.getElement(id)
    if (element != null) {
      element.textContent = text
    }
  }
  
  // Helper function to add click listener
  export function onClick(id, callback) {
    local element = loader.getElement(id)
    if (element != null) {
      element.addEventListener("click", callback)
    }
  }
  
  // Log when loader module is ready
  export function init() {
    console.log("Fluxo loader module initialized!")
  }
}

// Call init when module loads
loader.init()`;

          const readmeContent = `# Fluxo HTML Support

This folder demonstrates how to use HTML with Fluxo modules.

## How It Works

1. **HTML files import Fluxo modules** - HTML files cannot contain embedded Fluxo code. Instead, they import external Fluxo files using the \`data-fluxo-entry\` attribute:

   \`\`\`html
   <script type="module" data-fluxo-entry="app.fxm"></script>
   \`\`\`

2. **Fluxo Module Files (.fxm)** - These files contain modules that can export functions and variables for use in your application.

3. **Folder Imports** - You can import all Fluxo files from a folder using:

   \`\`\`fluxo
   module folder "./scripts" as myScripts
   \`\`\`

## Best Practices

- Use module files (.fxm) for organized, reusable code
- Use regular Fluxo files (.fxo) for standalone scripts
- Import modules from HTML to keep code separate and maintainable

## Example Usage

See \`example.html\` and \`app.fxm\` for a working example.
`;

          // Create the html-templates folder and files (skip if they already exist)
          const files = [
            { name: 'example.html', content: htmlTemplateContent },
            { name: 'styles.css', content: cssTemplateContent },
            { name: 'app.fxm', content: fluxoModuleContent },
            { name: 'loader.fxm', content: loaderModuleContent },
            { name: 'README.md', content: readmeContent },
          ];
          
          for (const file of files) {
            const filePath = `/html-templates/${file.name}`;
            const exists = await storage.getFileContent(filePath);
            if (exists === undefined) {
              await storage.createFile('/html-templates', file.name, 'file', file.content);
            }
          }
        } catch (fileError) {
          console.error('Failed to create template files:', fileError);
          // Continue anyway, don't fail the extension installation
        }
      }
      
      res.json(extension);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to install extension' });
    }
  });

  app.post('/api/extensions/uninstall', async (req, res) => {
    try {
      
      const data = uninstallExtensionRequestSchema.parse(req.body);
      await storage.uninstallExtension(data.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to uninstall extension' });
    }
  });

  app.post('/api/extensions/toggle', async (req, res) => {
    try {
      
      const data = toggleExtensionRequestSchema.parse(req.body);
      await storage.toggleExtension(data.id, data.enabled);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to toggle extension' });
    }
  });

  app.get('/api/symbols', async (req, res) => {
    try {
      
      const fileTree = await storage.getFileTree();
      const symbols: { variables: string[], functions: string[] } = {
        variables: [],
        functions: []
      };

      const extractSymbols = async (nodes: any[]) => {
        for (const node of nodes) {
          if (node.type === 'file' && (node.extension === '.fxo' || node.extension === '.fxm')) {
            const content = await storage.getFileContent(node.path);
            if (content) {
              const varRegex = /local\s+(\w+)\s*=/g;
              let varMatch;
              while ((varMatch = varRegex.exec(content)) !== null) {
                if (!symbols.variables.includes(varMatch[1])) {
                  symbols.variables.push(varMatch[1]);
                }
              }
              
              const funcRegex = /function\s+(\w+)\s*\(/g;
              let funcMatch;
              while ((funcMatch = funcRegex.exec(content)) !== null) {
                if (!symbols.functions.includes(funcMatch[1])) {
                  symbols.functions.push(funcMatch[1]);
                }
              }

              const exportFuncRegex = /export\s+function\s+(\w+)\s*\(/g;
              let exportFuncMatch;
              while ((exportFuncMatch = exportFuncRegex.exec(content)) !== null) {
                if (!symbols.functions.includes(exportFuncMatch[1])) {
                  symbols.functions.push(exportFuncMatch[1]);
                }
              }
            }
          }
          
          if (node.children) {
            await extractSymbols(node.children);
          }
        }
      };

      await extractSymbols(fileTree);
      res.json(symbols);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to extract workspace symbols' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
