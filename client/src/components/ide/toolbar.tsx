import { Play, Save, Code2, Book, Square, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { WorkspaceSelector } from "./workspace-selector";
import { ExtensionsSheet } from "./extensions-sheet";

interface ToolbarProps {
  onRun: () => void;
  onStop: () => void;
  onSave: () => void;
  canSave: boolean;
  canRun: boolean;
  isRunning: boolean;
  currentWorkspaceName: string;
}

export function Toolbar({ onRun, onStop, onSave, canSave, canRun, isRunning, currentWorkspaceName }: ToolbarProps) {
  return (
    <div className="h-12 border-b border-border bg-card flex items-center px-4 gap-3">
      <div className="flex items-center gap-2">
        <Code2 className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold">Fluxo IDE</span>
      </div>

      <Separator orientation="vertical" className="h-6" />

      <WorkspaceSelector currentWorkspaceName={currentWorkspaceName} />

      <Separator orientation="vertical" className="h-6" />

      <div className="flex items-center gap-2">
        {!isRunning ? (
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
        ) : (
          <Button
            size="sm"
            variant="destructive"
            onClick={onStop}
            data-testid="button-stop-code"
            className="gap-2"
          >
            <Square className="h-4 w-4" />
            Stop
          </Button>
        )}

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

        <Separator orientation="vertical" className="h-6" />

        <Link href="/extensions">
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            data-testid="button-extensions"
          >
            <Package className="h-4 w-4" />
            Extensions
          </Button>
        </Link>

        <Link href="/docs">
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            data-testid="button-docs"
          >
            <Book className="h-4 w-4" />
            Docs
          </Button>
        </Link>
      </div>
    </div>
  );
}
