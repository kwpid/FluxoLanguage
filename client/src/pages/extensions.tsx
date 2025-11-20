import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Extension } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Search, TrendingUp, Download, Check, Upload, Star, Package, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const trendingExtensions: Extension[] = [
  {
    id: "html-supporter",
    name: "HTMLSupporter",
    version: "1.0.0",
    description: "Enables HTML and CSS element creation with event handling support. Create interactive buttons, inputs, and other UI elements directly in Fluxo code.",
    author: "Fluxo Team",
    category: "language",
    enabled: false,
    isInstalled: false,
    trending: true,
    downloads: 1250,
    rating: 4.8,
    isCustom: false,
    packages: [
      {
        name: "fluxo-runtime.js",
        description: "Core Fluxo runtime for executing Fluxo modules in the browser",
        required: true,
      },
      {
        name: "DOM API Support",
        description: "Provides document.getElementById, addEventListener, and other DOM manipulation APIs",
        required: true,
      },
    ],
  },
];

export default function Extensions() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadData, setUploadData] = useState({
    name: "",
    description: "",
    version: "1.0.0",
    author: "",
  });

  const { data: installedExtensions = [], isLoading } = useQuery<Extension[]>({
    queryKey: ['/api/extensions'],
  });

  const downloadMutation = useMutation({
    mutationFn: async (extensionId: string) => {
      const response = await apiRequest('POST', '/api/extensions/download', { id: extensionId });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to download extension');
      }
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Extension downloaded",
        description: `${result.name} has been downloaded. Use terminal command 'fluxo install ${result.id}' to install it.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/extensions'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUploadExtension = async () => {
    toast({
      title: "Coming Soon",
      description: "Custom extension upload functionality will be available soon! For now, you can download and install our curated extensions.",
    });
    setUploadDialogOpen(false);
  };

  const filteredTrending = trendingExtensions.filter(ext =>
    ext.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ext.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isExtensionDownloaded = (extensionId: string) => {
    return installedExtensions.some(ext => ext.id === extensionId);
  };

  const isExtensionInstalled = (extensionId: string) => {
    return installedExtensions.some(ext => ext.id === extensionId && ext.isInstalled);
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="border-b p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="button-back-to-ide">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to IDE
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Extensions Marketplace</h1>
            </div>
          </div>
          <Button onClick={() => setUploadDialogOpen(true)} data-testid="button-upload-extension">
            <Upload className="h-4 w-4 mr-2" />
            Upload Extension
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto p-6 h-full flex flex-col gap-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search extensions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-extensions"
            />
          </div>

          <Tabs defaultValue="trending" className="flex-1 flex flex-col">
            <TabsList data-testid="tabs-extensions">
              <TabsTrigger value="trending" data-testid="tab-trending">
                <TrendingUp className="h-4 w-4 mr-2" />
                Trending
              </TabsTrigger>
              <TabsTrigger value="installed" data-testid="tab-installed">
                <Check className="h-4 w-4 mr-2" />
                Installed
              </TabsTrigger>
            </TabsList>

            <TabsContent value="trending" className="flex-1 mt-4">
              <ScrollArea className="h-[calc(100vh-280px)]">
                {filteredTrending.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No extensions found matching "{searchQuery}"
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTrending.map((ext) => (
                      <Card key={ext.id} className="flex flex-col" data-testid={`card-extension-${ext.id}`}>
                        <CardHeader>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-lg">{ext.name}</CardTitle>
                              <CardDescription className="mt-1">v{ext.version} by {ext.author}</CardDescription>
                            </div>
                            {ext.trending && (
                              <Badge variant="secondary" className="gap-1 shrink-0">
                                <TrendingUp className="h-3 w-3" />
                                Trending
                              </Badge>
                            )}
                          </div>
                          {ext.rating && (
                            <div className="flex items-center gap-1 mt-2">
                              <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                              <span className="text-sm font-medium">{ext.rating}</span>
                              {ext.downloads && (
                                <>
                                  <span className="text-muted-foreground mx-2">•</span>
                                  <Download className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">{ext.downloads.toLocaleString()}</span>
                                </>
                              )}
                            </div>
                          )}
                        </CardHeader>
                        <CardContent className="flex-1">
                          <p className="text-sm text-muted-foreground mb-4">{ext.description}</p>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">{ext.category}</Badge>
                            {ext.packages && ext.packages.length > 0 && (
                              <Badge variant="outline">{ext.packages.length} packages</Badge>
                            )}
                          </div>
                        </CardContent>
                        <CardFooter>
                          {isExtensionInstalled(ext.id) ? (
                            <Button variant="secondary" disabled className="w-full" data-testid={`button-installed-${ext.id}`}>
                              <Check className="h-4 w-4 mr-2" />
                              Installed
                            </Button>
                          ) : isExtensionDownloaded(ext.id) ? (
                            <Button variant="outline" disabled className="w-full" data-testid={`button-downloaded-${ext.id}`}>
                              <Download className="h-4 w-4 mr-2" />
                              Downloaded
                            </Button>
                          ) : (
                            <Button
                              onClick={() => downloadMutation.mutate(ext.id)}
                              disabled={downloadMutation.isPending}
                              className="w-full"
                              data-testid={`button-download-${ext.id}`}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          )}
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="installed" className="flex-1 mt-4">
              <ScrollArea className="h-[calc(100vh-280px)]">
                {installedExtensions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No extensions installed yet. Browse trending extensions to get started!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {installedExtensions.map((ext) => (
                      <Card key={ext.id} className="flex flex-col" data-testid={`card-installed-${ext.id}`}>
                        <CardHeader>
                          <CardTitle className="text-lg">{ext.name}</CardTitle>
                          <CardDescription>v{ext.version} by {ext.author}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1">
                          <p className="text-sm text-muted-foreground mb-4">{ext.description}</p>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">{ext.category}</Badge>
                            {ext.isInstalled && (
                              <Badge variant="secondary">
                                <Check className="h-3 w-3 mr-1" />
                                Installed
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Custom Extension</DialogTitle>
            <DialogDescription>
              Upload your own Fluxo extension. Supports Fluxo, HTML, CSS, and JavaScript files only.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="extension-name">Extension Name</Label>
              <Input
                id="extension-name"
                placeholder="My Awesome Extension"
                value={uploadData.name}
                onChange={(e) => setUploadData({ ...uploadData, name: e.target.value })}
                data-testid="input-extension-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="extension-author">Author</Label>
              <Input
                id="extension-author"
                placeholder="Your Name"
                value={uploadData.author}
                onChange={(e) => setUploadData({ ...uploadData, author: e.target.value })}
                data-testid="input-extension-author"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="extension-version">Version</Label>
              <Input
                id="extension-version"
                placeholder="1.0.0"
                value={uploadData.version}
                onChange={(e) => setUploadData({ ...uploadData, version: e.target.value })}
                data-testid="input-extension-version"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="extension-description">Description</Label>
              <Textarea
                id="extension-description"
                placeholder="Describe what your extension does..."
                value={uploadData.description}
                onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                rows={3}
                data-testid="textarea-extension-description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="extension-files">Extension Files</Label>
              <div className="border-2 border-dashed rounded-md p-8 text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop your extension package folder here
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Must include extensionData.fxm with metadata
                </p>
                <Button variant="outline" data-testid="button-browse-files">
                  Browse Files
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Supported formats: .fxm, .fxo, .html, .css, .js
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUploadDialogOpen(false)}
              data-testid="button-cancel-upload"
            >
              Cancel
            </Button>
            <Button onClick={handleUploadExtension} data-testid="button-submit-upload">
              Upload Extension
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
