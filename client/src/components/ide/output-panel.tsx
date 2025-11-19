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
  const hasAutoSwitchedToPreview = useRef(false);
  
  // Check if HTMLSupporter extension is enabled
  const isHtmlSupporterEnabled = extensions.some(ext => ext.id === 'html-supporter' && ext.enabled);
  
  // Inject Fluxo runtime and inline CSS into HTML
  const injectFluxoRuntime = (html: string): string => {
    // Check if runtime is already injected
    if (html.includes('data-fluxo-runtime')) {
      return html;
    }
    
    // Load runtime script from public folder by referencing the file
    const runtimeScript = `<script data-fluxo-runtime src="/fluxo-runtime.js"></script>`;
    
    // Inline external CSS files
    let processedHtml = html;
    
    // Find all <link rel="stylesheet" href="..."> tags
    const linkRegex = /<link\s+rel=["']stylesheet["']\s+href=["']([^"']+)["']\s*\/?>/gi;
    let match;
    
    while ((match = linkRegex.exec(html)) !== null) {
      const cssPath = match[1];
      
      // Normalize path (remove leading slash if present, then add it back)
      const normalizedPath = cssPath.startsWith('/') ? cssPath : '/' + cssPath;
      
      // Get CSS content from fileContents
      if (fileContents[normalizedPath]) {
        const cssContent = fileContents[normalizedPath];
        const inlineStyle = `<style data-inlined-from="${cssPath}">\n${cssContent}\n</style>`;
        
        // Replace the link tag with inline style
        processedHtml = processedHtml.replace(match[0], inlineStyle);
      }
    }
    
    // Try to inject runtime before closing </body> tag
    if (processedHtml.includes('</body>')) {
      return processedHtml.replace('</body>', `${runtimeScript}\n</body>`);
    }
    
    // Try to inject before closing </html> tag
    if (processedHtml.includes('</html>')) {
      return processedHtml.replace('</html>', `${runtimeScript}\n</html>`);
    }
    
    // If neither tag exists, append to the end
    return processedHtml + '\n' + runtimeScript;
  };
  
  // Wrap Fluxo code in HTML with runtime using data-fluxo-code
  const wrapFluxoInHtml = (fluxoCode: string, filePath: string): string => {
    // Escape the code for safe HTML embedding
    const escapedCode = fluxoCode
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
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
  <script data-fluxo-runtime src="/fluxo-runtime.js"></script>
  <script data-fluxo-code type="text/fluxo">${escapedCode}</script>
</body>
</html>`;
  };
  
  useEffect(() => {
    // Always show index.html in preview if it exists, regardless of active file
    const indexHtmlPath = '/index.html';
    
    if (fileContents[indexHtmlPath]) {
      // index.html exists - always show it with Fluxo runtime injected
      const htmlWithRuntime = injectFluxoRuntime(fileContents[indexHtmlPath]);
      setPreviewHtml(htmlWithRuntime);
      
      // Only auto-switch to preview tab on first load, not on every update
      if (!hasAutoSwitchedToPreview.current && htmlWithRuntime) {
        setActiveTab('preview');
        hasAutoSwitchedToPreview.current = true;
      }
    } else if (activeFile && fileContents[activeFile]) {
      // Fallback: if no index.html, show current file if it's HTML or Fluxo
      const isHtmlFile = activeFile.endsWith('.html') || activeFile.endsWith('.htm');
      const isFluxoFile = activeFile.endsWith('.fxo') || activeFile.endsWith('.fxm');
      
      if (isHtmlFile) {
        const htmlWithRuntime = injectFluxoRuntime(fileContents[activeFile]);
        setPreviewHtml(htmlWithRuntime);
        
        // Only auto-switch on first load
        if (!hasAutoSwitchedToPreview.current && htmlWithRuntime) {
          setActiveTab('preview');
          hasAutoSwitchedToPreview.current = true;
        }
      } else if (isHtmlSupporterEnabled && isFluxoFile) {
        const wrappedHtml = wrapFluxoInHtml(fileContents[activeFile], activeFile);
        setPreviewHtml(wrappedHtml);
        
        // Only auto-switch on first load
        if (!hasAutoSwitchedToPreview.current && wrappedHtml) {
          setActiveTab('preview');
          hasAutoSwitchedToPreview.current = true;
        }
      } else {
        setPreviewHtml('');
      }
    } else {
      setPreviewHtml('');
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
  
  // Preview is available if index.html exists, or if active file is previewable
  const indexHtmlExists = !!fileContents['/index.html'];
  const isHtmlFile = activeFile?.endsWith('.html') || activeFile?.endsWith('.htm');
  const isFluxoFile = activeFile?.endsWith('.fxo') || activeFile?.endsWith('.fxm');
  const canPreview = indexHtmlExists || isHtmlFile || (isHtmlSupporterEnabled && isFluxoFile);
  
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
              disabled={!canPreview}
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

        <TabsContent value="output" className="flex-1 m-0 data-[state=active]:flex data-[state=inactive]:hidden overflow-hidden">
          <ScrollArea className="w-full h-full" data-testid="scroll-output">
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
                    className={`flex gap-2 flex-wrap ${msg.filePath && onSourceClick ? 'cursor-pointer hover-elevate rounded-md px-2 -mx-2 py-1 -my-1' : ''}`}
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
                    <div className="flex-1 flex gap-2 min-w-0">
                      <span className={`${getMessageColor(msg.type)} break-all`}>
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
          {canPreview && previewHtml ? (
            <iframe
              ref={iframeRef}
              srcDoc={previewHtml}
              className="w-full h-full border-0 bg-white"
              title="Preview"
              sandbox="allow-scripts allow-same-origin"
              data-testid="preview-iframe"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground p-4">
              <div className="text-center">
                <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No previewable file selected</p>
                <p className="text-xs mt-1">
                  {isHtmlSupporterEnabled 
                    ? "Open an HTML or Fluxo file to see the preview" 
                    : "Open an HTML file to see the preview"}
                </p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
