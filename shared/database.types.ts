export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string
          user_id: string
          name: string
          open_tabs: string[]
          active_tab: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          open_tabs?: string[]
          active_tab?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          open_tabs?: string[]
          active_tab?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      files: {
        Row: {
          id: string
          workspace_id: string
          name: string
          type: 'file' | 'folder'
          path: string
          content: string | null
          parent_path: string | null
          extension: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          type: 'file' | 'folder'
          path: string
          content?: string | null
          parent_path?: string | null
          extension?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          type?: 'file' | 'folder'
          path?: string
          content?: string | null
          parent_path?: string | null
          extension?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      workspace_extensions: {
        Row: {
          id: string
          workspace_id: string
          extension_id: string
          name: string
          version: string
          description: string
          author: string
          category: 'theme' | 'language' | 'utility' | 'formatter' | 'linter'
          enabled: boolean
          downloaded_at: string | null
          installed_at: string | null
          is_installed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          extension_id: string
          name: string
          version: string
          description: string
          author: string
          category: 'theme' | 'language' | 'utility' | 'formatter' | 'linter'
          enabled?: boolean
          downloaded_at?: string | null
          installed_at?: string | null
          is_installed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          extension_id?: string
          name?: string
          version?: string
          description?: string
          author?: string
          category?: 'theme' | 'language' | 'utility' | 'formatter' | 'linter'
          enabled?: boolean
          downloaded_at?: string | null
          installed_at?: string | null
          is_installed?: boolean
          created_at?: string
        }
      }
    }
  }
}
