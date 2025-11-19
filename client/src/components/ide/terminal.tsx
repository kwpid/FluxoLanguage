import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Terminal as TerminalIcon, Trash2, ChevronRight } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import type { Extension, OutputMessage } from "@shared/schema";

interface TerminalLine {
  id: string;
  type: 'command' | 'output' | 'error' | 'success';
  content: string;
  timestamp: number;
}

export function Terminal() {
  const [history, setHistory] = useState<TerminalLine[]>([
    {
      id: '1',
      type: 'output',
      content: 'Fluxo IDE Terminal v1.0.0',
      timestamp: Date.now(),
    },
    {
      id: '2',
      type: 'output',
      content: 'Type "help" for available commands',
      timestamp: Date.now(),
    },
  ]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: extensions = [] } = useQuery<Extension[]>({
    queryKey: ['/api/extensions'],
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const addLine = (type: TerminalLine['type'], content: string) => {
    setHistory(prev => [...prev, {
      id: crypto.randomUUID(),
      type,
      content,
      timestamp: Date.now(),
    }]);
  };

  const executeCommand = async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    addLine('command', `$ ${trimmed}`);
    setCommandHistory(prev => [...prev, trimmed]);
    setHistoryIndex(-1);

    const parts = trimmed.split(' ').filter(Boolean);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    try {
      switch (command) {
        case 'help':
          addLine('output', 'Available commands:');
          addLine('output', '  help                     - Show this help message');
          addLine('output', '  clear                    - Clear terminal');
          addLine('output', '  ext list                 - List installed extensions');
          addLine('output', '  ext install <id>         - Install an extension');
          addLine('output', '  ext uninstall <id>       - Uninstall an extension');
          addLine('output', '  ext enable <id>          - Enable an extension');
          addLine('output', '  ext disable <id>         - Disable an extension');
          break;

        case 'clear':
          setHistory([]);
          break;

        case 'ext':
        case 'extension':
          await handleExtensionCommand(args);
          break;

        default:
          addLine('error', `Unknown command: ${command}`);
          addLine('output', 'Type "help" for available commands');
      }
    } catch (error: any) {
      addLine('error', error.message || 'Command failed');
    }
  };

  const handleExtensionCommand = async (args: string[]) => {
    if (args.length === 0) {
      addLine('error', 'Usage: ext <list|install|uninstall|enable|disable> [id]');
      return;
    }

    const subcommand = args[0].toLowerCase();
    const extId = args[1];

    switch (subcommand) {
      case 'list':
      case 'ls':
        if (extensions.length === 0) {
          addLine('output', 'No extensions installed');
        } else {
          addLine('output', `Installed extensions (${extensions.length}):`);
          extensions.forEach(ext => {
            const status = ext.enabled ? '✓' : '✗';
            addLine('output', `  ${status} ${ext.id} - ${ext.name} v${ext.version}`);
          });
        }
        break;

      case 'install':
        if (!extId) {
          addLine('error', 'Usage: ext install <id>');
          return;
        }
        try {
          const response = await apiRequest('POST', '/api/extensions/install', { id: extId });
          if (!response.ok) {
            const error = await response.json();
            addLine('error', `Failed to install: ${error.error || response.statusText}`);
            return;
          }
          const result = await response.json();
          addLine('success', `Installed extension: ${result.name}`);
          if (result.id === 'html-supporter') {
            addLine('output', 'Creating template files in /html-templates...');
          }
          queryClient.invalidateQueries({ queryKey: ['/api/extensions'] });
          queryClient.invalidateQueries({ queryKey: ['/api/workspace'] });
        } catch (error: any) {
          addLine('error', `Failed to install: ${error.message}`);
        }
        break;

      case 'uninstall':
      case 'remove':
        if (!extId) {
          addLine('error', 'Usage: ext uninstall <id>');
          return;
        }
        try {
          const response = await apiRequest('POST', '/api/extensions/uninstall', { id: extId });
          if (!response.ok) {
            const error = await response.json();
            addLine('error', `Failed to uninstall: ${error.error || response.statusText}`);
            return;
          }
          addLine('success', `Uninstalled extension: ${extId}`);
          queryClient.invalidateQueries({ queryKey: ['/api/extensions'] });
        } catch (error: any) {
          addLine('error', `Failed to uninstall: ${error.message}`);
        }
        break;

      case 'enable':
        if (!extId) {
          addLine('error', 'Usage: ext enable <id>');
          return;
        }
        try {
          const response = await apiRequest('POST', '/api/extensions/toggle', { id: extId, enabled: true });
          if (!response.ok) {
            const error = await response.json();
            addLine('error', `Failed to enable: ${error.error || response.statusText}`);
            return;
          }
          addLine('success', `Enabled extension: ${extId}`);
          queryClient.invalidateQueries({ queryKey: ['/api/extensions'] });
        } catch (error: any) {
          addLine('error', `Failed to enable: ${error.message}`);
        }
        break;

      case 'disable':
        if (!extId) {
          addLine('error', 'Usage: ext disable <id>');
          return;
        }
        try {
          const response = await apiRequest('POST', '/api/extensions/toggle', { id: extId, enabled: false });
          if (!response.ok) {
            const error = await response.json();
            addLine('error', `Failed to disable: ${error.error || response.statusText}`);
            return;
          }
          addLine('success', `Disabled extension: ${extId}`);
          queryClient.invalidateQueries({ queryKey: ['/api/extensions'] });
        } catch (error: any) {
          addLine('error', `Failed to disable: ${error.message}`);
        }
        break;

      default:
        addLine('error', `Unknown subcommand: ${subcommand}`);
        addLine('output', 'Usage: ext <list|install|uninstall|enable|disable> [id]');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(currentCommand);
      setCurrentCommand('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[commandHistory.length - 1 - newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[commandHistory.length - 1 - newIndex] || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCurrentCommand('');
      }
    }
  };

  const getLineColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'command':
        return 'text-primary';
      case 'error':
        return 'text-destructive';
      case 'success':
        return 'text-green-500';
      default:
        return 'text-foreground';
    }
  };

  return (
    <div className="h-full flex flex-col bg-card border-t border-card-border">
      <div className="flex items-center justify-between h-10 px-3 border-b border-card-border">
        <div className="flex items-center gap-2">
          <TerminalIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Terminal</span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => setHistory([])}
          data-testid="button-clear-terminal"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-[13px] space-y-1"
        onClick={() => inputRef.current?.focus()}
      >
        {history.map((line) => (
          <div
            key={line.id}
            className={getLineColor(line.type)}
            data-testid={`terminal-line-${line.id}`}
          >
            {line.content}
          </div>
        ))}
        
        <div className="flex items-center gap-2 text-primary">
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={currentCommand}
            onChange={(e) => setCurrentCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none"
            placeholder="Type a command..."
            data-testid="input-terminal-command"
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}
