import { storage } from "./storage";
import type { IStorage } from "./storage";

export function getStorage(): IStorage {
  return storage;
}
