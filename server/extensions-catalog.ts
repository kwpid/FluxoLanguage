import { loadExtensionsFromDisk } from "./extensions-loader";
import type { Extension } from "@shared/schema";

export function getAvailableExtensions(): Extension[] {
  return loadExtensionsFromDisk();
}
