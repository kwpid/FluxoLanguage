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
      {
        name: "CSS Inlining",
        description: "Automatically inlines external CSS files for proper preview rendering",
        required: false,
      },
    ],
  },

];

export function getAvailableExtensions(): Extension[] {
  return extensionsCatalog;
}
