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
      content: 'Fluxo IDE Terminal v0.1.32',
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
  const [currentDirectory, setCurrentDirectory] = useState('/');
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
          addLine('output', '  File System:');
          addLine('output', '    ls [path]              - List files in directory');
          addLine('output', '    cd <path>              - Change directory');
          addLine('output', '    pwd                    - Print current directory');
          addLine('output', '    cat <file>             - Display file contents');
          addLine('output', '    mkdir <name>           - Create a new folder');
          addLine('output', '    touch <name> [--module]- Create a new file (.fxo or .fxm)');
          addLine('output', '    rm <path>              - Remove file or folder');
          addLine('output', '  Workspace:');
          addLine('output', '    export                 - Export workspace as ZIP');
          addLine('output', '    download <path>        - Download file or folder');
          addLine('output', '  Extensions:');
          addLine('output', '    fluxo install <id>     - Install a downloaded extension');
          addLine('output', '    ext list               - List installed extensions');
          addLine('output', '    ext uninstall <id>     - Uninstall an extension');
          addLine('output', '    ext enable <id>        - Enable an extension');
          addLine('output', '    ext disable <id>       - Disable an extension');
          addLine('output', '  Other:');
          addLine('output', '    help                   - Show this help message');
          addLine('output', '    clear                  - Clear terminal');
          break;

        case 'clear':
          setHistory([]);
          break;

        case 'pwd':
          addLine('output', currentDirectory);
          break;

        case 'cd':
          await handleCdCommand(args);
          break;

        case 'ls':
          await handleLsCommand(args);
          break;

        case 'cat':
          await handleCatCommand(args);
          break;

        case 'mkdir':
          await handleMkdirCommand(args);
          break;

        case 'touch':
          await handleTouchCommand(args);
          break;

        case 'rm':
          await handleRmCommand(args);
          break;

        case 'export':
          await handleExportCommand();
          break;

        case 'download':
          await handleDownloadCommand(args);
          break;

        case 'fluxo':
          await handleFluxoCommand(args);
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

  const handleFluxoCommand = async (args: string[]) => {
    if (args.length === 0) {
      addLine('error', 'Usage: fluxo <install> <extension-id>');
      return;
    }

    const subcommand = args[0].toLowerCase();
    const extId = args[1];

    switch (subcommand) {
      case 'install':
        if (!extId) {
          addLine('error', 'Usage: fluxo install <extension-id>');
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

      default:
        addLine('error', `Unknown fluxo subcommand: ${subcommand}`);
        addLine('output', 'Usage: fluxo install <extension-id>');
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

  const resolvePath = (path: string): string => {
    let targetPath: string;
    
    if (path.startsWith('/')) {
      targetPath = path;
    } else {
      targetPath = currentDirectory === '/' ? `/${path}` : `${currentDirectory}/${path}`;
    }
    
    const parts = targetPath.split('/').filter(p => p);
    const normalizedParts: string[] = [];
    
    for (const part of parts) {
      if (part === '..') {
        normalizedParts.pop();
      } else if (part !== '.') {
        normalizedParts.push(part);
      }
    }
    
    const normalized = '/' + normalizedParts.join('/');
    
    if (!normalized.startsWith('/')) {
      throw new Error('Path traversal outside workspace not allowed');
    }
    
    return normalized || '/';
  };

  const handleCdCommand = async (args: string[]) => {
    if (args.length === 0) {
      setCurrentDirectory('/');
      addLine('success', 'Changed to root directory');
      return;
    }

    const targetPath = resolvePath(args[0]);

    try {
      const response = await fetch(`/api/files/tree`);
      const fileTree = await response.json();

      const findPath = (nodes: any[], path: string): any | null => {
        if (path === '/') return { type: 'folder', exists: true };
        
        for (const node of nodes) {
          if (node.path === path) {
            return node;
          }
          if (node.children) {
            const found = findPath(node.children, path);
            if (found) return found;
          }
        }
        return null;
      };

      const target = findPath(fileTree, targetPath);
      
      if (!target) {
        addLine('error', `cd: ${args[0]}: No such directory`);
        return;
      }

      if (target.type !== 'folder') {
        addLine('error', `cd: ${args[0]}: Not a directory`);
        return;
      }

      setCurrentDirectory(targetPath);
      addLine('success', `Changed directory to ${targetPath}`);
    } catch (error: any) {
      addLine('error', `cd: ${error.message}`);
    }
  };

  const handleLsCommand = async (args: string[]) => {
    const targetPath = args.length > 0 ? resolvePath(args[0]) : currentDirectory;

    try {
      const response = await fetch(`/api/files/tree`);
      const fileTree = await response.json();

      const findPath = (nodes: any[], path: string): any | null => {
        if (path === '/') {
          return { type: 'folder', children: nodes };
        }
        
        for (const node of nodes) {
          if (node.path === path) {
            return node;
          }
          if (node.children) {
            const found = findPath(node.children, path);
            if (found) return found;
          }
        }
        return null;
      };

      const target = findPath(fileTree, targetPath);

      if (!target) {
        addLine('error', `ls: ${args[0] || currentDirectory}: No such file or directory`);
        return;
      }

      if (target.type === 'file') {
        addLine('output', target.name);
        return;
      }

      const children = target.children || [];
      if (children.length === 0) {
        addLine('output', 'Empty directory');
        return;
      }

      addLine('output', `Contents of ${targetPath}:`);
      children.forEach((child: any) => {
        const prefix = child.type === 'folder' ? '📁' : '📄';
        addLine('output', `  ${prefix} ${child.name}`);
      });
    } catch (error: any) {
      addLine('error', `ls: ${error.message}`);
    }
  };

  const handleCatCommand = async (args: string[]) => {
    if (args.length === 0) {
      addLine('error', 'Usage: cat <file>');
      return;
    }

    const filePath = resolvePath(args[0]);

    try {
      const response = await fetch(`/api/files/content?path=${encodeURIComponent(filePath)}`);
      
      if (!response.ok) {
        addLine('error', `cat: ${args[0]}: No such file`);
        return;
      }

      const data = await response.json();
      const lines = data.content.split('\n');
      
      addLine('output', `--- ${filePath} ---`);
      lines.forEach((line: string) => {
        addLine('output', line);
      });
      addLine('output', '--- End of file ---');
    } catch (error: any) {
      addLine('error', `cat: ${error.message}`);
    }
  };

  const handleMkdirCommand = async (args: string[]) => {
    if (args.length === 0) {
      addLine('error', 'Usage: mkdir <name>');
      return;
    }

    try {
      const targetPath = resolvePath(args[0]);
      const parts = targetPath.split('/').filter(p => p);
      const folderName = parts.pop() || '';
      
      if (!folderName) {
        addLine('error', 'mkdir: Invalid folder name');
        return;
      }
      
      const parentPath = parts.length > 0 ? '/' + parts.join('/') : '/';
      
      if (parentPath !== '/') {
        const treeResponse = await fetch('/api/files/tree');
        const fileTree = await treeResponse.json();
        
        const findPath = (nodes: any[], path: string): any | null => {
          for (const node of nodes) {
            if (node.path === path) return node;
            if (node.children) {
              const found = findPath(node.children, path);
              if (found) return found;
            }
          }
          return null;
        };
        
        const parent = findPath(fileTree, parentPath);
        if (!parent) {
          addLine('error', `mkdir: ${parentPath}: No such directory`);
          return;
        }
        if (parent.type !== 'folder') {
          addLine('error', `mkdir: ${parentPath}: Not a directory`);
          return;
        }
      }

      const response = await apiRequest('POST', '/api/files/create', {
        parentPath,
        name: folderName,
        type: 'folder',
      });

      if (!response.ok) {
        const error = await response.json();
        addLine('error', `mkdir: ${error.error || 'Failed to create folder'}`);
        return;
      }

      addLine('success', `Created folder: ${folderName}`);
      queryClient.invalidateQueries({ queryKey: ['/api/files/tree'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workspace'] });
    } catch (error: any) {
      addLine('error', `mkdir: ${error.message}`);
    }
  };

  const handleTouchCommand = async (args: string[]) => {
    const isModule = args.includes('--module');
    const pathArg = args.find(arg => !arg.startsWith('--'));
    
    if (!pathArg) {
      addLine('error', 'Usage: touch <name> [--module]');
      return;
    }

    try {
      const targetPath = resolvePath(pathArg);
      const parts = targetPath.split('/').filter(p => p);
      let fileName = parts.pop() || '';
      
      if (!fileName) {
        addLine('error', 'touch: Invalid file name');
        return;
      }
      
      const parentPath = parts.length > 0 ? '/' + parts.join('/') : '/';
      
      if (parentPath !== '/') {
        const treeResponse = await fetch('/api/files/tree');
        const fileTree = await treeResponse.json();
        
        const findPath = (nodes: any[], path: string): any | null => {
          for (const node of nodes) {
            if (node.path === path) return node;
            if (node.children) {
              const found = findPath(node.children, path);
              if (found) return found;
            }
          }
          return null;
        };
        
        const parent = findPath(fileTree, parentPath);
        if (!parent) {
          addLine('error', `touch: ${parentPath}: No such directory`);
          return;
        }
        if (parent.type !== 'folder') {
          addLine('error', `touch: ${parentPath}: Not a directory`);
          return;
        }
      }
      
      if (!fileName.includes('.')) {
        fileName += isModule ? '.fxm' : '.fxo';
      }

      const response = await apiRequest('POST', '/api/files/create', {
        parentPath,
        name: fileName,
        type: 'file',
        content: '',
      });

      if (!response.ok) {
        const error = await response.json();
        addLine('error', `touch: ${error.error || 'Failed to create file'}`);
        return;
      }

      addLine('success', `Created file: ${fileName}`);
      queryClient.invalidateQueries({ queryKey: ['/api/files/tree'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workspace'] });
    } catch (error: any) {
      addLine('error', `touch: ${error.message}`);
    }
  };

  const handleRmCommand = async (args: string[]) => {
    if (args.length === 0) {
      addLine('error', 'Usage: rm <path>');
      return;
    }

    try {
      const targetPath = resolvePath(args[0]);
      const parts = targetPath.split('/').filter(p => p);
      const name = parts.pop() || '';
      
      if (!name) {
        addLine('error', 'rm: Invalid path');
        return;
      }
      
      const parentPath = parts.length > 0 ? '/' + parts.join('/') : '/';
      
      if (parentPath !== '/') {
        const treeResponse = await fetch('/api/files/tree');
        
        if (!treeResponse.ok) {
          addLine('error', 'rm: Failed to verify parent directory');
          return;
        }
        
        const fileTree = await treeResponse.json();
        
        const findPath = (nodes: any[], path: string): any | null => {
          for (const node of nodes) {
            if (node.path === path) return node;
            if (node.children) {
              const found = findPath(node.children, path);
              if (found) return found;
            }
          }
          return null;
        };
        
        const parent = findPath(fileTree, parentPath);
        if (!parent) {
          addLine('error', `rm: ${parentPath}: No such directory`);
          return;
        }
        if (parent.type !== 'folder') {
          addLine('error', `rm: ${parentPath}: Not a directory`);
          return;
        }
      }

      const response = await apiRequest('POST', '/api/files/delete', {
        path: targetPath,
      });

      if (!response.ok) {
        const error = await response.json();
        addLine('error', `rm: ${error.error || 'Failed to delete'}`);
        return;
      }

      addLine('success', `Removed: ${args[0]}`);
      queryClient.invalidateQueries({ queryKey: ['/api/files/tree'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workspace'] });
    } catch (error: any) {
      addLine('error', `rm: ${error.message}`);
    }
  };

  const handleExportCommand = async () => {
    try {
      addLine('output', 'Exporting workspace...');
      
      const response = await fetch('/api/workspaces/download');
      
      if (!response.ok) {
        const text = await response.text();
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        if (text) {
          try {
            const error = JSON.parse(text);
            errorMessage = error.error || errorMessage;
          } catch {
            errorMessage = text || errorMessage;
          }
        }
        
        addLine('error', `export: ${errorMessage}`);
        return;
      }
      
      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : 'workspace.zip';
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      
      addLine('success', 'Workspace exported successfully');
    } catch (error: any) {
      addLine('error', `export: ${error.message}`);
    }
  };

  const handleDownloadCommand = async (args: string[]) => {
    if (args.length === 0) {
      addLine('error', 'Usage: download <path>');
      return;
    }

    try {
      const targetPath = resolvePath(args[0]);
      const response = await fetch(`/api/files/download?path=${encodeURIComponent(targetPath)}`);
      
      if (!response.ok) {
        const text = await response.text();
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        if (text) {
          try {
            const error = JSON.parse(text);
            errorMessage = error.error || errorMessage;
          } catch {
            errorMessage = text || errorMessage;
          }
        }
        
        addLine('error', `download: ${errorMessage}`);
        return;
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const fileName = filenameMatch ? filenameMatch[1] : 'download';
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      
      addLine('success', `Downloaded: ${fileName}`);
    } catch (error: any) {
      addLine('error', `download: ${error.message}`);
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
        
        <div className="flex items-start gap-2 text-primary">
          <span className="text-muted-foreground flex-shrink-0">{currentDirectory}$</span>
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
