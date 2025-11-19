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
  // Add your new extensions here following the same structure
  // Example:
  // {
  //   id: "debug-helper",
  //   name: "Debug Helper",
  //   version: "1.0.0",
  //   description: "Provides enhanced debugging tools and console logging utilities for Fluxo development.",
  //   author: "Fluxo Team",
  //   category: "utility",
  //   enabled: false,
  //   isInstalled: false,
  //   installedAt: Date.now(),
  // },
];

export function getAvailableExtensions(): Extension[] {
  return extensionsCatalog;
}
