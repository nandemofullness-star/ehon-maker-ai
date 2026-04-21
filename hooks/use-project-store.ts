import { useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SavedPageItem {
  id: string;
  uri: string;
  originalUri: string | null;
  text: string;
  isRemade: boolean;
}

export interface SavedProject {
  id: string;
  title: string;
  drawingStyleId: string;
  pages: SavedPageItem[];
  createdAt: number;
  updatedAt: number;
  /** URI of the first page image used as thumbnail */
  thumbnailUri: string | null;
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

const INDEX_KEY = "@kdp_projects_index"; // string[] of project IDs
const projectKey = (id: string) => `@kdp_project_${id}`;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProjectStore() {
  /** Return all saved projects sorted by updatedAt desc */
  const listProjects = useCallback(async (): Promise<SavedProject[]> => {
    try {
      const indexJson = await AsyncStorage.getItem(INDEX_KEY);
      const ids: string[] = indexJson ? JSON.parse(indexJson) : [];
      if (ids.length === 0) return [];

      const entries = await AsyncStorage.multiGet(ids.map(projectKey));
      const projects: SavedProject[] = [];
      for (const [, value] of entries) {
        if (value) {
          try {
            projects.push(JSON.parse(value) as SavedProject);
          } catch {
            // skip corrupted entries
          }
        }
      }
      return projects.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
      return [];
    }
  }, []);

  /** Save or overwrite a project */
  const saveProject = useCallback(
    async (project: SavedProject): Promise<void> => {
      // Update the project record
      await AsyncStorage.setItem(projectKey(project.id), JSON.stringify(project));

      // Update the index
      const indexJson = await AsyncStorage.getItem(INDEX_KEY);
      const ids: string[] = indexJson ? JSON.parse(indexJson) : [];
      if (!ids.includes(project.id)) {
        ids.push(project.id);
        await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(ids));
      }
    },
    []
  );

  /** Load a single project by ID */
  const loadProject = useCallback(async (id: string): Promise<SavedProject | null> => {
    try {
      const json = await AsyncStorage.getItem(projectKey(id));
      return json ? (JSON.parse(json) as SavedProject) : null;
    } catch {
      return null;
    }
  }, []);

  /** Delete a project by ID */
  const deleteProject = useCallback(async (id: string): Promise<void> => {
    await AsyncStorage.removeItem(projectKey(id));

    const indexJson = await AsyncStorage.getItem(INDEX_KEY);
    const ids: string[] = indexJson ? JSON.parse(indexJson) : [];
    const newIds = ids.filter((i) => i !== id);
    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(newIds));
  }, []);

  /** Create a new project ID */
  const generateId = useCallback((): string => {
    return `proj_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }, []);

  return { listProjects, saveProject, loadProject, deleteProject, generateId };
}
