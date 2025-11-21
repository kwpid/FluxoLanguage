// @ts-nocheck - TODO: Fix TypeScript inference issues with Supabase Database types
import { type FileNode, type WorkspaceState, type WorkspaceListItem, type Extension } from "@shared/schema";
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@shared/database.types';
import type { IStorage } from "./storage";

export class SupabaseStorage implements IStorage {
  private userId: string;
  private supabase: SupabaseClient<Database>;
  private currentWorkspaceId: string | null = null;

  constructor(userId: string, accessToken?: string, initialWorkspaceId?: string | null) {
    this.userId = userId;
    this.currentWorkspaceId = initialWorkspaceId || null;
    
    if (accessToken) {
      this.supabase = createClient<Database>(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        }
      );
    } else {
      this.supabase = createClient<Database>(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!
      );
    }
  }

  private async ensureDefaultWorkspace(): Promise<string> {
    const { data: workspaces } = await this.supabase
      .from('workspaces')
      .select('id')
      .eq('user_id', this.userId)
      .limit(1);

    if (!workspaces || workspaces.length === 0) {
      const { data: newWorkspace, error } = await this.supabase
        .from('workspaces')
        .insert({
          user_id: this.userId,
          name: 'Main Workspace',
          open_tabs: ['/README.fxo'],
          active_tab: '/README.fxo',
        })
        .select()
        .single();

      if (error) throw error;

      await this.supabase.from('files').insert({
        workspace_id: newWorkspace.id,
        name: 'README.fxo',
        type: 'file',
        path: '/README.fxo',
        parent_path: '/',
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
      });

      return newWorkspace.id;
    }

    return workspaces[0].id;
  }

  private async getDefaultWorkspaceId(): Promise<string> {
    if (this.currentWorkspaceId) {
      return this.currentWorkspaceId;
    }

    const { data: workspaces } = await this.supabase
      .from('workspaces')
      .select('id')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: true })
      .limit(1);

    if (!workspaces || workspaces.length === 0) {
      this.currentWorkspaceId = await this.ensureDefaultWorkspace();
      return this.currentWorkspaceId;
    }

    this.currentWorkspaceId = workspaces[0].id;
    return this.currentWorkspaceId;
  }

  private async buildFileTree(workspaceId: string): Promise<FileNode[]> {
    const { data: files, error } = await this.supabase
      .from('files')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('path', { ascending: true });

    if (error) throw error;
    if (!files) return [];

    const fileMap = new Map<string, FileNode>();
    const rootFiles: FileNode[] = [];

    files.forEach(file => {
      const node: FileNode = {
        id: file.id,
        name: file.name,
        type: file.type as 'file' | 'folder',
        path: file.path,
        content: file.content || undefined,
        extension: file.extension || undefined,
        children: file.type === 'folder' ? [] : undefined,
      };
      fileMap.set(file.path, node);
    });

    files.forEach(file => {
      const node = fileMap.get(file.path)!;
      if (file.parent_path === '/' || !file.parent_path) {
        rootFiles.push(node);
      } else {
        const parent = fileMap.get(file.parent_path);
        if (parent && parent.children) {
          parent.children.push(node);
        }
      }
    });

    return rootFiles;
  }

  async getWorkspaceList(): Promise<WorkspaceListItem[]> {
    const { data, error } = await this.supabase
      .from('workspaces')
      .select('id, name')
      .eq('user_id', this.userId);

    if (error) throw error;
    return data || [];
  }

  async getCurrentWorkspaceId(): Promise<string> {
    return await this.getDefaultWorkspaceId();
  }

  async createWorkspace(name: string): Promise<WorkspaceState> {
    const { data, error } = await this.supabase
      .from('workspaces')
      .insert({
        user_id: this.userId,
        name,
        open_tabs: [],
        active_tab: null,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      openTabs: data.open_tabs,
      activeTab: data.active_tab || undefined,
      fileTree: [],
      extensions: [],
    };
  }

  async switchWorkspace(workspaceId: string): Promise<void> {
    const { data } = await this.supabase
      .from('workspaces')
      .select('id')
      .eq('id', workspaceId)
      .eq('user_id', this.userId)
      .single();

    if (!data) {
      throw new Error('Workspace not found or access denied');
    }

    // Actually switch to the new workspace
    this.currentWorkspaceId = workspaceId;
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    const workspaces = await this.getWorkspaceList();
    if (workspaces.length <= 1) {
      throw new Error('Cannot delete the last workspace');
    }

    const { error } = await this.supabase
      .from('workspaces')
      .delete()
      .eq('id', workspaceId)
      .eq('user_id', this.userId);

    if (error) throw error;
  }

  async getWorkspace(): Promise<WorkspaceState> {
    const workspaceId = await this.getDefaultWorkspaceId();

    const { data: workspace, error } = await this.supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single();

    if (error) throw error;

    const fileTree = await this.buildFileTree(workspaceId);

    const { data: extensions } = await this.supabase
      .from('workspace_extensions')
      .select('*')
      .eq('workspace_id', workspaceId);

    return {
      id: workspace.id,
      name: workspace.name,
      openTabs: workspace.open_tabs,
      activeTab: workspace.active_tab || undefined,
      fileTree,
      extensions: (extensions || []).map(ext => ({
        id: ext.extension_id,
        name: ext.name,
        version: ext.version,
        description: ext.description,
        author: ext.author,
        category: ext.category as Extension['category'],
        enabled: ext.enabled,
        downloadedAt: ext.downloaded_at ? new Date(ext.downloaded_at).getTime() : undefined,
        installedAt: ext.installed_at ? new Date(ext.installed_at).getTime() : undefined,
        isInstalled: ext.is_installed,
      })),
    };
  }

  async updateWorkspaceState(openTabs: string[], activeTab?: string): Promise<void> {
    const workspaceId = await this.getDefaultWorkspaceId();

    const { error } = await this.supabase
      .from('workspaces')
      .update({
        open_tabs: openTabs,
        active_tab: activeTab || null,
      })
      .eq('id', workspaceId);

    if (error) throw error;
  }

  async getFileTree(): Promise<FileNode[]> {
    const workspaceId = await this.getDefaultWorkspaceId();
    return await this.buildFileTree(workspaceId);
  }

  async getFileContent(path: string): Promise<string | undefined> {
    const workspaceId = await this.getDefaultWorkspaceId();

    const { data, error } = await this.supabase
      .from('files')
      .select('content')
      .eq('workspace_id', workspaceId)
      .eq('path', path)
      .single();

    if (error) return undefined;
    return data?.content || undefined;
  }

  async createFile(parentPath: string, name: string, type: 'file' | 'folder', content?: string): Promise<FileNode> {
    const workspaceId = await this.getDefaultWorkspaceId();
    const newPath = parentPath === '/' ? `/${name}` : `${parentPath}/${name}`;

    const { data, error } = await this.supabase
      .from('files')
      .insert({
        workspace_id: workspaceId,
        name,
        type,
        path: newPath,
        content: type === 'file' ? (content || '') : null,
        parent_path: parentPath,
        extension: type === 'file' ? name.substring(name.lastIndexOf('.')) : null,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      type: data.type as 'file' | 'folder',
      path: data.path,
      content: data.content || undefined,
      extension: data.extension || undefined,
      children: data.type === 'folder' ? [] : undefined,
    };
  }

  async updateFile(path: string, content: string): Promise<void> {
    const workspaceId = await this.getDefaultWorkspaceId();

    const { error } = await this.supabase
      .from('files')
      .update({ content })
      .eq('workspace_id', workspaceId)
      .eq('path', path);

    if (error) throw error;
  }

  async renameFile(oldPath: string, newName: string): Promise<void> {
    const workspaceId = await this.getDefaultWorkspaceId();
    const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/')) || '/';
    const newPath = parentPath === '/' ? `/${newName}` : `${parentPath}/${newName}`;

    const { error } = await this.supabase
      .from('files')
      .update({
        name: newName,
        path: newPath,
        extension: newName.includes('.') ? newName.substring(newName.lastIndexOf('.')) : null,
      })
      .eq('workspace_id', workspaceId)
      .eq('path', oldPath);

    if (error) throw error;

    const { data: childFiles } = await this.supabase
      .from('files')
      .select('path')
      .eq('workspace_id', workspaceId)
      .like('path', `${oldPath}/%`);

    if (childFiles && childFiles.length > 0) {
      for (const child of childFiles) {
        const newChildPath = child.path.replace(oldPath, newPath);
        await this.supabase
          .from('files')
          .update({ path: newChildPath })
          .eq('workspace_id', workspaceId)
          .eq('path', child.path);
      }
    }
  }

  async deleteFile(path: string): Promise<void> {
    const workspaceId = await this.getDefaultWorkspaceId();

    const { data: fileToDelete } = await this.supabase
      .from('files')
      .select('type')
      .eq('workspace_id', workspaceId)
      .eq('path', path)
      .single();

    if (!fileToDelete) {
      throw new Error('File not found');
    }

    if (fileToDelete.type === 'folder') {
      const { error: childrenError } = await this.supabase
        .from('files')
        .delete()
        .eq('workspace_id', workspaceId)
        .like('path', `${path}/%`);

      if (childrenError) throw childrenError;
    }

    const { error } = await this.supabase
      .from('files')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('path', path);

    if (error) throw error;
  }

  async moveFile(sourcePath: string, targetPath: string): Promise<void> {
    const workspaceId = await this.getDefaultWorkspaceId();

    const { data: sourceFile } = await this.supabase
      .from('files')
      .select('name')
      .eq('workspace_id', workspaceId)
      .eq('path', sourcePath)
      .single();

    if (!sourceFile) throw new Error('Source file not found');

    const newPath = `${targetPath}/${sourceFile.name}`;

    const { error } = await this.supabase
      .from('files')
      .update({
        path: newPath,
        parent_path: targetPath,
      })
      .eq('workspace_id', workspaceId)
      .eq('path', sourcePath);

    if (error) throw error;
  }

  async getExtensions(): Promise<Extension[]> {
    const workspaceId = await this.getDefaultWorkspaceId();

    const { data, error } = await this.supabase
      .from('workspace_extensions')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (error) throw error;

    return (data || []).map(ext => ({
      id: ext.extension_id,
      name: ext.name,
      version: ext.version,
      description: ext.description,
      author: ext.author,
      category: ext.category as Extension['category'],
      enabled: ext.enabled,
      downloadedAt: ext.downloaded_at ? new Date(ext.downloaded_at).getTime() : undefined,
      installedAt: ext.installed_at ? new Date(ext.installed_at).getTime() : undefined,
      isInstalled: ext.is_installed,
    }));
  }

  async downloadExtension(extension: Extension): Promise<void> {
    const workspaceId = await this.getDefaultWorkspaceId();

    const { error } = await this.supabase
      .from('workspace_extensions')
      .insert({
        workspace_id: workspaceId,
        extension_id: extension.id,
        name: extension.name,
        version: extension.version,
        description: extension.description,
        author: extension.author,
        category: extension.category,
        enabled: false,
        downloaded_at: new Date().toISOString(),
        is_installed: false,
      });

    if (error) throw error;
  }

  async installExtension(extensionId: string): Promise<Extension> {
    const workspaceId = await this.getDefaultWorkspaceId();

    const { data, error } = await this.supabase
      .from('workspace_extensions')
      .update({
        is_installed: true,
        installed_at: new Date().toISOString(),
        enabled: true,
      })
      .eq('workspace_id', workspaceId)
      .eq('extension_id', extensionId)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.extension_id,
      name: data.name,
      version: data.version,
      description: data.description,
      author: data.author,
      category: data.category as Extension['category'],
      enabled: data.enabled,
      downloadedAt: data.downloaded_at ? new Date(data.downloaded_at).getTime() : undefined,
      installedAt: data.installed_at ? new Date(data.installed_at).getTime() : undefined,
      isInstalled: data.is_installed,
    };
  }

  async uninstallExtension(extensionId: string): Promise<void> {
    const workspaceId = await this.getDefaultWorkspaceId();

    const { error } = await this.supabase
      .from('workspace_extensions')
      .update({
        is_installed: false,
        installed_at: null,
        enabled: false,
      })
      .eq('workspace_id', workspaceId)
      .eq('extension_id', extensionId);

    if (error) throw error;
  }

  async toggleExtension(extensionId: string, enabled: boolean): Promise<void> {
    const workspaceId = await this.getDefaultWorkspaceId();

    const { error } = await this.supabase
      .from('workspace_extensions')
      .update({ enabled })
      .eq('workspace_id', workspaceId)
      .eq('extension_id', extensionId);

    if (error) throw error;
  }
}
