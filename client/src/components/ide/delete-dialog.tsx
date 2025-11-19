import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FileNode } from "@shared/schema";
import { AlertTriangle } from "lucide-react";

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: FileNode | null;
  onSuccess: () => void;
}

export function DeleteDialog({ open, onOpenChange, node, onSuccess }: DeleteDialogProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!node) return;

    setIsDeleting(true);
    try {
      await apiRequest('POST', '/api/files/delete', {
        path: node.path,
      });

      toast({
        title: "Success",
        description: `${node.type === 'file' ? 'File' : 'Folder'} deleted successfully`,
      });

      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['/api/workspace'] });
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-delete">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete {node?.type === 'file' ? 'File' : 'Folder'}
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{node?.name}</strong>?
            {node?.type === 'folder' && ' This will delete all contents inside this folder.'}
            {' '}This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} data-testid="button-cancel">
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={isDeleting}
            data-testid="button-delete-confirm"
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
