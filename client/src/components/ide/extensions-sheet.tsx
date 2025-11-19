import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Extension } from "@shared/schema";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Puzzle, Download, Trash2, Power, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const availableExtensions: Extension[] = [
  {
    id: "html-supporter",
    name: "HTMLSupporter",
    version: "1.0.0",
    description: "Enables HTML and CSS element creation with event handling support. Create interactive buttons, inputs, and other UI elements directly in Fluxo code.",
    author: "Fluxo Team",
    category: "language",
    enabled: false,
    installedAt: Date.now(),
  },
];

export function ExtensionsSheet() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: extensions = [], isLoading } = useQuery<Extension[]>({
    queryKey: ['/api/extensions'],
  });

  const installMutation = useMutation({
    mutationFn: async (extensionId: string) => {
      const response = await apiRequest('POST', '/api/extensions/install', { id: extensionId });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to install extension');
      }
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Extension installed",
        description: `${result.name} has been installed successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/extensions'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Installation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uninstallMutation = useMutation({
    mutationFn: async (extensionId: string) => {
      const response = await apiRequest('POST', '/api/extensions/uninstall', { id: extensionId });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to uninstall extension');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Extension uninstalled",
        description: "Extension has been removed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/extensions'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Uninstall failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const response = await apiRequest('POST', '/api/extensions/toggle', { id, enabled });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to toggle extension');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.enabled ? "Extension enabled" : "Extension disabled",
        description: `Extension has been ${variables.enabled ? "enabled" : "disabled"}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/extensions'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Toggle failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredExtensions = extensions.filter(ext =>
    ext.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ext.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAvailableExtensions = availableExtensions.filter(ext =>
    !extensions.some(installed => installed.id === ext.id) &&
    (ext.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ext.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getCategoryColor = (category: Extension['category']) => {
    const colors = {
      theme: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      language: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      utility: 'bg-green-500/10 text-green-500 border-green-500/20',
      formatter: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      linter: 'bg-red-500/10 text-red-500 border-red-500/20',
    };
    return colors[category] || '';
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          data-testid="button-extensions"
        >
          <Puzzle className="h-4 w-4" />
          Extensions
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[500px] sm:max-w-[500px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Puzzle className="h-5 w-5" />
            Extensions
          </SheetTitle>
          <SheetDescription>
            Manage extensions to enhance your Fluxo IDE experience.
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center gap-2 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search extensions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-extensions"
            />
          </div>
        </div>

        <Tabs defaultValue="installed" className="flex-1 mt-4 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="installed" data-testid="tab-installed">Installed</TabsTrigger>
            <TabsTrigger value="browse" data-testid="tab-browse">Browse</TabsTrigger>
          </TabsList>

          <TabsContent value="installed" className="flex-1 mt-2">
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-3 pr-4">
                {isLoading ? (
                  <div className="text-center text-muted-foreground py-8">
                    Loading extensions...
                  </div>
                ) : filteredExtensions.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    {searchQuery ? "No extensions found" : "No extensions installed"}
                  </div>
                ) : (
                  filteredExtensions.map((ext) => (
                    <Card key={ext.id} data-testid={`extension-${ext.id}`}>
                      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
                        <div className="flex-1">
                          <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                            {ext.name}
                            <Badge variant="outline" className={getCategoryColor(ext.category)}>
                              {ext.category}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="text-xs mt-1">
                            v{ext.version} by {ext.author}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant={ext.enabled ? "default" : "ghost"}
                            className="h-8 w-8"
                            onClick={() => toggleMutation.mutate({ id: ext.id, enabled: !ext.enabled })}
                            disabled={toggleMutation.isPending}
                            data-testid={`button-toggle-${ext.id}`}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => uninstallMutation.mutate(ext.id)}
                            disabled={uninstallMutation.isPending}
                            data-testid={`button-uninstall-${ext.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-2">
                        <p className="text-sm text-muted-foreground">{ext.description}</p>
                        {ext.enabled && (
                          <Badge variant="secondary" className="mt-2">
                            Active
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="browse" className="flex-1 mt-2">
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-3 pr-4">
                {filteredAvailableExtensions.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    {searchQuery ? "No extensions found" : "All available extensions are installed"}
                  </div>
                ) : (
                  filteredAvailableExtensions.map((ext) => (
                    <Card key={ext.id} data-testid={`available-extension-${ext.id}`}>
                      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
                        <div className="flex-1">
                          <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                            {ext.name}
                            <Badge variant="outline" className={getCategoryColor(ext.category)}>
                              {ext.category}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="text-xs mt-1">
                            v{ext.version} by {ext.author}
                          </CardDescription>
                        </div>
                        <Button
                          size="sm"
                          variant="default"
                          className="gap-2"
                          onClick={() => installMutation.mutate(ext.id)}
                          disabled={installMutation.isPending}
                          data-testid={`button-install-${ext.id}`}
                        >
                          <Download className="h-4 w-4" />
                          Install
                        </Button>
                      </CardHeader>
                      <CardContent className="pt-2">
                        <p className="text-sm text-muted-foreground">{ext.description}</p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
