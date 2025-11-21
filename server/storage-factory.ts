import { storage as memStorage } from "./storage";
import { SupabaseStorage } from "./supabase-storage";
import type { IStorage } from "./storage";

const workspaceCache = new Map<string, string>();

export function getStorage(userId?: string, accessToken?: string): IStorage {
  if (userId && accessToken) {
    const cachedWorkspaceId = workspaceCache.get(userId);
    return new SupabaseStorage(userId, accessToken, cachedWorkspaceId || null);
  }
  return memStorage;
}

export function setCurrentWorkspace(userId: string, workspaceId: string): void {
  workspaceCache.set(userId, workspaceId);
}

export function getCurrentWorkspace(userId: string): string | undefined {
  return workspaceCache.get(userId);
}
