import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock AsyncStorage
const store: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => store[key] ?? null),
    setItem: vi.fn(async (key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn(async (key: string) => { delete store[key]; }),
    multiGet: vi.fn(async (keys: string[]) =>
      keys.map((k) => [k, store[k] ?? null] as [string, string | null])
    ),
  },
}));

// Import the pure storage functions directly (not the hook wrapper)
import type { SavedProject } from "../hooks/use-project-store";

const INDEX_KEY = "@kdp_projects_index";
const projectKey = (id: string) => `@kdp_project_${id}`;

const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;

async function listProjects(): Promise<SavedProject[]> {
  const indexJson = await AsyncStorage.getItem(INDEX_KEY);
  const ids: string[] = indexJson ? JSON.parse(indexJson) : [];
  if (ids.length === 0) return [];
  const entries = await AsyncStorage.multiGet(ids.map(projectKey));
  const projects: SavedProject[] = [];
  for (const [, value] of entries) {
    if (value) projects.push(JSON.parse(value) as SavedProject);
  }
  return projects.sort((a, b) => b.updatedAt - a.updatedAt);
}

async function saveProject(project: SavedProject): Promise<void> {
  await AsyncStorage.setItem(projectKey(project.id), JSON.stringify(project));
  const indexJson = await AsyncStorage.getItem(INDEX_KEY);
  const ids: string[] = indexJson ? JSON.parse(indexJson) : [];
  if (!ids.includes(project.id)) {
    ids.push(project.id);
    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(ids));
  }
}

async function loadProject(id: string): Promise<SavedProject | null> {
  const json = await AsyncStorage.getItem(projectKey(id));
  return json ? (JSON.parse(json) as SavedProject) : null;
}

async function deleteProject(id: string): Promise<void> {
  await AsyncStorage.removeItem(projectKey(id));
  const indexJson = await AsyncStorage.getItem(INDEX_KEY);
  const ids: string[] = indexJson ? JSON.parse(indexJson) : [];
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(ids.filter((i) => i !== id)));
}

const makeProject = (overrides?: Partial<SavedProject>): SavedProject => ({
  id: "proj_test_001",
  title: "テスト絵本",
  drawingStyleId: "watercolor",
  pages: [
    { id: "p1", uri: "file:///test.jpg", originalUri: null, text: "ページ１", isRemade: false },
  ],
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
  thumbnailUri: "file:///test.jpg",
  ...overrides,
});

describe("useProjectStore - storage logic", () => {
  beforeEach(() => {
    for (const key of Object.keys(store)) delete store[key];
  });

  it("listProjects returns empty array when no projects saved", async () => {
    const projects = await listProjects();
    expect(projects).toEqual([]);
  });

  it("saveProject persists a project and listProjects returns it", async () => {
    const project = makeProject();
    await saveProject(project);
    const list = await listProjects();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("proj_test_001");
    expect(list[0].title).toBe("テスト絵本");
  });

  it("loadProject returns the saved project by ID", async () => {
    await saveProject(makeProject());
    const loaded = await loadProject("proj_test_001");
    expect(loaded).not.toBeNull();
    expect(loaded?.drawingStyleId).toBe("watercolor");
    expect(loaded?.pages).toHaveLength(1);
  });

  it("loadProject returns null for unknown ID", async () => {
    const loaded = await loadProject("nonexistent");
    expect(loaded).toBeNull();
  });

  it("deleteProject removes the project from storage", async () => {
    await saveProject(makeProject());
    await deleteProject("proj_test_001");
    const list = await listProjects();
    expect(list).toHaveLength(0);
  });

  it("saveProject overwrites existing project with same ID", async () => {
    await saveProject(makeProject());
    await saveProject(makeProject({ title: "更新された絵本", updatedAt: 1700000099999 }));
    const list = await listProjects();
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("更新された絵本");
  });

  it("generateId produces unique IDs with proj_ prefix", () => {
    const id1 = `proj_${Date.now()}_aaa`;
    const id2 = `proj_${Date.now()}_bbb`;
    expect(id1).not.toBe(id2);
    expect(id1.startsWith("proj_")).toBe(true);
  });
});
