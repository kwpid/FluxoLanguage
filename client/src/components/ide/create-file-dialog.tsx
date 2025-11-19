import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface CreateFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentPath: string;
  type: 'file' | 'folder';
  onSuccess: () => void;
}

export function CreateFileDialog({ open, onOpenChange, parentPath, type, onSuccess }: CreateFileDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [fileType, setFileType] = useState<string>('.fxo');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name",
        variant: "destructive",
      });
      return;
    }

    const finalName = type === 'file' ? `${name}${fileType}` : name;

    setIsCreating(true);
    try {
      await apiRequest('POST', '/api/files/create', {
        parentPath,
        name: finalName,
        type,
        content: type === 'file' ? '' : undefined,
      });

      toast({
        title: "Success",
        description: `${type === 'file' ? 'File' : 'Folder'} created successfully`,
      });

      setName('');
      setFileType('.fxo');
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['/api/workspace'] });
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to create ${type}`,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-create-file" aria-describedby="create-file-description">
        <DialogHeader>
          <DialogTitle>Create New {type === 'file' ? 'File' : 'Folder'}</DialogTitle>
        </DialogHeader>
        <p id="create-file-description" className="sr-only">
          Create a new {type} in the workspace
        </p>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder={type === 'file' ? 'myScript' : 'my-folder'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              data-testid="input-file-name"
              autoFocus
            />
          </div>

          {type === 'file' && (
            <div className="space-y-2">
              <Label htmlFor="fileType">File Type</Label>
              <Select value={fileType} onValueChange={setFileType}>
                <SelectTrigger id="fileType" data-testid="select-file-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=".fxo">.fxo (Fluxo Script)</SelectItem>
                  <SelectItem value=".fxm">.fxm (Fluxo Module)</SelectItem>
                  <SelectItem value=".txt">.txt (Text File)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Location: {parentPath}
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} data-testid="button-cancel">
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating} data-testid="button-create">
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
