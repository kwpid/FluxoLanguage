import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { FileNode, WorkspaceState, OutputMessage } from "@shared/schema";
import { FileExplorer } from "@/components/ide/file-explorer";
import { EditorPanel } from "@/components/ide/editor-panel";
import { OutputPanel } from "@/components/ide/output-panel";
import { Toolbar } from "@/components/ide/toolbar";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useToast } from "@/hooks/use-toast";

export default function IDE() {
  const { toast } = useToast();
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [unsavedFiles, setUnsavedFiles] = useState<Set<string>>(new Set());
  const [output, setOutput] = useState<OutputMessage[]>([]);

  const { data: workspace, isLoading } = useQuery<WorkspaceState>({
    queryKey: ['/api/workspace'],
  });

  useEffect(() => {
    if (workspace && workspace.openTabs.length > 0) {
      setOpenTabs(workspace.openTabs);
      if (workspace.activeTab) {
        setActiveTab(workspace.activeTab);
      }
      
      workspace.openTabs.forEach(async (path) => {
        try {
          const response = await fetch(`/api/files/content?path=${encodeURIComponent(path)}`);
          const data = await response.json();
          setFileContents(prev => ({ ...prev, [path]: data.content }));
        } catch (error) {
          console.error('Failed to load file:', path);
        }
      });
    }
  }, [workspace]);

  useEffect(() => {
    const saveWorkspaceState = async () => {
      if (openTabs.length > 0) {
        try {
          await apiRequest('POST', '/api/workspace/state', {
            openTabs,
            activeTab,
          });
        } catch (error) {
          console.error('Failed to save workspace state');
        }
      }
    };

    const debounce = setTimeout(saveWorkspaceState, 500);
    return () => clearTimeout(debounce);
  }, [openTabs, activeTab]);

  const openFile = useCallback(async (path: string) => {
    if (!openTabs.includes(path)) {
      try {
        const response = await fetch(`/api/files/content?path=${encodeURIComponent(path)}`);
        const data = await response.json();
        
        setFileContents(prev => ({ ...prev, [path]: data.content }));
        setOpenTabs(prev => [...prev, path]);
        setActiveTab(path);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to open file",
          variant: "destructive",
        });
      }
    } else {
      setActiveTab(path);
    }
  }, [openTabs, toast]);

  const closeTab = useCallback((path: string) => {
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

  const updateFileContent = useCallback((path: string, content: string) => {
    setFileContents(prev => ({ ...prev, [path]: content }));
    setUnsavedFiles(prev => new Set(prev).add(path));
  }, []);

  const saveFile = useCallback(async (path: string) => {
    try {
      await apiRequest('POST', '/api/files/save', {
        path,
        content: fileContents[path] || '',
      });
      
      setUnsavedFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(path);
        return newSet;
      });
      
      toast({
        title: "Saved",
        description: `${path.split('/').pop()} saved successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save file",
        variant: "destructive",
      });
    }
  }, [fileContents, toast]);

  const runCode = useCallback(async () => {
    if (!activeTab) return;
    
    setOutput([]);
    
    try {
      const result = await apiRequest('POST', '/api/execute', {
        path: activeTab,
        code: fileContents[activeTab] || '',
      });
      
      setOutput(result.output || []);
      
      if (result.error) {
        toast({
          title: "Execution Error",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to execute code",
        variant: "destructive",
      });
    }
  }, [activeTab, fileContents, toast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (activeTab) {
          saveFile(activeTab);
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        runCode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, saveFile, runCode]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading workspace...</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden">
      <Toolbar 
        onRun={runCode}
        onSave={() => activeTab && saveFile(activeTab)}
        canSave={activeTab !== null && unsavedFiles.has(activeTab)}
        canRun={activeTab !== null}
      />
      
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
          <FileExplorer 
            fileTree={workspace?.fileTree || []}
            onFileClick={openFile}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ['/api/workspace'] })}
          />
        </ResizablePanel>
        
        <ResizableHandle className="w-1 bg-border hover-elevate" />
        
        <ResizablePanel defaultSize={55} minSize={30}>
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
        
        <ResizableHandle className="w-1 bg-border hover-elevate" />
        
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
          <OutputPanel 
            output={output}
            onClear={() => setOutput([])}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
