import { useState, useEffect, useRef } from "react";
import { OutputMessage } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trash2, Terminal, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Extension {
  id: string;
  enabled: boolean;
}

interface OutputPanelProps {
  output: OutputMessage[];
  onClear: () => void;
  activeFile?: string | null;
  fileContents?: Record<string, string>;
  onSourceClick?: (filePath: string, line?: number, column?: number) => void;
  extensions?: Extension[];
}

export function OutputPanel({ output, onClear, activeFile, fileContents = {}, onSourceClick, extensions = [] }: OutputPanelProps) {
  const [previewHtml, setPreviewHtml] = useState('');
  const [activeTab, setActiveTab] = useState('output');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Check if HTMLSupporter extension is enabled
  const isHtmlSupporterEnabled = extensions.some(ext => ext.id === 'html-supporter' && ext.enabled);
  
  // Inject Fluxo runtime into HTML
  const injectFluxoRuntime = (html: string): string => {
    // Check if runtime is already injected
    if (html.includes('data-fluxo-runtime')) {
      return html;
    }
    
    // Load runtime script from public folder by referencing the file
    const runtimeScript = `<script data-fluxo-runtime src="/fluxo-runtime.js"></script>`;
    
    // Try to inject before closing </body> tag
    if (html.includes('</body>')) {
      return html.replace('</body>', `${runtimeScript}\n</body>`);
    }
    
    // Try to inject before closing </html> tag
    if (html.includes('</html>')) {
      return html.replace('</html>', `${runtimeScript}\n</html>`);
    }
    
    // If neither tag exists, append to the end
    return html + '\n' + runtimeScript;
  };
  
  // Wrap Fluxo code in HTML with runtime
  const wrapFluxoInHtml = (fluxoCode: string, filePath: string): string => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Fluxo Preview - ${filePath}</title>
  <style>
    body {
      margin: 0;
      padding: 16px;
      font-family: system-ui, -apple-system, sans-serif;
    }
  </style>
</head>
<body>
  <script data-fluxo-entry src="/fluxo-runtime.js"></script>
  <script data-fluxo-code type="text/fluxo">
${fluxoCode}
  </script>
</body>
</html>`;
  };
  
  useEffect(() => {
    // Update preview when active file changes or content changes
    if (activeFile && fileContents[activeFile]) {
      const isHtmlFile = activeFile.endsWith('.html') || activeFile.endsWith('.htm');
      const isFluxoFile = activeFile.endsWith('.fxo') || activeFile.endsWith('.fxm');
      
      if (isHtmlFile) {
        const htmlWithRuntime = injectFluxoRuntime(fileContents[activeFile]);
        setPreviewHtml(htmlWithRuntime);
        setActiveTab('preview');
      } else if (isHtmlSupporterEnabled && isFluxoFile) {
        const wrappedHtml = wrapFluxoInHtml(fileContents[activeFile], activeFile);
        setPreviewHtml(wrappedHtml);
        setActiveTab('preview');
      }
    }
  }, [activeFile, fileContents, isHtmlSupporterEnabled]);
  
  // Listen for messages from iframe requesting Fluxo modules
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === 'fluxo-load-module' && iframeRef.current) {
        // Iframe sends normalized absolute path
        const requestedPath = event.data.path;
        console.log('Loading Fluxo module:', requestedPath);
        
        // Load the module content from fileContents using the normalized path
        if (fileContents[requestedPath]) {
          // Send the module code back to the iframe with the SAME normalized path
          iframeRef.current.contentWindow?.postMessage({
            type: 'fluxo-module',
            path: requestedPath, // Echo back the normalized path
            code: fileContents[requestedPath]
          }, '*');
          console.log('✓ Sent module:', requestedPath);
        } else {
          console.error('✗ Module not found:', requestedPath);
          console.error('Available files:', Object.keys(fileContents).filter((k: string) => k.endsWith('.fxm') || k.endsWith('.fxo')));
          // Send error message
          iframeRef.current.contentWindow?.postMessage({
            type: 'fluxo-module-error',
            path: requestedPath,
            error: 'Module not found: ' + requestedPath
          }, '*');
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [activeFile, fileContents]);
  
  const isHtmlFile = activeFile?.endsWith('.html') || activeFile?.endsWith('.htm');
  const isFluxoFile = activeFile?.endsWith('.fxo') || activeFile?.endsWith('.fxm');
  const canPreview = isHtmlFile || (isHtmlSupporterEnabled && isFluxoFile);
  
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
                  <div 
                    key={msg.id} 
                    className={`flex gap-2 ${msg.filePath && onSourceClick ? 'cursor-pointer hover-elevate rounded-md px-2 -mx-2 py-1 -my-1' : ''}`}
                    data-testid={`output-message-${msg.id}`}
                    onClick={() => msg.filePath && onSourceClick?.(msg.filePath, msg.line, msg.column)}
                    title={msg.filePath ? `Click to open ${msg.filePath}${msg.line ? `:${msg.line}` : ''}` : undefined}
                  >
                    <span className="text-muted-foreground flex-shrink-0 select-none">
                      {formatTime(msg.timestamp)}
                    </span>
                    <span className={`flex-shrink-0 ${getMessageColor(msg.type)}`}>
                      {getMessageIcon(msg.type)}
                    </span>
                    <div className="flex-1 flex gap-2">
                      <span className={getMessageColor(msg.type)}>
                        {msg.message}
                      </span>
                      {msg.filePath && (
                        <span className="text-muted-foreground text-xs ml-auto flex-shrink-0">
                          {msg.filePath.split('/').pop()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="preview" className="flex-1 m-0 data-[state=active]:flex data-[state=inactive]:hidden">
          {isHtmlFile && previewHtml ? (
            <iframe
              ref={iframeRef}
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
