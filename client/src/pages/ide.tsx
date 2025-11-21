import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { FileNode, OutputMessage } from "@shared/schema";
import { localStorageService, type WorkspaceState } from "@/lib/local-storage";
import { FileExplorer } from "@/components/ide/file-explorer";
import { EditorPanel } from "@/components/ide/editor-panel";
import { OutputPanel } from "@/components/ide/output-panel";
import { Toolbar } from "@/components/ide/toolbar";
import { Terminal } from "@/components/ide/terminal";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useToast } from "@/hooks/use-toast";

export default function IDE() {
  const { toast } = useToast();
  const [workspace, setWorkspace] = useState<WorkspaceState | null>(null);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [unsavedFiles, setUnsavedFiles] = useState<Set<string>>(new Set());
  const [output, setOutput] = useState<OutputMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const autoSaveTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastSavedContent = useRef<Map<string, string>>(new Map());

  const { data: extensions = [] } = useQuery<Array<{ id: string; enabled: boolean }>>({
    queryKey: ['/api/extensions'],
  });

  // Initialize workspace from local storage
  useEffect(() => {
    const currentWorkspace = localStorageService.initializeDefaultWorkspace();
    setWorkspace(currentWorkspace);
    
    // Load workspace state
    if (currentWorkspace.openTabs.length > 0) {
      setOpenTabs(currentWorkspace.openTabs);
      setActiveTab(currentWorkspace.activeTab);
      
      // Load file contents from local storage
      currentWorkspace.openTabs.forEach((path) => {
        const content = localStorageService.getFileContent(currentWorkspace.id, path);
        if (content !== null) {
          setFileContents(prev => ({ ...prev, [path]: content }));
          lastSavedContent.current.set(path, content);
        }
      });
    }
  }, []);

  // Save workspace state to local storage when tabs change
  useEffect(() => {
    if (workspace && openTabs.length >= 0) {
      const saveDebounce = setTimeout(() => {
        localStorageService.saveWorkspaceState(workspace.id, openTabs, activeTab);
      }, 500);
      return () => clearTimeout(saveDebounce);
    }
  }, [workspace, openTabs, activeTab]);

  const refreshFileTree = useCallback(() => {
    if (workspace) {
      const updatedWorkspace = localStorageService.getWorkspace(workspace.id);
      if (updatedWorkspace) {
        setWorkspace(updatedWorkspace);
      }
    }
  }, [workspace]);

  const openFile = useCallback((path: string) => {
    if (!workspace) return;
    
    if (!openTabs.includes(path)) {
      const content = localStorageService.getFileContent(workspace.id, path);
      if (content !== null) {
        setFileContents(prev => ({ ...prev, [path]: content }));
        lastSavedContent.current.set(path, content);
        setOpenTabs(prev => [...prev, path]);
        setActiveTab(path);
      } else {
        toast({
          title: "Error",
          description: "Failed to open file",
          variant: "destructive",
        });
      }
    } else {
      setActiveTab(path);
    }
  }, [workspace, openTabs, toast]);

  const closeTab = useCallback((path: string) => {
    const timeout = autoSaveTimeouts.current.get(path);
    if (timeout) {
      clearTimeout(timeout);
      autoSaveTimeouts.current.delete(path);
    }
    
    lastSavedContent.current.delete(path);
    
    setOpenTabs(prev => prev.filter(p => p !== path));
    if (activeTab === path) {
      const index = openTabs.indexOf(path);
      const newActiveTab = openTabs[index - 1] || openTabs[index + 1] || null;
      setActiveTab(newActiveTab);
    }
    setUnsavedFiles(prev => {
      const newSet = new Set(prev);
      newSet.delete(path);
      return newSet;
    });
  }, [activeTab, openTabs]);

  const performSave = useCallback((path: string, contentToSave: string, showToast = false) => {
    if (!workspace) return false;
    
    try {
      localStorageService.saveFileContent(workspace.id, path, contentToSave);
      lastSavedContent.current.set(path, contentToSave);
      
      setFileContents(currentContents => {
        const latestContent = currentContents[path] || '';
        if (latestContent === contentToSave) {
          setUnsavedFiles(prev => {
            const newSet = new Set(prev);
            newSet.delete(path);
            return newSet;
          });
        }
        return currentContents;
      });
      
      if (showToast) {
        toast({
          title: "Saved",
          description: `${path.split('/').pop()} saved successfully`,
        });
      } else {
        console.log(`Auto-saved: ${path}`);
      }
      
      return true;
    } catch (error) {
      console.error('Save failed:', error);
      if (showToast) {
        toast({
          title: "Error",
          description: "Failed to save file",
          variant: "destructive",
        });
      }
      return false;
    }
  }, [workspace, toast]);

  const updateFileContent = useCallback((path: string, content: string) => {
    setFileContents(prev => ({ ...prev, [path]: content }));
    
    const savedContent = lastSavedContent.current.get(path);
    if (content !== savedContent) {
      setUnsavedFiles(prev => new Set(prev).add(path));
    }

    const existingTimeout = autoSaveTimeouts.current.get(path);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const newTimeout = setTimeout(() => {
      performSave(path, content, false);
    }, 5000);

    autoSaveTimeouts.current.set(path, newTimeout);
  }, [performSave]);

  const saveFile = useCallback(async (path: string) => {
    const timeout = autoSaveTimeouts.current.get(path);
    if (timeout) {
      clearTimeout(timeout);
      autoSaveTimeouts.current.delete(path);
    }
    
    performSave(path, fileContents[path] || '', true);
  }, [fileContents, performSave]);

  const runCode = useCallback(async () => {
    if (!activeTab || !workspace) return;
    
    const isHtmlFile = activeTab.endsWith('.html') || activeTab.endsWith('.htm');
    
    setOutput([]);
    setIsRunning(true);
    
    try {
      if (isHtmlFile) {
        setOutput([{
          id: crypto.randomUUID(),
          type: 'success',
          message: 'HTML preview is running. Fluxo scripts are executing in the browser.',
          timestamp: Date.now(),
        }, {
          id: crypto.randomUUID(),
          type: 'log',
          message: 'Switch to the Preview tab to see your HTML output.',
          timestamp: Date.now(),
        }]);
        
        toast({
          title: "Preview Active",
          description: "HTML is running in the Preview tab",
        });
      } else {
        // For Fluxo files, execute entire workspace on the backend
        const fluxoFiles: { path: string; code: string }[] = [];
        
        // Helper function to recursively find all Fluxo files
        const findFluxoFiles = (nodes: FileNode[]): string[] => {
          const files: string[] = [];
          for (const node of nodes) {
            if (node.type === 'file' && (node.path.endsWith('.fxo') || node.path.endsWith('.fxm'))) {
              files.push(node.path);
            } else if (node.type === 'folder' && node.children) {
              files.push(...findFluxoFiles(node.children));
            }
          }
          return files;
        };
        
        const fileTree = workspace.fileTree ?? [];
        const allFluxoPaths = findFluxoFiles(fileTree);
        
        if (allFluxoPaths.length === 0) {
          setOutput([{
            id: crypto.randomUUID(),
            type: 'warning',
            message: 'No Fluxo files found in workspace',
            timestamp: Date.now(),
          }]);
          setIsRunning(false);
          return;
        }
        
        // Load content for all Fluxo files from local storage
        for (const path of allFluxoPaths) {
          // Use cached content if available (opened tabs), otherwise load from local storage
          if (fileContents[path]) {
            fluxoFiles.push({ path, code: fileContents[path] });
          } else {
            const content = localStorageService.getFileContent(workspace.id, path);
            if (content !== null) {
              fluxoFiles.push({ path, code: content });
            } else {
              setOutput(prev => [...prev, {
                id: crypto.randomUUID(),
                type: 'warning',
                message: `Failed to load ${path}`,
                timestamp: Date.now(),
              }]);
            }
          }
        }
        
        // Execute all workspace files via backend API
        const response = await apiRequest('POST', '/api/execute-workspace', {
          files: fluxoFiles,
          entryPoint: activeTab,
        });
        
        const result = await response.json();
        
        setOutput(result.output || []);
        
        if (result.error) {
          toast({
            title: "Execution Error",
            description: result.error,
            variant: "destructive",
          });
          setIsRunning(false);
        } else if (result.output && result.output.length === 0) {
          setOutput([{
            id: crypto.randomUUID(),
            type: 'log',
            message: 'Code executed successfully (no output)',
            timestamp: Date.now(),
          }]);
        }
        
        toast({
          title: "Workspace Running",
          description: `Executed ${fluxoFiles.length} file(s). Click Stop to halt execution.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to execute code",
        variant: "destructive",
      });
      setIsRunning(false);
    }
  }, [activeTab, workspace, fileContents, toast]);

  const stopCode = useCallback(() => {
    setIsRunning(false);
    setOutput(prev => [...prev, {
      id: crypto.randomUUID(),
      type: 'warning',
      message: 'Execution stopped by user',
      timestamp: Date.now(),
    }]);
  }, []);

  const handleSourceClick = useCallback((filePath: string, line?: number, column?: number) => {
    openFile(filePath);
    toast({
      title: "Opened file",
      description: `${filePath.split('/').pop()}${line ? ` at line ${line}` : ''}`,
    });
  }, [openFile, toast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (activeTab) {
          saveFile(activeTab);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, saveFile]);

  if (!workspace) {
    return <div className="flex items-center justify-center h-screen">Loading workspace...</div>;
  }

  const isHtmlFile = activeTab?.endsWith('.html') || activeTab?.endsWith('.htm');

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Toolbar
        currentWorkspaceName={workspace.name}
        onRun={runCode}
        onStop={stopCode}
        onSave={() => activeTab && saveFile(activeTab)}
        canSave={unsavedFiles.size > 0}
        canRun={!!activeTab}
        isRunning={isRunning}
      />

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
          <FileExplorer
            fileTree={workspace.fileTree}
            onFileSelect={openFile}
            onFileCreate={(path, name, type) => {
              if (workspace) {
                localStorageService.createFile(workspace.id, path, name, type);
                refreshFileTree();
              }
            }}
            onFileRename={(path, newName) => {
              if (workspace) {
                const success = localStorageService.renameFile(workspace.id, path, newName);
                if (success) {
                  refreshFileTree();
                  
                  // Update open tabs if the renamed file was open
                  const parentPath = path.substring(0, path.lastIndexOf('/'));
                  const newPath = parentPath === '' ? `/${newName}` : `${parentPath}/${newName}`;
                  
                  if (openTabs.includes(path)) {
                    setOpenTabs(prev => prev.map(p => p === path ? newPath : p));
                    if (activeTab === path) {
                      setActiveTab(newPath);
                    }
                    if (fileContents[path]) {
                      setFileContents(prev => {
                        const newContents = { ...prev };
                        newContents[newPath] = newContents[path];
                        delete newContents[path];
                        return newContents;
                      });
                    }
                  }
                }
              }
            }}
            onFileDelete={(path) => {
              if (workspace) {
                const success = localStorageService.deleteFile(workspace.id, path);
                if (success) {
                  refreshFileTree();
                  
                  // Close tab if the deleted file was open
                  if (openTabs.includes(path)) {
                    closeTab(path);
                  }
                }
              }
            }}
          />
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={50} minSize={30}>
          <EditorPanel
            openTabs={openTabs}
            activeTab={activeTab}
            fileContents={fileContents}
            unsavedFiles={unsavedFiles}
            onTabClick={setActiveTab}
            onTabClose={closeTab}
            onContentChange={updateFileContent}
          />
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={30} minSize={20}>
          <OutputPanel
            output={output}
            onClear={() => setOutput([])}
            activeFile={activeTab}
            fileContents={fileContents}
            onSourceClick={handleSourceClick}
            extensions={extensions}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      <Terminal />
    </div>
  );
}
