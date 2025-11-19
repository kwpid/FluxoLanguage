import { useState, useEffect } from "react";
import { OutputMessage } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trash2, Terminal, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface OutputPanelProps {
  output: OutputMessage[];
  onClear: () => void;
  activeFile?: string | null;
  fileContents?: Record<string, string>;
}

export function OutputPanel({ output, onClear, activeFile, fileContents = {} }: OutputPanelProps) {
  const [previewHtml, setPreviewHtml] = useState('');
  const [activeTab, setActiveTab] = useState('output');
  
  useEffect(() => {
    // Update preview when active file changes or content changes
    if (activeFile && activeFile.endsWith('.html') && fileContents[activeFile]) {
      setPreviewHtml(fileContents[activeFile]);
    }
  }, [activeFile, fileContents]);
  
  const isHtmlFile = activeFile?.endsWith('.html') || activeFile?.endsWith('.htm');
  
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="flex items-center justify-between h-10 px-3 border-b border-card-border">
          <TabsList className="h-8">
            <TabsTrigger value="output" className="h-7 text-xs" data-testid="tab-output">
              <Terminal className="h-3 w-3 mr-1.5" />
              Output
              {output.length > 0 && (
                <Badge variant="secondary" className="h-4 text-xs ml-1.5 px-1">
                  {output.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="preview" 
              className="h-7 text-xs" 
              disabled={!isHtmlFile}
              data-testid="tab-preview"
            >
              <Eye className="h-3 w-3 mr-1.5" />
              Preview
            </TabsTrigger>
          </TabsList>
          {activeTab === 'output' && (
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
          )}
        </div>

        <TabsContent value="output" className="flex-1 m-0 data-[state=active]:flex data-[state=inactive]:hidden">
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
        </TabsContent>

        <TabsContent value="preview" className="flex-1 m-0 data-[state=active]:flex data-[state=inactive]:hidden">
          {isHtmlFile && previewHtml ? (
            <iframe
              srcDoc={previewHtml}
              className="w-full h-full border-0 bg-white"
              title="HTML Preview"
              sandbox="allow-scripts allow-same-origin"
              data-testid="preview-iframe"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground p-4">
              <div className="text-center">
                <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No HTML file selected</p>
                <p className="text-xs mt-1">Open an HTML file to see the preview</p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
