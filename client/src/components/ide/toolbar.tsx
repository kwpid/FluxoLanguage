import { Play, Save, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface ToolbarProps {
  onRun: () => void;
  onSave: () => void;
  canSave: boolean;
  canRun: boolean;
}

export function Toolbar({ onRun, onSave, canSave, canRun }: ToolbarProps) {
  return (
    <div className="h-12 border-b border-border bg-card flex items-center px-4 gap-3">
      <div className="flex items-center gap-2">
        <Code2 className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold">Fluxo IDE</span>
      </div>

      <Separator orientation="vertical" className="h-6" />

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="default"
          onClick={onRun}
          disabled={!canRun}
          data-testid="button-run-code"
          className="gap-2"
        >
          <Play className="h-4 w-4" />
          Run
          <span className="text-xs opacity-70 ml-1">⌘↵</span>
        </Button>

        <Button
          size="sm"
          variant="secondary"
          onClick={onSave}
          disabled={!canSave}
          data-testid="button-save-file"
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          Save
          <span className="text-xs opacity-70 ml-1">⌘S</span>
        </Button>
      </div>

      <div className="ml-auto text-xs text-muted-foreground">
        Welcome to Fluxo IDE
      </div>
    </div>
  );
}
