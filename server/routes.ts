import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { FluxoInterpreter } from "./fluxo-interpreter";
import { getAvailableExtensions } from "./extensions-catalog";
import JSZip from "jszip";
import multer from "multer";
import { randomUUID } from "crypto";
import type { FileNode } from "@shared/schema";
import {
  createFileRequestSchema,
  updateFileRequestSchema,
  renameFileRequestSchema,
  deleteFileRequestSchema,
  moveFileRequestSchema,
  createWorkspaceRequestSchema,
  executeCodeRequestSchema,
  executeWorkspaceRequestSchema,
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
      const extensionMap: Record<string, string> = {};
      
      const addFilesToZip = async (nodes: any[], currentPath: string = '') => {
        for (const node of nodes) {
          if (node.type === 'file' && node.content !== undefined) {
            const fileName = node.name;
            const filePath = currentPath ? `${currentPath}/${fileName}` : fileName;
            let fileContent = node.content;
            let finalFileName = fileName;
            
            if (fileName.endsWith('.fxm') || fileName.endsWith('.fxo')) {
              finalFileName = fileName.replace(/\.(fxm|fxo)$/, '.txt');
              const finalPath = currentPath ? `${currentPath}/${finalFileName}` : finalFileName;
              extensionMap[finalPath] = fileName.endsWith('.fxm') ? '.fxm' : '.fxo';
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
      
      zip.file('.fluxo-metadata.json', JSON.stringify(extensionMap, null, 2));
      
      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
      
      const sanitizedName = workspace.name.replace(/[^a-zA-Z0-9-_]/g, '_');
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizedName}_workspace.zip"`);
      res.send(zipBuffer);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to download workspace' });
    }
  });

  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }
  });

  app.post('/api/workspaces/import', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const workspaceName = req.body.name || 'Imported Workspace';
      
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(req.file.buffer);
      
      let extensionMap: Record<string, string> = {};
      const metadataFile = zipContent.file('.fluxo-metadata.json');
      if (metadataFile) {
        try {
          const metadataContent = await metadataFile.async('string');
          extensionMap = JSON.parse(metadataContent);
        } catch (e) {
          console.warn('Failed to parse metadata file, falling back to default behavior');
        }
      }
      
      const buildFileTree = async (zipFiles: JSZip.JSZipObject[]): Promise<FileNode[]> => {
        const fileMap = new Map<string, FileNode>();
        
        const allFiles = zipFiles.filter(f => !f.dir && f.name.trim() && f.name !== '.fluxo-metadata.json');
        
        for (const file of allFiles) {
          let content = await file.async('string');
          let filePath = file.name.startsWith('/') ? file.name : `/${file.name}`;
          
          const pathParts = filePath.split('/').filter(p => p);
          
          for (let i = 0; i < pathParts.length; i++) {
            const currentPath = '/' + pathParts.slice(0, i + 1).join('/');
            const isFile = i === pathParts.length - 1;
            
            if (!fileMap.has(currentPath)) {
              if (isFile) {
                let fileName = pathParts[i];
                const originalFilePath = file.name;
                
                if (fileName.endsWith('.txt') && extensionMap[originalFilePath]) {
                  const withoutTxt = fileName.substring(0, fileName.length - 4);
                  fileName = withoutTxt + extensionMap[originalFilePath];
                }
                
                const updatedPath = '/' + pathParts.slice(0, i).concat(fileName).join('/');
                
                const fileNode: FileNode = {
                  id: randomUUID(),
                  name: fileName,
                  type: 'file',
                  path: updatedPath,
                  extension: fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')) : '',
                  content,
                };
                fileMap.set(updatedPath, fileNode);
              } else {
                const folderNode: FileNode = {
                  id: randomUUID(),
                  name: pathParts[i],
                  type: 'folder',
                  path: currentPath,
                  children: [],
                };
                fileMap.set(currentPath, folderNode);
              }
            }
          }
        }
        
        const rootNodes: FileNode[] = [];
        
        Array.from(fileMap.entries()).forEach(([path, node]) => {
          const pathSegments = path.split('/').filter(p => p);
          
          if (pathSegments.length === 1) {
            rootNodes.push(node);
          } else {
            const parentPath = '/' + pathSegments.slice(0, -1).join('/');
            const parent = fileMap.get(parentPath);
            
            if (parent && parent.type === 'folder' && parent.children) {
              parent.children.push(node);
            }
          }
        });
        
        return rootNodes;
      };
      
      const allFiles = Object.values(zipContent.files);
      const fileTree = await buildFileTree(allFiles);
      
      const workspace = await storage.createWorkspaceFromImport(workspaceName, fileTree);
      
      res.status(201).json(workspace);
    } catch (error: any) {
      console.error('Failed to import workspace:', error);
      res.status(400).json({ error: error.message || 'Failed to import workspace' });
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
      // Load extensions from disk - they're all automatically installed and available
      const extensions = getAvailableExtensions();
      res.json(extensions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get extensions' });
    }
  });

  app.post('/api/extensions/toggle', async (req, res) => {
    try {
      const data = toggleExtensionRequestSchema.parse(req.body);
      const { toggleExtension } = await import("./extensions-loader");
      toggleExtension(data.id, data.enabled);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to toggle extension" });
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
