import type { Extension } from "@shared/schema";

export const extensionsCatalog: Extension[] = [
  {
    id: "html-supporter",
    name: "HTMLSupporter",
    version: "1.0.0",
    description: "Enables HTML and CSS element creation with event handling support. Create interactive buttons, inputs, and other UI elements directly in Fluxo code.",
    author: "Fluxo Team",
    category: "language",
    enabled: false,
    isInstalled: false,
    installedAt: Date.now(),
  },

];

export function getAvailableExtensions(): Extension[] {
  return extensionsCatalog;
}
