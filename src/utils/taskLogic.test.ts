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
  decodeDataUrlTextPreview,
  editAttachmentInTask,
  editTodoInTask,
  editUpdateInTask,
  formatFileSize,
  removeFolder,
  removePhotoFromTodoInTask,
  removePhotoFromUpdateInTask,
  removeProject,
  removeTodoFromTask,
  resolveFilePreviewKind,
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

test('trash system moves folders, projects, tasks, todos, sub-todos, updates, and attachments to trash and restores them accurately', async () => {
  const {
    moveFolderToTrash,
    moveProjectToTrash,
    moveTaskToTrash,
    moveTodoToTrash,
    moveSubTodoToTrash,
    moveUpdateToTrash,
    moveAttachmentToTrash,
    restoreTrashItem,
    deleteTrashItemPermanently,
    emptyTrash,
    addSubTodoToTask,
    addAttachmentToTask,
  } = await import('./taskLogic.ts');

  let task = makeMockTask();
  task = addSubTodoToTask(task, 't1', 'Nested sub-step 1');
  task = addAttachmentToTask(task, {
    name: 'spec.pdf',
    type: 'file',
    mimeType: 'application/pdf',
    sizeBytes: 2048,
    url: 'data:application/pdf;base64,AA',
  });
  const subId = task.todos[0].subTodos![0].id;
  const attId = task.attachments[0].id;

  let state: WorkspaceState = {
    folders: [{ id: 'fld-1', name: 'Engineering', createdAt: '2026-11-01T00:00:00Z' }],
    projects: [
      {
        id: 'prj-1',
        folderId: 'fld-1',
        name: 'Mobile Core',
        description: 'Core project',
        createdAt: '2026-11-01T00:00:00Z',
      },
    ],
    tasks: [task],
    trash: [],
    notifications: [],
  };

  // 1. Move sub-todo to trash & restore
  state = moveSubTodoToTrash(state, 'task-1', 't1', subId);
  assert.equal(state.tasks[0].todos[0].subTodos?.length, 0);
  assert.equal(state.trash?.length, 1);
  assert.equal(state.trash![0].itemType, 'subtodo');
  state = restoreTrashItem(state, state.trash![0].id);
  assert.equal(state.tasks[0].todos[0].subTodos?.length, 1);
  assert.equal(state.trash?.length, 0);

  // 2. Move todo to trash & restore
  state = moveTodoToTrash(state, 'task-1', 't2');
  assert.equal(state.tasks[0].todos.length, 1);
  assert.equal(state.trash?.length, 1);
  state = restoreTrashItem(state, state.trash![0].id);
  assert.equal(state.tasks[0].todos.length, 2);

  // 3. Move update to trash & restore
  state = moveUpdateToTrash(state, 'task-1', 'u1');
  assert.equal(state.tasks[0].updates.length, 0);
  state = restoreTrashItem(state, state.trash![0].id);
  assert.equal(state.tasks[0].updates.length, 1);

  // 4. Move attachment to trash & restore
  state = moveAttachmentToTrash(state, 'task-1', 'attachment', attId);
  assert.equal(state.tasks[0].attachments.length, 0);
  state = restoreTrashItem(state, state.trash![0].id);
  assert.equal(state.tasks[0].attachments.length, 1);

  // 5. Move task to trash & restore
  state = moveTaskToTrash(state, 'task-1');
  assert.equal(state.tasks.length, 0);
  state = restoreTrashItem(state, state.trash![0].id);
  assert.equal(state.tasks.length, 1);

  // 6. Move project to trash & restore
  state = moveProjectToTrash(state, 'prj-1');
  assert.equal(state.projects.length, 0);
  assert.equal(state.tasks.length, 0);
  state = restoreTrashItem(state, state.trash![0].id);
  assert.equal(state.projects.length, 1);
  assert.equal(state.tasks.length, 1);

  // 7. Move folder to trash & restore
  state = moveFolderToTrash(state, 'fld-1');
  assert.equal(state.folders.length, 0);
  assert.equal(state.projects.length, 0);
  assert.equal(state.tasks.length, 0);
  state = restoreTrashItem(state, state.trash![0].id);
  assert.equal(state.folders.length, 1);
  assert.equal(state.projects.length, 1);
  assert.equal(state.tasks.length, 1);

  // 8. Permanent delete & empty trash
  state = moveTaskToTrash(state, 'task-1');
  const trashId = state.trash![0].id;
  state = deleteTrashItemPermanently(state, trashId);
  assert.equal(state.trash?.length, 0);

  state = moveFolderToTrash(state, 'fld-1');
  assert.equal(state.trash?.length, 1);
  state = emptyTrash(state);
  assert.equal(state.trash?.length, 0);
});

test('notification system logs updates, deduplicates due date and time reminders, and marks read', async () => {
  const {
    appendNotification,
    generateDueTaskReminders,
    markNotificationRead,
    markAllNotificationsRead,
    clearAllNotifications,
  } = await import('./taskLogic.ts');

  const overdueTask = makeMockTask({
    id: 'tsk-overdue',
    title: 'Overdue Task',
    dueDate: '2026-11-10',
    dueTime: '09:00',
    status: 'in_progress',
  });
  const dueTodayTask = makeMockTask({
    id: 'tsk-today',
    title: 'Due Today Task',
    dueDate: '2026-11-14',
    dueTime: '18:00',
    status: 'todo',
  });

  let state: WorkspaceState = {
    folders: [],
    projects: [],
    tasks: [overdueTask, dueTodayTask],
    trash: [],
    notifications: [],
  };

  // Reference time: 2026-11-14 10:00 local
  const refDate = new Date(2026, 10, 14, 10, 0, 0);
  state = generateDueTaskReminders(state, refDate);
  assert.equal(state.notifications?.length, 2);
  assert.equal(state.notifications!.every((n) => n.category === 'reminder'), true);

  // Deduplication check: running again on same date does not duplicate reminders
  state = generateDueTaskReminders(state, refDate);
  assert.equal(state.notifications?.length, 2);

  // Append an activity update notification
  state = appendNotification(state, {
    category: 'update',
    section: 'update',
    title: 'Added Task Update',
    message: 'Completed sensor calibration',
  });
  assert.equal(state.notifications?.length, 3);
  assert.equal(state.notifications![0].read, false);

  state = markNotificationRead(state, state.notifications![0].id);
  assert.equal(state.notifications![0].read, true);

  state = markAllNotificationsRead(state);
  assert.equal(state.notifications!.every((n) => n.read), true);

  state = clearAllNotifications(state);
  assert.equal(state.notifications?.length, 0);
});

test('local folder auto-overwrite builds single-file payload for masar_workspace_autosave.json', async () => {
  const localStore = new Map<string, string>();
  (globalThis as unknown as { window: any }).window = {
    localStorage: {
      getItem: (key: string) => localStore.get(key) ?? null,
      setItem: (key: string, val: string) => {
        localStore.set(key, val);
      },
    },
  };

  const {
    addCustomDeviceFolderOption,
    AUTOSAVE_FILENAME,
    buildLocalOverwritePayload,
    connectSelectedDeviceFolder,
    loadDeviceFolderOptions,
    loadLocalFolderMeta,
    saveLocalFolderMeta,
    tryNativeDirectoryPickerFirst,
  } = await import('./localFolderSync.ts');

  assert.equal(AUTOSAVE_FILENAME, 'masar_workspace_autosave.json');
  const defaultMeta = loadLocalFolderMeta();
  assert.equal(defaultMeta.fileName, 'masar_workspace_autosave.json');

  saveLocalFolderMeta({
    ...defaultMeta,
    isConnected: true,
    folderName: 'MyPrivateTasks',
    overwriteCount: 5,
  });
  const loaded = loadLocalFolderMeta();
  assert.equal(loaded.isConnected, true);
  assert.equal(loaded.folderName, 'MyPrivateTasks');
  assert.equal(loaded.overwriteCount, 5);

  const built = buildLocalOverwritePayload(getDefaultWorkspaceState(), 'en', true);
  assert.equal(built.payload.overwrittenFile, 'masar_workspace_autosave.json');
  assert.equal(built.byteLength > 100, true);

  // Mobile/Device folder picker options & custom folder creation
  const initialFolders = loadDeviceFolderOptions();
  assert.equal(initialFolders.length >= 5, true);

  const customFolder = addCustomDeviceFolderOption('PhoneStorage/MyMobileTasks');
  assert.equal(customFolder.path, 'PhoneStorage/MyMobileTasks');
  const updatedFolders = loadDeviceFolderOptions();
  assert.equal(
    updatedFolders.some((f) => f.path === 'PhoneStorage/MyMobileTasks'),
    true
  );

  // Without window.showDirectoryPicker (like on mobile), tryNativeDirectoryPickerFirst requests modal picker
  const nativeCheck = await tryNativeDirectoryPickerFirst(
    getDefaultWorkspaceState(),
    'en',
    true
  );
  assert.equal(nativeCheck.requiresModalPicker, true);

  // Connecting a selected mobile folder updates meta and increments overwriteCount
  const connectedMeta = await connectSelectedDeviceFolder(
    getDefaultWorkspaceState(),
    'en',
    true,
    'PhoneStorage/MyMobileTasks'
  );
  assert.equal(connectedMeta.isConnected, true);
  assert.equal(connectedMeta.folderName, 'PhoneStorage/MyMobileTasks');
  assert.equal(connectedMeta.fileName, 'masar_workspace_autosave.json');
});

test('resolveFilePreviewKind and decodeDataUrlTextPreview handle PDF, text, image, audio, video, and base64 data URLs', () => {
  assert.equal(
    resolveFilePreviewKind({ name: 'report.pdf', mimeType: 'application/pdf' }),
    'pdf'
  );
  assert.equal(
    resolveFilePreviewKind({ name: 'notes.txt', mimeType: 'text/plain' }),
    'text'
  );
  assert.equal(
    resolveFilePreviewKind({ name: 'config.json', mimeType: 'application/json' }),
    'text'
  );
  assert.equal(
    resolveFilePreviewKind({ name: 'diagram.png', mimeType: 'image/png' }),
    'image'
  );
  assert.equal(
    resolveFilePreviewKind({ name: 'recording.mp3', mimeType: 'audio/mpeg' }),
    'audio'
  );
  assert.equal(
    resolveFilePreviewKind({ name: 'demo.mp4', mimeType: 'video/mp4' }),
    'video'
  );
  assert.equal(
    resolveFilePreviewKind({ name: 'archive.zip', mimeType: 'application/zip' }),
    'other'
  );

  const sampleText = 'Task Tracker File Preview Test — 100% Working';
  const b64 = Buffer.from(sampleText, 'utf-8').toString('base64');
  const dataUrl = `data:text/plain;base64,${b64}`;
  assert.equal(decodeDataUrlTextPreview(dataUrl), sampleText);
  assert.equal(decodeDataUrlTextPreview('https://example.com/file.pdf'), null);
});

test('parseBackupPayload, scanFileListForBackup, and scanDirectoryHandleForBackup detect backups automatically without overwriting', async () => {
  const {
    parseBackupPayload,
    scanFileListForBackup,
    scanDirectoryHandleForBackup,
    AUTOSAVE_FILENAME,
  } = await import('./localFolderSync.ts');

  const backupWorkspace: WorkspaceState = {
    folders: [{ id: 'f-bak', name: 'Restored Folder', createdAt: '2026-11-14T12:00:00Z' }],
    projects: [
      {
        id: 'p-bak',
        folderId: 'f-bak',
        name: 'Restored Project',
        description: 'Loaded cleanly after confirmation',
        createdAt: '2026-11-14T12:00:00Z',
      },
    ],
    tasks: [makeMockTask({ id: 'tsk-bak', folderId: 'f-bak', projectId: 'p-bak', title: 'Restored Task Alpha' })],
    trash: [],
    notifications: [],
  };

  const payloadString = JSON.stringify({
    version: 4,
    exportedAt: '2026-11-14T15:30:00Z',
    overwrittenFile: AUTOSAVE_FILENAME,
    preferences: { lang: 'ar', darkMode: true, appPassword: 'S@120687h' },
    workspace: backupWorkspace,
  });

  const parsed = parseBackupPayload(payloadString, AUTOSAVE_FILENAME, 'On My iPhone/Work', 'file_list');
  assert.ok(parsed);
  assert.equal(parsed!.workspace.tasks[0].title, 'Restored Task Alpha');
  assert.equal(parsed!.preferences?.lang, 'ar');
  assert.equal(parsed!.preferences?.darkMode, true);
  assert.equal(parseBackupPayload('{ "invalid": true }'), null);

  // 1. Scan iPhone/directory FileList containing unrelated files + backup JSON
  const fileListScan = await scanFileListForBackup([
    {
      name: 'notes.txt',
      webkitRelativePath: 'MyIphoneFolder/notes.txt',
      text: async () => 'plain text file',
      size: 15,
    },
    {
      name: 'other_backup.json',
      webkitRelativePath: 'MyIphoneFolder/other_backup.json',
      text: async () => JSON.stringify({ folders: [], projects: [], tasks: [] }),
      size: 40,
    },
    {
      name: AUTOSAVE_FILENAME,
      webkitRelativePath: `MyIphoneFolder/${AUTOSAVE_FILENAME}`,
      text: async () => payloadString,
      size: payloadString.length,
    },
  ]);

  assert.equal(fileListScan.hasBackup, true);
  assert.equal(fileListScan.folderName, 'iPhone Files/MyIphoneFolder');
  assert.equal(fileListScan.backup?.fileName, AUTOSAVE_FILENAME);
  assert.equal(fileListScan.backup?.workspace.tasks[0].title, 'Restored Task Alpha');

  // 2. Scan empty folder FileList (no valid backup JSON)
  const emptyScan = await scanFileListForBackup([
    {
      name: 'readme.txt',
      webkitRelativePath: 'FreshFolder/readme.txt',
      text: async () => 'hello',
      size: 5,
    },
  ]);
  assert.equal(emptyScan.hasBackup, false);
  assert.equal(emptyScan.folderName, 'iPhone Files/FreshFolder');

  // 3. Scan DirectoryHandle ensures it does NOT invoke createWritable while scanning
  let writableCalledDuringScan = false;
  const mockDirHandle = {
    name: 'DesktopWorkSync',
    getFileHandle: async (name: string) => {
      assert.equal(name, AUTOSAVE_FILENAME);
      return {
        getFile: async () => ({
          name: AUTOSAVE_FILENAME,
          text: async () => payloadString,
        }),
        createWritable: async () => {
          writableCalledDuringScan = true;
          throw new Error('Must not overwrite during scan');
        },
      };
    },
  };

  const dirScan = await scanDirectoryHandleForBackup(mockDirHandle);
  assert.equal(dirScan.hasBackup, true);
  assert.equal(writableCalledDuringScan, false);
  assert.equal(dirScan.backup?.workspace.folders[0].name, 'Restored Folder');
});






