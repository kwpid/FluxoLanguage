import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FileNode } from "@shared/schema";

interface RenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: FileNode | null;
  onSuccess: () => void;
}

export function RenameDialog({ open, onOpenChange, node, onSuccess }: RenameDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  useEffect(() => {
    if (node) {
      setName(node.name);
    }
  }, [node]);

  const handleRename = async () => {
    if (!node || !name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid name",
        variant: "destructive",
      });
      return;
    }

    if (name === node.name) {
      onOpenChange(false);
      return;
    }

    setIsRenaming(true);
    try {
      await apiRequest('POST', '/api/files/rename', {
        oldPath: node.path,
        newName: name,
      });

      toast({
        title: "Success",
        description: "Renamed successfully",
      });

      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['/api/workspace'] });
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to rename",
        variant: "destructive",
      });
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-rename" aria-describedby="rename-description">
        <DialogHeader>
          <DialogTitle>Rename {node?.type === 'file' ? 'File' : 'Folder'}</DialogTitle>
        </DialogHeader>
        <p id="rename-description" className="sr-only">
          Rename the selected {node?.type}
        </p>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="newName">New Name</Label>
            <Input
              id="newName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              data-testid="input-rename"
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} data-testid="button-cancel">
            Cancel
          </Button>
          <Button onClick={handleRename} disabled={isRenaming} data-testid="button-rename">
            Rename
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
