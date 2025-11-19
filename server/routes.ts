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

  const httpServer = createServer(app);
  return httpServer;
}
