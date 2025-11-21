import type { Extension } from "@shared/schema";
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const extensionsDir = join(process.cwd(), "server", "extensions");

export function loadExtensionsFromDisk(): Extension[] {
  try {
    const files = readdirSync(extensionsDir);
    const extensions: Extension[] = [];

    for (const file of files) {
      if (file.endsWith(".json")) {
        const filePath = join(extensionsDir, file);
        const content = readFileSync(filePath, "utf-8");
        const extension = JSON.parse(content) as Extension;
        extensions.push(extension);
      }
    }

    return extensions;
  } catch (error) {
    console.error("Failed to load extensions:", error);
    return [];
  }
}

export function toggleExtension(extensionId: string, enabled: boolean): void {
  try {
    const extensionPath = join(extensionsDir, `${extensionId}.json`);
    const content = readFileSync(extensionPath, "utf-8");
    const extension = JSON.parse(content) as Extension;
    
    extension.enabled = enabled;
    
    writeFileSync(extensionPath, JSON.stringify(extension, null, 2));
  } catch (error) {
    throw new Error(`Failed to toggle extension: ${error}`);
  }
}
