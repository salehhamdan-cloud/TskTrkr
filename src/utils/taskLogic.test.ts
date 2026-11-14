import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addAttachmentToTask,
  addPhotoToTodoInTask,
  addPhotoToUpdateInTask,
  addTodoToTask,
  addUpdateToTask,
  annotatePhotoInTask,
  calculateTaskProgress,
  computeProjectMetrics,
  createFolder,
  createProject,
  editAttachmentInTask,
  editTodoInTask,
  editUpdateInTask,
  formatFileSize,
  removeFolder,
  removePhotoFromTodoInTask,
  removePhotoFromUpdateInTask,
  removeProject,
  removeTodoFromTask,
  searchWorkspace,
  toggleTodoInTask,
  updateFolder,
  updateProject,
} from './taskLogic';
import { buildPdfFromJpegBytes, computeThumbnailDrawRect } from './pdfExport';
import { TaskItem, WorkspaceState } from '../types/task';
import { TRANSLATIONS } from '../i18n/translations';
import { getDefaultWorkspaceState } from './offlineStorage';

const makeMockTask = (overrides: Partial<TaskItem> = {}): TaskItem => ({
  id: 'task-1',
  folderId: 'fld-1',
  projectId: 'prj-1',
  title: 'Implement Offline Hive Sync Layer',
  description: 'Configure local persistence and automatic conflict resolution.',
  project: 'Mobile Core',
  priority: 'high',
  status: 'in_progress',
  dueDate: '2026-11-15',
  manualProgress: 0,
  todos: [
    { id: 't1', title: 'Define TaskAdapter schema', completed: true, createdAt: '2026-11-08T09:00:00Z' },
    { id: 't2', title: 'Write local box hydration service', completed: false, createdAt: '2026-11-08T10:00:00Z' },
  ],
  updates: [
    {
      id: 'u1',
      content: 'Benchmark passed',
      timestamp: '2026-11-10T09:00',
      author: 'Saleh',
      milestoneTag: 'QA-Verified',
    },
  ],
  attachments: [],
  createdAt: '2026-11-08T09:00:00Z',
  updatedAt: '2026-11-08T09:00:00Z',
  ...overrides,
});

test('calculateTaskProgress computes exact percentage from nested to-dos', () => {
  const task = makeMockTask();
  assert.equal(calculateTaskProgress(task), 50);

  const toggled = toggleTodoInTask(task, 't2');
  assert.equal(calculateTaskProgress(toggled), 100);
  assert.equal(toggled.status, 'completed');
});

test('addTodoToTask, editTodoInTask, and removeTodoFromTask update checklist accurately', () => {
  const task = makeMockTask({
    todos: [
      { id: 't1', title: 'Step 1', completed: true, createdAt: '2026-11-08T09:00:00Z' },
    ],
    status: 'completed',
  });
  assert.equal(calculateTaskProgress(task), 100);

  const withSecond = addTodoToTask(task, 'Step 2');
  assert.equal(withSecond.todos.length, 2);
  assert.equal(calculateTaskProgress(withSecond), 50);

  const editedSecond = editTodoInTask(withSecond, withSecond.todos[1].id, 'Step 2 Renamed');
  assert.equal(editedSecond.todos[1].title, 'Step 2 Renamed');

  const removedSecond = removeTodoFromTask(editedSecond, editedSecond.todos[1].id);
  assert.equal(calculateTaskProgress(removedSecond), 100);
  assert.equal(removedSecond.status, 'completed');
});

test('addUpdateToTask and editUpdateInTask manage timestamped updates', () => {
  let task = makeMockTask({ updates: [] });
  task = addUpdateToTask(task, {
    content: 'Initial architecture review passed.',
    timestamp: '2026-11-09T14:30',
    author: 'Maya Lin',
  });
  task = editUpdateInTask(task, task.updates[0].id, {
    content: 'Architecture review approved with offline sync.',
    timestamp: '2026-11-10T10:00',
  });

  assert.equal(task.updates.length, 1);
  assert.equal(task.updates[0].content, 'Architecture review approved with offline sync.');
  assert.equal(task.updates[0].timestamp, '2026-11-10T10:00');
});

test('Folder and Project hierarchy CRUD operations cascade cleanly', () => {
  let state: WorkspaceState = {
    folders: [],
    projects: [],
    tasks: [],
  };

  const folderRes = createFolder(state, 'Engineering');
  state = folderRes.state;
  const folderId = folderRes.createdFolder!.id;
  assert.equal(state.folders.length, 1);

  state = updateFolder(state, folderId, 'Core Engineering');
  assert.equal(state.folders[0].name, 'Core Engineering');

  const projRes = createProject(state, folderId, 'Mobile V2', 'Cross-platform release');
  state = projRes.state;
  const projectId = projRes.createdProject!.id;
  assert.equal(state.projects.length, 1);

  state.tasks.push(makeMockTask({ folderId, projectId, project: 'Mobile V2' }));
  state = updateProject(state, projectId, { name: 'Mobile V3' });
  assert.equal(state.projects[0].name, 'Mobile V3');
  assert.equal(state.tasks[0].project, 'Mobile V3');

  state = removeProject(state, projectId);
  assert.equal(state.projects.length, 0);
  assert.equal(state.tasks.length, 0);

  state = removeFolder(state, folderId);
  assert.equal(state.folders.length, 0);
});

test('searchWorkspace matches folders, projects, tasks, and milestone tags across languages', () => {
  const defaultState = getDefaultWorkspaceState();
  const folderMatches = searchWorkspace(defaultState, 'Engineering', 'en');
  assert.equal(folderMatches.some((r) => r.type === 'folder'), true);

  const arabicMatches = searchWorkspace(defaultState, 'المستشعر', 'ar');
  assert.equal(arabicMatches.length > 0, true);

  const tagMatches = searchWorkspace(defaultState, 'Verified', 'en');
  assert.equal(tagMatches.some((r) => r.type === 'task'), true);
});

test('buildPdfFromJpegBytes and computeThumbnailDrawRect generate valid PDF and aspect-fit bounds', () => {
  const dummyJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  const pdfBytes = buildPdfFromJpegBytes(dummyJpeg, 800, 1200);
  const text = new TextDecoder().decode(pdfBytes);
  assert.equal(text.startsWith('%PDF-1.4'), true);
  assert.equal(text.trimEnd().endsWith('%%EOF'), true);

  const rect = computeThumbnailDrawRect(1600, 800, 10, 20, 400, 300);
  assert.equal(rect.width, 400);
  assert.equal(rect.height, 200);
  assert.equal(rect.x, 10);
  assert.equal(rect.y, 70);
});

test('photos on To-Dos, Task Updates, and Attachments support adding, deleting, and cross-section annotation', () => {
  let task = makeMockTask();

  // 1. Add photo to To-Do item t1 and annotate it
  task = addPhotoToTodoInTask(task, 't1', {
    name: 'todo_snap.jpg',
    type: 'photo',
    mimeType: 'image/jpeg',
    sizeBytes: 120000,
    url: 'data:image/jpeg;base64,OLD',
    caption: 'Initial todo photo',
  });
  const todoPhotoId = task.todos[0].photos![0].id;
  task = annotatePhotoInTask(
    task,
    { section: 'todo', parentId: 't1', photoId: todoPhotoId },
    'data:image/jpeg;base64,ANNOTATED_TODO',
    'Annotated todo photo'
  );
  assert.equal(task.todos[0].photos![0].url, 'data:image/jpeg;base64,ANNOTATED_TODO');
  assert.equal(task.todos[0].photos![0].caption, 'Annotated todo photo');
  assert.equal(Boolean(task.todos[0].photos![0].annotatedAt), true);

  // 2. Add photo to Task Update u1 and annotate it
  task = addPhotoToUpdateInTask(task, 'u1', {
    name: 'update_snap.jpg',
    type: 'photo',
    mimeType: 'image/jpeg',
    sizeBytes: 240000,
    url: 'data:image/jpeg;base64,OLD_UPD',
    caption: 'Initial update photo',
  });
  const updPhotoId = task.updates[0].photos![0].id;
  task = annotatePhotoInTask(
    task,
    { section: 'update', parentId: 'u1', photoId: updPhotoId },
    'data:image/jpeg;base64,ANNOTATED_UPD',
    'Annotated update photo'
  );
  assert.equal(task.updates[0].photos![0].url, 'data:image/jpeg;base64,ANNOTATED_UPD');
  assert.equal(task.updates[0].photos![0].caption, 'Annotated update photo');

  // 3. Add photo to Task Attachments and annotate it
  task = addAttachmentToTask(task, {
    name: 'wireframe.jpg',
    type: 'photo',
    mimeType: 'image/jpeg',
    sizeBytes: 512000,
    url: '/src/assets/images/sample.jpg',
    caption: 'Draft 1',
  });
  const attPhotoId = task.attachments[0].id;
  task = annotatePhotoInTask(
    task,
    { section: 'attachment', photoId: attPhotoId },
    'data:image/jpeg;base64,ANNOTATED_ATT',
    'Annotated attachment photo'
  );
  assert.equal(task.attachments[0].url, 'data:image/jpeg;base64,ANNOTATED_ATT');

  // 4. Verify computeProjectMetrics counts all 3 photos
  const metrics = computeProjectMetrics([task], '2026-11-10');
  assert.equal(metrics.totalPhotos, 3);

  // 5. Remove photos from To-Do and Update
  task = removePhotoFromTodoInTask(task, 't1', todoPhotoId);
  task = removePhotoFromUpdateInTask(task, 'u1', updPhotoId);
  assert.equal(task.todos[0].photos!.length, 0);
  assert.equal(task.updates[0].photos!.length, 0);

  task = editAttachmentInTask(task, attPhotoId, {
    name: 'wireframe_v2.jpg',
    caption: 'Updated caption',
  });
  assert.equal(task.attachments[0].name, 'wireframe_v2.jpg');
  assert.equal(formatFileSize(1048576), '1.00 MB');

  const enKeys = Object.keys(TRANSLATIONS.en).sort();
  const arKeys = Object.keys(TRANSLATIONS.ar).sort();
  const heKeys = Object.keys(TRANSLATIONS.he).sort();
  assert.deepEqual(enKeys, arKeys);
  assert.deepEqual(enKeys, heKeys);
});

test('loadSavedLanguage, saveLanguage, loadSavedTheme, and saveTheme persist settings in localStorage', async () => {
  const store = new Map<string, string>();
  const mockWindow = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, val: string) => {
        store.set(key, val);
      },
    },
  };
  (globalThis as unknown as { window: typeof mockWindow }).window = mockWindow;

  const {
    loadSavedLanguage,
    saveLanguage,
    loadSavedTheme,
    saveTheme,
    LANG_STORAGE_KEY,
    THEME_STORAGE_KEY,
  } = await import('./offlineStorage.ts');

  assert.equal(loadSavedLanguage(), 'en');
  assert.equal(loadSavedTheme(), false);

  saveLanguage('ar');
  saveTheme(true);

  assert.equal(store.get(LANG_STORAGE_KEY), 'ar');
  assert.equal(store.get(THEME_STORAGE_KEY), 'dark');
  assert.equal(loadSavedLanguage(), 'ar');
  assert.equal(loadSavedTheme(), true);

  saveLanguage('he');
  saveTheme(false);

  assert.equal(loadSavedLanguage(), 'he');
  assert.equal(loadSavedTheme(), false);
});

test('sub-todos can be added, toggled, edited, and removed from a todo item', async () => {
  const {
    addTodoToTask,
    addSubTodoToTask,
    toggleSubTodoInTask,
    editSubTodoInTask,
    removeSubTodoFromTask,
    calculateTaskProgress,
  } = await import('./taskLogic.ts');
  const { TaskItem } = await import('../types/task.ts') as unknown as { TaskItem: any };

  let task: any = {
    id: 'tsk-sub-test',
    title: 'Sub-todo test task',
    description: 'Testing sub-todos',
    project: 'Test Project',
    priority: 'high',
    status: 'todo',
    dueDate: '2026-11-20',
    manualProgress: 0,
    todos: [],
    updates: [],
    attachments: [],
    createdAt: '2026-11-12T00:00:00.000Z',
    updatedAt: '2026-11-12T00:00:00.000Z',
  };

  // 1. Add todo
  task = addTodoToTask(task, 'Main Step 1');
  assert.equal(task.todos.length, 1);
  const todoId = task.todos[0].id;
  assert.equal(calculateTaskProgress(task), 0);

  // 2. Add sub-todos
  task = addSubTodoToTask(task, todoId, 'Sub Step A');
  task = addSubTodoToTask(task, todoId, 'Sub Step B');
  assert.equal(task.todos[0].subTodos?.length, 2);
  assert.equal(calculateTaskProgress(task), 0);

  // 3. Toggle first sub-todo
  const subAId = task.todos[0].subTodos![0].id;
  const subBId = task.todos[0].subTodos![1].id;
  task = toggleSubTodoInTask(task, todoId, subAId);
  assert.equal(task.todos[0].subTodos![0].completed, true);
  assert.equal(task.todos[0].completed, false); // Not all sub-todos are completed yet
  assert.equal(calculateTaskProgress(task), 50);

  // 4. Edit sub-todo
  task = editSubTodoInTask(task, todoId, subBId, 'Sub Step B Updated');
  assert.equal(task.todos[0].subTodos![1].title, 'Sub Step B Updated');

  // 5. Toggle second sub-todo -> parent completes
  task = toggleSubTodoInTask(task, todoId, subBId);
  assert.equal(task.todos[0].completed, true);
  assert.equal(calculateTaskProgress(task), 100);

  // 6. Remove sub-todo
  task = removeSubTodoFromTask(task, todoId, subBId);
  assert.equal(task.todos[0].subTodos?.length, 1);
  assert.equal(calculateTaskProgress(task), 100);
});

test('app password defaults to S@120687h, verifies accurately, updates in localStorage, and manages session lock', async () => {
  const localStore = new Map<string, string>();
  const sessionStore = new Map<string, string>();
  const mockWindow = {
    localStorage: {
      getItem: (key: string) => localStore.get(key) ?? null,
      setItem: (key: string, val: string) => {
        localStore.set(key, val);
      },
    },
    sessionStorage: {
      getItem: (key: string) => sessionStore.get(key) ?? null,
      setItem: (key: string, val: string) => {
        sessionStore.set(key, val);
      },
      removeItem: (key: string) => {
        sessionStore.delete(key);
      },
    },
  };
  (globalThis as unknown as { window: typeof mockWindow }).window = mockWindow;

  const {
    DEFAULT_APP_PASSWORD,
    loadAppPassword,
    saveAppPassword,
    verifyAppPassword,
    isSessionUnlocked,
    setSessionUnlocked,
  } = await import('./offlineStorage.ts');

  assert.equal(DEFAULT_APP_PASSWORD, 'S@120687h');
  assert.equal(loadAppPassword(), 'S@120687h');
  assert.equal(verifyAppPassword('S@120687h'), true);
  assert.equal(verifyAppPassword('wrong'), false);
  assert.equal(isSessionUnlocked(), false);

  setSessionUnlocked(true);
  assert.equal(isSessionUnlocked(), true);

  setSessionUnlocked(false);
  assert.equal(isSessionUnlocked(), false);

  assert.equal(saveAppPassword('MySecret99'), true);
  assert.equal(loadAppPassword(), 'MySecret99');
  assert.equal(verifyAppPassword('S@120687h'), false);
  assert.equal(verifyAppPassword('MySecret99'), true);
});


