import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { WorkspaceListItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderTree, Plus, Trash2, Check, Download, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WorkspaceSelectorProps {
  currentWorkspaceName: string;
}

export function WorkspaceSelector({ currentWorkspaceName }: WorkspaceSelectorProps) {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [importWorkspaceName, setImportWorkspaceName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: workspaces = [] } = useQuery<WorkspaceListItem[]>({
    queryKey: ['/api/workspaces'],
  });

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) {
      toast({
        title: "Error",
        description: "Workspace name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest('POST', '/api/workspaces/create', { name: newWorkspaceName });
      setCreateDialogOpen(false);
      setNewWorkspaceName("");
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workspace'] });
      toast({
        title: "Success",
        description: "Workspace created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create workspace",
        variant: "destructive",
      });
    }
  };

  const handleSwitchWorkspace = async (workspaceId: string, workspaceName: string) => {
    if (workspaceName === currentWorkspaceName) {
      return;
    }
    
    try {
      await apiRequest('POST', '/api/workspaces/switch', { workspaceId });
      await queryClient.invalidateQueries({ queryKey: ['/api/workspace'] });
      toast({
        title: "Success",
        description: `Switched to "${workspaceName}" workspace`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to switch workspace",
        variant: "destructive",
      });
    }
  };

  const handleDeleteWorkspace = async (workspaceId: string) => {
    if (workspaces.length <= 1) {
      toast({
        title: "Error",
        description: "Cannot delete the last workspace",
        variant: "destructive",
      });
      return;
    }

    try {
      await fetch(`/api/workspaces/${workspaceId}`, { method: 'DELETE' });
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workspace'] });
      toast({
        title: "Success",
        description: "Workspace deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete workspace",
        variant: "destructive",
      });
    }
  };

  const handleDownloadWorkspace = async () => {
    try {
      const response = await fetch('/api/workspaces/download', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : `${currentWorkspaceName}_workspace.zip`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "Workspace downloaded successfully. Fluxo files (.fxm/.fxo) have been converted to .txt for compatibility.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download workspace",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.zip')) {
        toast({
          title: "Error",
          description: "Please select a .zip file",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      const baseName = file.name.replace('.zip', '').replace(/_workspace$/, '');
      setImportWorkspaceName(baseName || 'Imported Workspace');
    }
  };

  const handleImportWorkspace = async () => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a file to import",
        variant: "destructive",
      });
      return;
    }

    if (!importWorkspaceName.trim()) {
      toast({
        title: "Error",
        description: "Workspace name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('name', importWorkspaceName);

      const response = await fetch('/api/workspaces/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Import failed');
      }

      setImportDialogOpen(false);
      setSelectedFile(null);
      setImportWorkspaceName("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workspace'] });
      
      toast({
        title: "Success",
        description: "Workspace imported successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to import workspace",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            data-testid="button-workspace-selector"
          >
            <FolderTree className="h-4 w-4" />
            {currentWorkspaceName}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {workspaces.map((workspace) => {
            const isCurrentWorkspace = workspace.name === currentWorkspaceName;
            return (
              <DropdownMenuItem
                key={workspace.id}
                className="flex items-center justify-between cursor-pointer"
                onClick={() => handleSwitchWorkspace(workspace.id, workspace.name)}
                data-testid={`workspace-item-${workspace.id}`}
              >
                <div className="flex items-center gap-2 flex-1">
                  {isCurrentWorkspace && (
                    <Check className="h-4 w-4 text-primary" data-testid="icon-current-workspace" />
                  )}
                  <span className={isCurrentWorkspace ? "font-medium" : ""}>
                    {workspace.name}
                  </span>
                </div>
                {workspaces.length > 1 && !isCurrentWorkspace && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteWorkspace(workspace.id);
                    }}
                    data-testid={`button-delete-workspace-${workspace.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleDownloadWorkspace}
            className="cursor-pointer"
            data-testid="button-download-workspace"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Workspace
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setImportDialogOpen(true)}
            className="cursor-pointer"
            data-testid="button-import-workspace"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Workspace
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setCreateDialogOpen(true)}
            className="cursor-pointer"
            data-testid="button-new-workspace"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
            <DialogDescription>
              Create a fresh workspace with no files. Perfect for starting a new project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace Name</Label>
              <Input
                id="workspace-name"
                placeholder="My New Project"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateWorkspace();
                  }
                }}
                data-testid="input-workspace-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setCreateDialogOpen(false)}
              data-testid="button-cancel-workspace"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateWorkspace}
              data-testid="button-create-workspace"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Workspace</DialogTitle>
            <DialogDescription>
              Import a workspace from a previously downloaded .zip file. The workspace will be created automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="import-file">Workspace File (.zip)</Label>
              <Input
                id="import-file"
                type="file"
                accept=".zip"
                ref={fileInputRef}
                onChange={handleFileSelect}
                data-testid="input-import-file"
              />
            </div>
            {selectedFile && (
              <div className="space-y-2">
                <Label htmlFor="import-workspace-name">Workspace Name</Label>
                <Input
                  id="import-workspace-name"
                  placeholder="My Imported Project"
                  value={importWorkspaceName}
                  onChange={(e) => setImportWorkspaceName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleImportWorkspace();
                    }
                  }}
                  data-testid="input-import-workspace-name"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setImportDialogOpen(false);
                setSelectedFile(null);
                setImportWorkspaceName("");
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              data-testid="button-cancel-import"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleImportWorkspace}
              disabled={!selectedFile}
              data-testid="button-import-workspace-confirm"
            >
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
