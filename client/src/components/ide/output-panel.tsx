import { OutputMessage } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trash2, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface OutputPanelProps {
  output: OutputMessage[];
  onClear: () => void;
}

export function OutputPanel({ output, onClear }: OutputPanelProps) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    });
  };

  const getMessageColor = (type: OutputMessage['type']) => {
    switch (type) {
      case 'error':
        return 'text-destructive';
      case 'warning':
        return 'text-yellow-500';
      case 'success':
        return 'text-green-500';
      default:
        return 'text-foreground';
    }
  };

  const getMessageIcon = (type: OutputMessage['type']) => {
    switch (type) {
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'success':
        return '✓';
      default:
        return '•';
    }
  };

  return (
    <div className="h-full flex flex-col bg-card border-l border-card-border">
      <div className="flex items-center justify-between h-10 px-3 border-b border-card-border">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Output</span>
          {output.length > 0 && (
            <Badge variant="secondary" className="h-5 text-xs">
              {output.length}
            </Badge>
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={onClear}
          disabled={output.length === 0}
          data-testid="button-clear-output"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1" data-testid="scroll-output">
        {output.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground p-4" data-testid="empty-output">
            <div className="text-center">
              <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No output yet</p>
              <p className="text-xs mt-1">Run a script to see results here</p>
            </div>
          </div>
        ) : (
          <div className="p-3 font-mono text-[13px] space-y-1">
            {output.map((msg) => (
              <div key={msg.id} className="flex gap-2" data-testid={`output-message-${msg.id}`}>
                <span className="text-muted-foreground flex-shrink-0 select-none">
                  {formatTime(msg.timestamp)}
                </span>
                <span className={`flex-shrink-0 ${getMessageColor(msg.type)}`}>
                  {getMessageIcon(msg.type)}
                </span>
                <span className={getMessageColor(msg.type)}>
                  {msg.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
