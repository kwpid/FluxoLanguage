import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { FluxoInterpreter } from "./fluxo-interpreter";
import {
  createFileRequestSchema,
  updateFileRequestSchema,
  renameFileRequestSchema,
  deleteFileRequestSchema,
  moveFileRequestSchema,
  createWorkspaceRequestSchema,
  executeCodeRequestSchema,
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
      res.json(workspace);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create workspace' });
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
      res.json(newNode);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create file' });
    }
  });

  app.post('/api/files/save', async (req, res) => {
    try {
      const data = updateFileRequestSchema.parse(req.body);
      await storage.updateFile(data.path, data.content);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: 'Failed to save file' });
    }
  });

  app.post('/api/files/rename', async (req, res) => {
    try {
      const data = renameFileRequestSchema.parse(req.body);
      await storage.renameFile(data.oldPath, data.newName);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: 'Failed to rename file' });
    }
  });

  app.post('/api/files/delete', async (req, res) => {
    try {
      const data = deleteFileRequestSchema.parse(req.body);
      await storage.deleteFile(data.path);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete file' });
    }
  });

  app.post('/api/files/move', async (req, res) => {
    try {
      const data = moveFileRequestSchema.parse(req.body);
      await storage.moveFile(data.sourcePath, data.targetPath);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to move file' });
    }
  });

  app.post('/api/execute', async (req, res) => {
    try {
      const data = executeCodeRequestSchema.parse(req.body);
      const interpreter = new FluxoInterpreter(data.path);
      const output = await interpreter.execute(data.code);
      res.json({ output });
    } catch (error: any) {
      res.json({ 
        output: [],
        error: error.message || 'Execution failed' 
      });
    }
  });

  app.post('/api/workspace/state', async (req, res) => {
    try {
      const { openTabs, activeTab } = req.body;
      await storage.updateWorkspaceState(openTabs || [], activeTab);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: 'Failed to update workspace state' });
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

  app.post('/api/extensions/install', async (req, res) => {
    try {
      const data = installExtensionRequestSchema.parse(req.body);
      
      // Get extension metadata from available extensions
      const extensionMeta = data.id === 'html-supporter' ? {
        name: 'HTMLSupporter',
        version: '1.0.0',
        description: 'Enables HTML and CSS element creation with event handling support',
        author: 'Fluxo Team',
        category: 'language' as const,
      } : {
        name: data.id,
        version: '1.0.0',
        description: 'Custom extension',
        author: 'User',
        category: 'utility' as const,
      };
      
      const extension = {
        ...data,
        ...extensionMeta,
        enabled: true,
        installedAt: Date.now(),
      };
      
      await storage.installExtension(extension);
      
      // If HTML Supporter extension, create template files
      if (data.id === 'html-supporter') {
        try {
          // Create HTML templates folder if it doesn't exist
          const htmlTemplateContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fluxo HTML Template</title>
  <link rel="stylesheet" href="/html-templates/styles.css">
</head>
<body>
  <div class="container">
    <h1>Welcome to Fluxo HTML Support!</h1>
    <p>This is a template to test HTML and CSS with Fluxo.</p>
    <button id="myButton" class="btn">Click Me!</button>
    <div id="output"></div>
  </div>
  
  <script>
    // You can add JavaScript here to interact with your Fluxo code
    document.getElementById('myButton').addEventListener('click', function() {
      document.getElementById('output').textContent = 'Button clicked!';
    });
  </script>
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

          // Create the html-templates folder and files
          await storage.createFile('/html-templates', 'index.html', 'file', htmlTemplateContent);
          await storage.createFile('/html-templates', 'styles.css', 'file', cssTemplateContent);
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

  const httpServer = createServer(app);
  return httpServer;
}
