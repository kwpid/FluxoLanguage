import { useState } from "react";
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
import { FolderTree, Plus, Trash2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WorkspaceSelectorProps {
  currentWorkspaceName: string;
}

export function WorkspaceSelector({ currentWorkspaceName }: WorkspaceSelectorProps) {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");

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
    </>
  );
}
