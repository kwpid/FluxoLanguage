import { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { registerFluxoLanguage } from "@/lib/fluxo-language";

interface EditorPanelProps {
  openTabs: string[];
  activeTab: string | null;
  fileContents: Record<string, string>;
  unsavedFiles: Set<string>;
  onTabClick: (path: string) => void;
  onTabClose: (path: string) => void;
  onContentChange: (path: string, content: string) => void;
}

export function EditorPanel({
  openTabs,
  activeTab,
  fileContents,
  unsavedFiles,
  onTabClick,
  onTabClose,
  onContentChange,
}: EditorPanelProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
  };

  const getFileName = (path: string) => {
    return path.split('/').pop() || path;
  };

  const getLanguage = (path: string) => {
    if (path.endsWith('.fxo') || path.endsWith('.fxm')) {
      return 'fluxo';
    }
    return 'plaintext';
  };

  useEffect(() => {
    registerFluxoLanguage();
  }, []);

  if (openTabs.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-background text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">No files open</p>
          <p className="text-xs mt-1">Select a file from the explorer to start editing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex items-center h-9 bg-card border-b border-card-border">
        <ScrollArea className="flex-1">
          <div className="flex">
            {openTabs.map(path => (
              <div
                key={path}
                className={`
                  flex items-center h-9 px-3 gap-2 cursor-pointer border-r border-card-border
                  ${activeTab === path ? 'bg-background' : 'bg-card hover-elevate'}
                `}
                onClick={() => onTabClick(path)}
                data-testid={`tab-${path}`}
              >
                <span className="text-[13px] font-medium whitespace-nowrap">
                  {getFileName(path)}
                </span>
                {unsavedFiles.has(path) && (
                  <div className="h-2 w-2 rounded-full bg-primary" data-testid={`unsaved-indicator-${path}`} />
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5 ml-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(path);
                  }}
                  data-testid={`button-close-tab-${path}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      <div className="flex-1">
        {activeTab && (
          <Editor
            height="100%"
            language={getLanguage(activeTab)}
            value={fileContents[activeTab] || ''}
            onChange={(value) => {
              if (value !== undefined) {
                onContentChange(activeTab, value);
              }
            }}
            onMount={handleEditorMount}
            theme="vs-dark"
            options={{
              fontSize: 14,
              fontFamily: 'JetBrains Mono, Fira Code, monospace',
              fontLigatures: true,
              lineHeight: 22,
              minimap: { enabled: true },
              automaticLayout: true,
              scrollBeyondLastLine: false,
              renderLineHighlight: 'all',
              cursorBlinking: 'smooth',
              smoothScrolling: true,
              padding: { top: 16, bottom: 16 },
              bracketPairColorization: { enabled: true },
              guides: {
                bracketPairs: true,
                indentation: true,
              },
              suggest: {
                snippetsPreventQuickSuggestions: false,
              },
              quickSuggestions: {
                other: true,
                comments: false,
                strings: false,
              },
            }}
          />
        )}
      </div>
    </div>
  );
}
