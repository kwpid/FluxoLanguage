import { storage as memStorage } from "./storage";
import { SupabaseStorage } from "./supabase-storage";
import type { IStorage } from "./storage";

export function getStorage(userId?: string, accessToken?: string): IStorage {
  if (userId && accessToken) {
    return new SupabaseStorage(userId, accessToken);
  }
  return memStorage;
}
