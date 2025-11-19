import { useState } from "react";
import { FileNode } from "@shared/schema";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Plus, FolderPlus, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateFileDialog } from "./create-file-dialog";
import { RenameDialog } from "./rename-dialog";
import { DeleteDialog } from "./delete-dialog";

interface FileExplorerProps {
  fileTree: FileNode[];
  onFileClick: (path: string) => void;
  onRefresh: () => void;
}

export function FileExplorer({ fileTree, onFileClick, onRefresh }: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/', '/scripts', '/modules']));
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createType, setCreateType] = useState<'file' | 'folder'>('file');
  const [createParentPath, setCreateParentPath] = useState('/');
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameNode, setRenameNode] = useState<FileNode | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteNode, setDeleteNode] = useState<FileNode | null>(null);
  const [draggedNode, setDraggedNode] = useState<FileNode | null>(null);
  const [dropTargetPath, setDropTargetPath] = useState<string | null>(null);

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const handleCreateFile = (parentPath: string, type: 'file' | 'folder') => {
    setCreateParentPath(parentPath);
    setCreateType(type);
    setCreateDialogOpen(true);
  };

  const handleRename = (node: FileNode) => {
    setRenameNode(node);
    setRenameDialogOpen(true);
  };

  const handleDelete = (node: FileNode) => {
    setDeleteNode(node);
    setDeleteDialogOpen(true);
  };

  const handleDragStart = (e: React.DragEvent, node: FileNode) => {
    e.stopPropagation();
    setDraggedNode(node);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, node: FileNode) => {
    if (node.type === 'folder' && draggedNode && draggedNode.path !== node.path) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      setDropTargetPath(node.path);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setDropTargetPath(null);
  };

  const handleDrop = async (e: React.DragEvent, targetNode: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetPath(null);

    if (!draggedNode || targetNode.type !== 'folder' || draggedNode.path === targetNode.path) {
      return;
    }

    if (targetNode.path.startsWith(draggedNode.path + '/')) {
      return;
    }

    try {
      await fetch('/api/files/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourcePath: draggedNode.path,
          targetPath: targetNode.path,
        }),
      });
      onRefresh();
    } catch (error) {
      console.error('Failed to move file:', error);
    }

    setDraggedNode(null);
  };

  const handleDragEnd = () => {
    setDraggedNode(null);
    setDropTargetPath(null);
  };

  const renderNode = (node: FileNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(node.path);
    const isFolder = node.type === 'folder';
    const isDropTarget = dropTargetPath === node.path;

    return (
      <div key={node.path}>
        <ContextMenu>
          <ContextMenuTrigger>
            <div
              className={`
                flex items-center h-7 px-2 cursor-pointer hover-elevate rounded-md
                ${level > 0 ? `ml-${level * 4}` : ''}
                ${isDropTarget ? 'bg-primary/20 border-2 border-primary' : ''}
              `}
              style={{ paddingLeft: `${level * 16 + 8}px` }}
              draggable
              onDragStart={(e) => handleDragStart(e, node)}
              onDragOver={(e) => handleDragOver(e, node)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, node)}
              onDragEnd={handleDragEnd}
              onClick={() => {
                if (isFolder) {
                  toggleFolder(node.path);
                } else {
                  onFileClick(node.path);
                }
              }}
              data-testid={`file-tree-item-${node.path}`}
            >
              {isFolder && (
                <span className="mr-1">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </span>
              )}
              {isFolder ? (
                isExpanded ? (
                  <FolderOpen className="h-4 w-4 mr-2 text-primary" />
                ) : (
                  <Folder className="h-4 w-4 mr-2 text-primary" />
                )
              ) : (
                <File className="h-4 w-4 mr-2 text-muted-foreground" />
              )}
              <span className="text-[13px] font-medium truncate">{node.name}</span>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-52">
            {isFolder && (
              <>
                <ContextMenuItem onClick={() => handleCreateFile(node.path, 'file')} data-testid="context-new-file">
                  <File className="h-4 w-4 mr-2" />
                  New File
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleCreateFile(node.path, 'folder')} data-testid="context-new-folder">
                  <FolderPlus className="h-4 w-4 mr-2" />
                  New Folder
                </ContextMenuItem>
                <ContextMenuSeparator />
              </>
            )}
            <ContextMenuItem onClick={() => handleRename(node)} data-testid="context-rename">
              <Edit2 className="h-4 w-4 mr-2" />
              Rename
            </ContextMenuItem>
            <ContextMenuItem 
              onClick={() => handleDelete(node)}
              className="text-destructive focus:text-destructive"
              data-testid="context-delete"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {isFolder && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-card border-r border-card-border">
      <div className="flex items-center justify-between h-10 px-3 border-b border-card-border">
        <span className="text-sm font-semibold">Explorer</span>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => handleCreateFile('/', 'file')}
            data-testid="button-new-file"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => handleCreateFile('/', 'folder')}
            data-testid="button-new-folder"
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1" data-testid="scroll-file-tree">
        <div className="p-2">
          {fileTree.map(node => renderNode(node))}
        </div>
      </ScrollArea>

      <CreateFileDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        parentPath={createParentPath}
        type={createType}
        onSuccess={onRefresh}
      />

      <RenameDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        node={renameNode}
        onSuccess={onRefresh}
      />

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        node={deleteNode}
        onSuccess={onRefresh}
      />
    </div>
  );
}
