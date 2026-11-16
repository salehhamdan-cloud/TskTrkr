import {
  AppNotification,
  FolderItem,
  LanguageCode,
  NotificationCategory,
  NotificationSection,
  PhotoTargetRef,
  ProjectGroupItem,
  ProjectMetrics,
  RecurrenceCustomUnit,
  RecurrenceFrequency,
  SelectedSidebarNode,
  SubTodoItem,
  TagColor,
  TaskAttachment,
  TaskItem,
  TaskPriority,
  TaskRecurrenceRule,
  TaskStatus,
  TaskTag,
  TaskTemplate,
  TaskUpdateLog,
  TodoItem,
  TrashItem,
  WorkspaceState,
} from '../types/task';
import { resolveLocalizedText, TranslationDictionary } from '../i18n/translations';

export interface GlobalSearchResult {
  id: string;
  node: SelectedSidebarNode;
  type: 'folder' | 'project' | 'task';
  title: string;
  subtitle: string;
  matchedField: string;
  priority?: TaskPriority;
}

/**
 * Global search across folders, projects, and tasks by name, description,
 * localized strings, priority/status tags, milestone tags, or checklist items.
 */
export function searchWorkspace(
  state: WorkspaceState,
  query: string,
  lang: LanguageCode = 'en'
): GlobalSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: GlobalSearchResult[] = [];

  // 1. Search Folders
  for (const folder of state.folders) {
    const displayTitle = resolveLocalizedText(folder.name, folder.localizedName, lang);
    const searchable = [
      folder.name,
      folder.localizedName?.en,
      folder.localizedName?.ar,
      folder.localizedName?.he,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (searchable.includes(q)) {
      results.push({
        id: `folder-${folder.id}`,
        node: { type: 'folder', id: folder.id },
        type: 'folder',
        title: displayTitle,
        subtitle: `${state.projects.filter((p) => p.folderId === folder.id).length} projects`,
        matchedField: 'name',
      });
    }
  }

  // 2. Search Projects
  for (const proj of state.projects) {
    const displayTitle = resolveLocalizedText(proj.name, proj.localizedName, lang);
    const displayDesc = resolveLocalizedText(
      proj.description,
      proj.localizedDescription,
      lang
    );
    const searchable = [
      proj.name,
      proj.description,
      proj.localizedName?.en,
      proj.localizedName?.ar,
      proj.localizedName?.he,
      proj.localizedDescription?.en,
      proj.localizedDescription?.ar,
      proj.localizedDescription?.he,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (searchable.includes(q)) {
      results.push({
        id: `project-${proj.id}`,
        node: { type: 'project', id: proj.id },
        type: 'project',
        title: displayTitle,
        subtitle: displayDesc || proj.name,
        matchedField: 'project',
      });
    }
  }

  // 3. Search Tasks (by title, description, priority/status tag, milestoneTag, nested to-dos, or sub-todos)
  for (const task of state.tasks) {
    const displayTitle = resolveLocalizedText(task.title, task.localizedTitle, lang);
    const displayDesc = resolveLocalizedText(
      task.description,
      task.localizedDescription,
      lang
    );
    const milestoneTags = task.updates
      .map((u) => u.milestoneTag)
      .filter(Boolean)
      .join(' ');
    const customTagLabels = (task.tags || [])
      .map((tg) => tg.label)
      .filter(Boolean)
      .join(' ');
    const todoTexts = task.todos
      .map((td) => {
        const subTexts = (td.subTodos || [])
          .map((std) =>
            [std.title, std.localizedTitle?.en, std.localizedTitle?.ar, std.localizedTitle?.he]
              .filter(Boolean)
              .join(' ')
          )
          .join(' ');
        return [
          td.title,
          td.localizedTitle?.en,
          td.localizedTitle?.ar,
          td.localizedTitle?.he,
          subTexts,
        ]
          .filter(Boolean)
          .join(' ');
      })
      .join(' ');

    const searchable = [
      task.title,
      task.description,
      task.project,
      task.priority,
      task.status,
      task.localizedTitle?.en,
      task.localizedTitle?.ar,
      task.localizedTitle?.he,
      task.localizedDescription?.en,
      task.localizedDescription?.ar,
      task.localizedDescription?.he,
      milestoneTags,
      customTagLabels,
      todoTexts,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (searchable.includes(q)) {
      const prog = calculateTaskProgress(task);
      const isTagMatch =
        milestoneTags.toLowerCase().includes(q) ||
        customTagLabels.toLowerCase().includes(q);
      results.push({
        id: `task-${task.id}`,
        node: { type: 'task', id: task.id },
        type: 'task',
        title: displayTitle,
        subtitle: `${prog}% · ${displayDesc || task.project}`,
        matchedField: isTagMatch ? 'tag' : 'task',
        priority: task.priority,
      });
    }
  }

  return results;
}

/**
 * Counts total units and completed units in a task's to-dos, including nested sub-todos.
 * If a to-do has sub-todos, the sub-todos serve as the granular units.
 */
export function getTaskTodoCounts(todos: TodoItem[]): { total: number; completed: number } {
  let total = 0;
  let completed = 0;
  for (const todo of todos) {
    if (todo.subTodos && todo.subTodos.length > 0) {
      total += todo.subTodos.length;
      completed += todo.subTodos.filter((s) => s.completed).length;
    } else {
      total += 1;
      if (todo.completed) completed += 1;
    }
  }
  return { total, completed };
}

/**
 * Calculates the progress percentage (0 - 100) for a single task.
 */
export function calculateTaskProgress(
  task: Pick<TaskItem, 'todos' | 'manualProgress' | 'status'>
): number {
  if (task.todos.length > 0) {
    const { total, completed } = getTaskTodoCounts(task.todos);
    if (total > 0) {
      return Math.round((completed / total) * 100);
    }
  }
  if (task.status === 'completed') {
    return 100;
  }
  return Math.max(0, Math.min(100, Math.round(task.manualProgress || 0)));
}

/**
 * Derives the updated task status automatically when to-dos or manual progress change.
 */
export function deriveTaskStatus(
  currentStatus: TaskStatus,
  progress: number
): TaskStatus {
  if (progress >= 100) return 'completed';
  if (progress === 0) return 'todo';
  if (currentStatus === 'review') return 'review';
  return 'in_progress';
}

/**
 * Folder CRUD helpers
 */
export function createFolder(
  state: WorkspaceState,
  name: string,
  nowIso = new Date().toISOString()
): { state: WorkspaceState; createdFolder?: FolderItem } {
  const trimmed = name.trim();
  if (!trimmed) return { state };
  const newFolder: FolderItem = {
    id: `fld-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: trimmed,
    createdAt: nowIso,
  };
  return {
    state: {
      ...state,
      folders: [...state.folders, newFolder],
    },
    createdFolder: newFolder,
  };
}

export function updateFolder(
  state: WorkspaceState,
  folderId: string,
  newName: string
): WorkspaceState {
  const trimmed = newName.trim();
  if (!trimmed) return state;
  return {
    ...state,
    folders: state.folders.map((f) =>
      f.id === folderId ? { ...f, name: trimmed, localizedName: undefined } : f
    ),
  };
}

export function removeFolder(state: WorkspaceState, folderId: string): WorkspaceState {
  const removedProjectIds = new Set(
    state.projects.filter((p) => p.folderId === folderId).map((p) => p.id)
  );
  return {
    ...state,
    folders: state.folders.filter((f) => f.id !== folderId),
    projects: state.projects.filter((p) => p.folderId !== folderId),
    tasks: state.tasks.filter(
      (t) => t.folderId !== folderId && (!t.projectId || !removedProjectIds.has(t.projectId))
    ),
  };
}

/**
 * Project / Group CRUD helpers
 */
export function createProject(
  state: WorkspaceState,
  folderId: string,
  name: string,
  description = '',
  nowIso = new Date().toISOString()
): { state: WorkspaceState; createdProject?: ProjectGroupItem } {
  const trimmed = name.trim();
  if (!trimmed) return { state };
  const newProject: ProjectGroupItem = {
    id: `prj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    folderId,
    name: trimmed,
    description: description.trim(),
    createdAt: nowIso,
  };
  return {
    state: {
      ...state,
      projects: [...state.projects, newProject],
    },
    createdProject: newProject,
  };
}

export function updateProject(
  state: WorkspaceState,
  projectId: string,
  patch: { name?: string; description?: string }
): WorkspaceState {
  const nextName = patch.name?.trim();
  return {
    ...state,
    projects: state.projects.map((p) =>
      p.id === projectId
        ? {
            ...p,
            name: nextName || p.name,
            description:
              patch.description !== undefined ? patch.description.trim() : p.description,
            localizedName: nextName ? undefined : p.localizedName,
            localizedDescription:
              patch.description !== undefined ? undefined : p.localizedDescription,
          }
        : p
    ),
    tasks: nextName
      ? state.tasks.map((t) => (t.projectId === projectId ? { ...t, project: nextName } : t))
      : state.tasks,
  };
}

export function removeProject(state: WorkspaceState, projectId: string): WorkspaceState {
  return {
    ...state,
    projects: state.projects.filter((p) => p.id !== projectId),
    tasks: state.tasks.filter((t) => t.projectId !== projectId),
  };
}

/**
 * Adds a new nested to-do item to a task (with optional attached photos) and updates status & timestamp.
 */
export function addTodoToTask(
  task: TaskItem,
  title: string,
  photosOrNowIso?: Omit<TaskAttachment, 'id' | 'addedAt'>[] | string,
  nowIsoParam?: string
): TaskItem {
  const trimmed = title.trim();
  if (!trimmed) return task;
  const nowIso =
    typeof photosOrNowIso === 'string'
      ? photosOrNowIso
      : nowIsoParam || new Date().toISOString();
  const initialPhotos: TaskAttachment[] | undefined = Array.isArray(photosOrNowIso)
    ? photosOrNowIso.map((p, idx) => ({
        ...p,
        id: `td-photo-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        addedAt: nowIso,
      }))
    : undefined;

  const newTodo: TodoItem = {
    id: `todo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: trimmed,
    completed: false,
    createdAt: nowIso,
    photos: initialPhotos && initialPhotos.length > 0 ? initialPhotos : undefined,
  };
  const updatedTodos = [...task.todos, newTodo];
  const nextProgress = calculateTaskProgress({
    todos: updatedTodos,
    manualProgress: task.manualProgress,
    status: task.status,
  });
  return {
    ...task,
    todos: updatedTodos,
    status: deriveTaskStatus(task.status, nextProgress),
    updatedAt: nowIso,
  };
}

/**
 * Attaches a photo to an existing To-Do checklist item.
 */
export function addPhotoToTodoInTask(
  task: TaskItem,
  todoId: string,
  photo: Omit<TaskAttachment, 'id' | 'addedAt'>,
  nowIso = new Date().toISOString()
): TaskItem {
  const newPhoto: TaskAttachment = {
    ...photo,
    type: 'photo',
    id: `td-photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    addedAt: nowIso,
  };
  return {
    ...task,
    todos: task.todos.map((td) =>
      td.id === todoId
        ? { ...td, photos: [...(td.photos || []), newPhoto] }
        : td
    ),
    updatedAt: nowIso,
  };
}

/**
 * Removes a photo from a specific To-Do checklist item.
 */
export function removePhotoFromTodoInTask(
  task: TaskItem,
  todoId: string,
  photoId: string,
  nowIso = new Date().toISOString()
): TaskItem {
  return {
    ...task,
    todos: task.todos.map((td) =>
      td.id === todoId
        ? { ...td, photos: (td.photos || []).filter((p) => p.id !== photoId) }
        : td
    ),
    updatedAt: nowIso,
  };
}

/**
 * Edits an existing nested to-do item's title in a task.
 */
export function editTodoInTask(
  task: TaskItem,
  todoId: string,
  newTitle: string,
  nowIso = new Date().toISOString()
): TaskItem {
  const trimmed = newTitle.trim();
  if (!trimmed) return task;
  return {
    ...task,
    todos: task.todos.map((item) =>
      item.id === todoId
        ? { ...item, title: trimmed, localizedTitle: undefined }
        : item
    ),
    updatedAt: nowIso,
  };
}

/**
 * Toggles a specific to-do item's completion state within a task.
 * If the to-do has sub-todos, toggling it also sets all its sub-todos to the same state.
 */
export function toggleTodoInTask(
  task: TaskItem,
  todoId: string,
  nowIso = new Date().toISOString()
): TaskItem {
  const updatedTodos = task.todos.map((item) => {
    if (item.id !== todoId) return item;
    const nextCompleted = !item.completed;
    const nextSubTodos = item.subTodos
      ? item.subTodos.map((s) => ({ ...s, completed: nextCompleted }))
      : undefined;
    return { ...item, completed: nextCompleted, subTodos: nextSubTodos };
  });
  const nextProgress = calculateTaskProgress({
    todos: updatedTodos,
    manualProgress: task.manualProgress,
    status: task.status,
  });
  return {
    ...task,
    todos: updatedTodos,
    status: deriveTaskStatus(task.status, nextProgress),
    updatedAt: nowIso,
  };
}

/**
 * Adds a sub-todo item into an existing To-Do item.
 */
export function addSubTodoToTask(
  task: TaskItem,
  todoId: string,
  title: string,
  nowIso = new Date().toISOString()
): TaskItem {
  const trimmed = title.trim();
  if (!trimmed) return task;
  const newSubTodo: SubTodoItem = {
    id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    todoId,
    title: trimmed,
    completed: false,
    createdAt: nowIso,
  };

  const updatedTodos = task.todos.map((td) => {
    if (td.id !== todoId) return td;
    const existingSubs = td.subTodos || [];
    const nextSubs = [...existingSubs, newSubTodo];
    // If to-do was marked completed, adding an unchecked sub-todo makes it in-progress
    return {
      ...td,
      completed: false,
      subTodos: nextSubs,
    };
  });

  const nextProgress = calculateTaskProgress({
    todos: updatedTodos,
    manualProgress: task.manualProgress,
    status: task.status,
  });

  return {
    ...task,
    todos: updatedTodos,
    status: deriveTaskStatus(task.status, nextProgress),
    updatedAt: nowIso,
  };
}

/**
 * Toggles completion of a sub-todo within a To-Do item.
 * Automatically marks parent to-do completed if all sub-todos become completed.
 */
export function toggleSubTodoInTask(
  task: TaskItem,
  todoId: string,
  subTodoId: string,
  nowIso = new Date().toISOString()
): TaskItem {
  const updatedTodos = task.todos.map((td) => {
    if (td.id !== todoId) return td;
    const currentSubs = td.subTodos || [];
    const nextSubs = currentSubs.map((s) =>
      s.id === subTodoId ? { ...s, completed: !s.completed } : s
    );
    const allDone = nextSubs.length > 0 && nextSubs.every((s) => s.completed);
    return {
      ...td,
      completed: allDone,
      subTodos: nextSubs,
    };
  });

  const nextProgress = calculateTaskProgress({
    todos: updatedTodos,
    manualProgress: task.manualProgress,
    status: task.status,
  });

  return {
    ...task,
    todos: updatedTodos,
    status: deriveTaskStatus(task.status, nextProgress),
    updatedAt: nowIso,
  };
}

/**
 * Edits the title of an existing sub-todo.
 */
export function editSubTodoInTask(
  task: TaskItem,
  todoId: string,
  subTodoId: string,
  newTitle: string,
  nowIso = new Date().toISOString()
): TaskItem {
  const trimmed = newTitle.trim();
  if (!trimmed) return task;
  return {
    ...task,
    todos: task.todos.map((td) => {
      if (td.id !== todoId) return td;
      return {
        ...td,
        subTodos: (td.subTodos || []).map((s) =>
          s.id === subTodoId
            ? { ...s, title: trimmed, localizedTitle: undefined }
            : s
        ),
      };
    }),
    updatedAt: nowIso,
  };
}

/**
 * Removes a sub-todo from a To-Do item.
 */
export function removeSubTodoFromTask(
  task: TaskItem,
  todoId: string,
  subTodoId: string,
  nowIso = new Date().toISOString()
): TaskItem {
  const updatedTodos = task.todos.map((td) => {
    if (td.id !== todoId) return td;
    const nextSubs = (td.subTodos || []).filter((s) => s.id !== subTodoId);
    const allDone = nextSubs.length > 0 ? nextSubs.every((s) => s.completed) : td.completed;
    return {
      ...td,
      completed: allDone,
      subTodos: nextSubs,
    };
  });

  const nextProgress = calculateTaskProgress({
    todos: updatedTodos,
    manualProgress: task.manualProgress,
    status: task.status,
  });

  return {
    ...task,
    todos: updatedTodos,
    status: deriveTaskStatus(task.status, nextProgress),
    updatedAt: nowIso,
  };
}

/**
 * Removes a specific to-do item from a task.
 */
export function removeTodoFromTask(
  task: TaskItem,
  todoId: string,
  nowIso = new Date().toISOString()
): TaskItem {
  const updatedTodos = task.todos.filter((item) => item.id !== todoId);
  const nextProgress = calculateTaskProgress({
    todos: updatedTodos,
    manualProgress: task.manualProgress,
    status: task.status,
  });
  return {
    ...task,
    todos: updatedTodos,
    status: deriveTaskStatus(task.status, nextProgress),
    updatedAt: nowIso,
  };
}

/**
 * Adds a timestamped progress update to a task (with optional attached photos).
 */
export function addUpdateToTask(
  task: TaskItem,
  input: {
    content: string;
    timestamp: string;
    author?: string;
    milestoneTag?: string;
    photos?: Omit<TaskAttachment, 'id' | 'addedAt'>[];
  },
  nowIso = new Date().toISOString()
): TaskItem {
  const trimmed = input.content.trim();
  if (!trimmed) return task;
  const attachedPhotos: TaskAttachment[] | undefined = input.photos
    ? input.photos.map((p, idx) => ({
        ...p,
        type: 'photo',
        id: `upd-photo-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        addedAt: nowIso,
      }))
    : undefined;

  const newUpdate: TaskUpdateLog = {
    id: `upd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    content: trimmed,
    timestamp: input.timestamp || nowIso,
    author: input.author?.trim() || 'Saleh Hmdan',
    milestoneTag: input.milestoneTag?.trim() || undefined,
    photos: attachedPhotos && attachedPhotos.length > 0 ? attachedPhotos : undefined,
  };
  const updatedLogs = [newUpdate, ...task.updates].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  return {
    ...task,
    updates: updatedLogs,
    updatedAt: nowIso,
  };
}

/**
 * Attaches a photo to an existing Task Update log entry.
 */
export function addPhotoToUpdateInTask(
  task: TaskItem,
  updateId: string,
  photo: Omit<TaskAttachment, 'id' | 'addedAt'>,
  nowIso = new Date().toISOString()
): TaskItem {
  const newPhoto: TaskAttachment = {
    ...photo,
    type: 'photo',
    id: `upd-photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    addedAt: nowIso,
  };
  return {
    ...task,
    updates: task.updates.map((upd) =>
      upd.id === updateId
        ? { ...upd, photos: [...(upd.photos || []), newPhoto] }
        : upd
    ),
    updatedAt: nowIso,
  };
}

/**
 * Removes a photo from a specific Task Update log entry.
 */
export function removePhotoFromUpdateInTask(
  task: TaskItem,
  updateId: string,
  photoId: string,
  nowIso = new Date().toISOString()
): TaskItem {
  return {
    ...task,
    updates: task.updates.map((upd) =>
      upd.id === updateId
        ? { ...upd, photos: (upd.photos || []).filter((p) => p.id !== photoId) }
        : upd
    ),
    updatedAt: nowIso,
  };
}

/**
 * Edits an existing timestamped update in a task.
 */
export function editUpdateInTask(
  task: TaskItem,
  updateId: string,
  patch: { content: string; timestamp?: string; author?: string },
  nowIso = new Date().toISOString()
): TaskItem {
  const trimmed = patch.content.trim();
  if (!trimmed) return task;
  const updatedLogs = task.updates
    .map((u) =>
      u.id === updateId
        ? {
            ...u,
            content: trimmed,
            localizedContent: undefined,
            timestamp: patch.timestamp || u.timestamp,
            author: patch.author?.trim() || u.author,
          }
        : u
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    ...task,
    updates: updatedLogs,
    updatedAt: nowIso,
  };
}

/**
 * Attaches a photo or file to a task.
 */
export function addAttachmentToTask(
  task: TaskItem,
  attachment: Omit<TaskAttachment, 'id' | 'addedAt'>,
  nowIso = new Date().toISOString()
): TaskItem {
  const newAttachment: TaskAttachment = {
    ...attachment,
    id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    addedAt: nowIso,
  };
  return {
    ...task,
    attachments: [newAttachment, ...task.attachments],
    updatedAt: nowIso,
  };
}

/**
 * Edits an existing attachment's name or caption.
 */
export function editAttachmentInTask(
  task: TaskItem,
  attachmentId: string,
  patch: { name?: string; caption?: string },
  nowIso = new Date().toISOString()
): TaskItem {
  return {
    ...task,
    attachments: task.attachments.map((att) =>
      att.id === attachmentId
        ? {
            ...att,
            name: patch.name?.trim() || att.name,
            caption: patch.caption !== undefined ? patch.caption.trim() : att.caption,
            localizedCaption: patch.caption !== undefined ? undefined : att.localizedCaption,
          }
        : att
    ),
    updatedAt: nowIso,
  };
}

/**
 * Updates a photo's image URL and annotation metadata across any section of a task
 * ('todo' checklist item, 'update' log entry, or 'attachment' gallery).
 */
export function annotatePhotoInTask(
  task: TaskItem,
  target: PhotoTargetRef,
  annotatedDataUrl: string,
  caption?: string,
  nowIso = new Date().toISOString()
): TaskItem {
  const updatePhotoItem = (p: TaskAttachment): TaskAttachment => {
    if (p.id !== target.photoId) return p;
    const nextCaption = caption !== undefined ? caption.trim() : p.caption;
    return {
      ...p,
      url: annotatedDataUrl,
      annotatedAt: nowIso,
      caption: nextCaption,
      localizedCaption: caption !== undefined ? undefined : p.localizedCaption,
    };
  };

  if (target.section === 'todo') {
    return {
      ...task,
      todos: task.todos.map((td) =>
        !target.parentId || td.id === target.parentId
          ? { ...td, photos: (td.photos || []).map(updatePhotoItem) }
          : td
      ),
      updatedAt: nowIso,
    };
  }

  if (target.section === 'update') {
    return {
      ...task,
      updates: task.updates.map((upd) =>
        !target.parentId || upd.id === target.parentId
          ? { ...upd, photos: (upd.photos || []).map(updatePhotoItem) }
          : upd
      ),
      updatedAt: nowIso,
    };
  }

  return {
    ...task,
    attachments: task.attachments.map(updatePhotoItem),
    updatedAt: nowIso,
  };
}

/**
 * Counts all photos attached to a task across To-Do items, Updates, and Attachments.
 */
export function countAllPhotosInTask(task: TaskItem): number {
  const attPhotos = task.attachments.filter((a) => a.type === 'photo').length;
  const todoPhotos = task.todos.reduce((acc, td) => acc + (td.photos?.length || 0), 0);
  const updatePhotos = task.updates.reduce((acc, u) => acc + (u.photos?.length || 0), 0);
  return attPhotos + todoPhotos + updatePhotos;
}

/**
 * Computes comprehensive project completion metrics for the Dashboard.
 */
export function computeProjectMetrics(
  tasks: TaskItem[],
  referenceDateStr = '2026-11-10'
): ProjectMetrics {
  const totalTasks = tasks.length;
  let completedTasks = 0;
  let inProgressTasks = 0;
  let todoTasks = 0;
  let overdueTasks = 0;
  let sumTaskProgress = 0;
  let totalSubtasks = 0;
  let completedSubtasks = 0;
  let totalUpdates = 0;
  let totalAttachments = 0;
  let totalPhotos = 0;
  let totalFiles = 0;

  const projectMap = new Map<
    string,
    {
      projectId?: string;
      taskCount: number;
      completedCount: number;
      progressSum: number;
      subtasksDone: number;
      subtasksTotal: number;
    }
  >();

  const priorityAccum: Record<TaskPriority, { total: number; progressSum: number }> = {
    low: { total: 0, progressSum: 0 },
    medium: { total: 0, progressSum: 0 },
    high: { total: 0, progressSum: 0 },
    critical: { total: 0, progressSum: 0 },
  };

  for (const task of tasks) {
    const progress = calculateTaskProgress(task);
    sumTaskProgress += progress;

    if (progress === 100 || task.status === 'completed') {
      completedTasks += 1;
    } else if (progress > 0 || task.status === 'in_progress' || task.status === 'review') {
      inProgressTasks += 1;
    } else {
      todoTasks += 1;
    }

    if (progress < 100 && task.dueDate && task.dueDate < referenceDateStr) {
      overdueTasks += 1;
    }

    const todoCounts = getTaskTodoCounts(task.todos);
    const doneTodos = todoCounts.completed;
    const taskSubtasksTotal = todoCounts.total;
    const taskPhotoCount = countAllPhotosInTask(task);
    const taskFileCount = task.attachments.filter((a) => a.type === 'file').length;
    totalSubtasks += taskSubtasksTotal;
    completedSubtasks += doneTodos;
    totalUpdates += task.updates.length;
    totalAttachments += taskPhotoCount + taskFileCount;
    totalPhotos += taskPhotoCount;
    totalFiles += taskFileCount;

    const projEntry = projectMap.get(task.project) || {
      projectId: task.projectId,
      taskCount: 0,
      completedCount: 0,
      progressSum: 0,
      subtasksDone: 0,
      subtasksTotal: 0,
    };
    projEntry.taskCount += 1;
    if (progress === 100 || task.status === 'completed') {
      projEntry.completedCount += 1;
    }
    projEntry.progressSum += progress;
    projEntry.subtasksDone += doneTodos;
    projEntry.subtasksTotal += taskSubtasksTotal;
    projectMap.set(task.project, projEntry);

    priorityAccum[task.priority].total += 1;
    priorityAccum[task.priority].progressSum += progress;
  }

  const overallProgressPercent =
    totalTasks > 0 ? Math.round(sumTaskProgress / totalTasks) : 0;
  const subtaskCompletionPercent =
    totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const projectBreakdown = Array.from(projectMap.entries())
    .map(([project, stats]) => ({
      projectId: stats.projectId,
      project,
      taskCount: stats.taskCount,
      completedCount: stats.completedCount,
      averageProgress:
        stats.taskCount > 0 ? Math.round(stats.progressSum / stats.taskCount) : 0,
      subtasksDone: stats.subtasksDone,
      subtasksTotal: stats.subtasksTotal,
    }))
    .sort((a, b) => b.averageProgress - a.averageProgress);

  const priorityBreakdown: Record<TaskPriority, { total: number; avgProgress: number }> = {
    critical: {
      total: priorityAccum.critical.total,
      avgProgress:
        priorityAccum.critical.total > 0
          ? Math.round(priorityAccum.critical.progressSum / priorityAccum.critical.total)
          : 0,
    },
    high: {
      total: priorityAccum.high.total,
      avgProgress:
        priorityAccum.high.total > 0
          ? Math.round(priorityAccum.high.progressSum / priorityAccum.high.total)
          : 0,
    },
    medium: {
      total: priorityAccum.medium.total,
      avgProgress:
        priorityAccum.medium.total > 0
          ? Math.round(priorityAccum.medium.progressSum / priorityAccum.medium.total)
          : 0,
    },
    low: {
      total: priorityAccum.low.total,
      avgProgress:
        priorityAccum.low.total > 0
          ? Math.round(priorityAccum.low.progressSum / priorityAccum.low.total)
          : 0,
    },
  };

  return {
    totalTasks,
    completedTasks,
    inProgressTasks,
    todoTasks,
    overdueTasks,
    overallProgressPercent,
    totalSubtasks,
    completedSubtasks,
    subtaskCompletionPercent,
    totalUpdates,
    totalAttachments,
    totalPhotos,
    totalFiles,
    projectBreakdown,
    priorityBreakdown,
  };
}

/**
 * Formats byte count into readable tabular file size string (e.g. "1.4 MB", "420 KB").
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

/**
 * Formats an ISO or datetime-local string into a crisp date + time display.
 */
export function formatDateTimeStamp(isoOrLocal: string): string {
  if (!isoOrLocal) return 'Unknown date';
  const date = new Date(isoOrLocal);
  if (Number.isNaN(date.getTime())) return isoOrLocal;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} · ${hh}:${min}`;
}

/**
 * ============================================================================
 * TRASH / RECYCLE BIN PURE LOGIC HELPERS
 * ============================================================================
 */

export function moveFolderToTrash(
  state: WorkspaceState,
  folderId: string,
  nowIso = new Date().toISOString()
): WorkspaceState {
  const folder = state.folders.find((f) => f.id === folderId);
  if (!folder) return state;

  const childProjects = state.projects.filter((p) => p.folderId === folderId);
  const childProjectIds = new Set(childProjects.map((p) => p.id));
  const childTasks = state.tasks.filter(
    (t) => t.folderId === folderId || (t.projectId && childProjectIds.has(t.projectId))
  );

  const trashItem: TrashItem = {
    id: `trash-fld-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    itemType: 'folder',
    title: folder.name,
    subtitle: `${childProjects.length} projects · ${childTasks.length} tasks`,
    deletedAt: nowIso,
    folder,
    childProjects,
    childTasks,
  };

  const nextState = removeFolder(state, folderId);
  return {
    ...nextState,
    trash: [trashItem, ...(state.trash || [])],
  };
}

export function moveProjectToTrash(
  state: WorkspaceState,
  projectId: string,
  nowIso = new Date().toISOString()
): WorkspaceState {
  const project = state.projects.find((p) => p.id === projectId);
  if (!project) return state;

  const childTasks = state.tasks.filter((t) => t.projectId === projectId);
  const trashItem: TrashItem = {
    id: `trash-prj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    itemType: 'project',
    title: project.name,
    subtitle: `${childTasks.length} tasks`,
    deletedAt: nowIso,
    project,
    childTasks,
  };

  const nextState = removeProject(state, projectId);
  return {
    ...nextState,
    trash: [trashItem, ...(state.trash || [])],
  };
}

export function moveTaskToTrash(
  state: WorkspaceState,
  taskId: string,
  nowIso = new Date().toISOString()
): WorkspaceState {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return state;

  const trashItem: TrashItem = {
    id: `trash-tsk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    itemType: 'task',
    title: task.title,
    subtitle: task.project,
    deletedAt: nowIso,
    task,
  };

  return {
    ...state,
    tasks: state.tasks.filter((t) => t.id !== taskId),
    trash: [trashItem, ...(state.trash || [])],
  };
}

export function moveTodoToTrash(
  state: WorkspaceState,
  taskId: string,
  todoId: string,
  nowIso = new Date().toISOString()
): WorkspaceState {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return state;
  const todo = task.todos.find((td) => td.id === todoId);
  if (!todo) return state;

  const trashItem: TrashItem = {
    id: `trash-todo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    itemType: 'todo',
    title: todo.title,
    subtitle: task.title,
    deletedAt: nowIso,
    todo,
    parentTaskId: taskId,
  };

  return {
    ...state,
    tasks: state.tasks.map((t) =>
      t.id === taskId ? removeTodoFromTask(t, todoId, nowIso) : t
    ),
    trash: [trashItem, ...(state.trash || [])],
  };
}

export function moveSubTodoToTrash(
  state: WorkspaceState,
  taskId: string,
  todoId: string,
  subTodoId: string,
  nowIso = new Date().toISOString()
): WorkspaceState {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return state;
  const todo = task.todos.find((td) => td.id === todoId);
  const subTodo = todo?.subTodos?.find((s) => s.id === subTodoId);
  if (!todo || !subTodo) return state;

  const trashItem: TrashItem = {
    id: `trash-sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    itemType: 'subtodo',
    title: subTodo.title,
    subtitle: `${task.title} › ${todo.title}`,
    deletedAt: nowIso,
    subTodo,
    parentTaskId: taskId,
    parentTodoId: todoId,
  };

  return {
    ...state,
    tasks: state.tasks.map((t) =>
      t.id === taskId ? removeSubTodoFromTask(t, todoId, subTodoId, nowIso) : t
    ),
    trash: [trashItem, ...(state.trash || [])],
  };
}

export function moveUpdateToTrash(
  state: WorkspaceState,
  taskId: string,
  updateId: string,
  nowIso = new Date().toISOString()
): WorkspaceState {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return state;
  const update = task.updates.find((u) => u.id === updateId);
  if (!update) return state;

  const trashItem: TrashItem = {
    id: `trash-upd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    itemType: 'update',
    title: update.content,
    subtitle: `${task.title} · ${update.timestamp}`,
    deletedAt: nowIso,
    update,
    parentTaskId: taskId,
  };

  return {
    ...state,
    tasks: state.tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            updates: t.updates.filter((u) => u.id !== updateId),
            updatedAt: nowIso,
          }
        : t
    ),
    trash: [trashItem, ...(state.trash || [])],
  };
}

export function moveAttachmentToTrash(
  state: WorkspaceState,
  taskId: string,
  section: 'attachment' | 'todo' | 'update',
  attachmentId: string,
  parentId?: string,
  nowIso = new Date().toISOString()
): WorkspaceState {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return state;

  let foundAttachment: TaskAttachment | undefined;
  if (section === 'attachment') {
    foundAttachment = task.attachments.find((a) => a.id === attachmentId);
  } else if (section === 'todo' && parentId) {
    const todo = task.todos.find((td) => td.id === parentId);
    foundAttachment = todo?.photos?.find((p) => p.id === attachmentId);
  } else if (section === 'update' && parentId) {
    const upd = task.updates.find((u) => u.id === parentId);
    foundAttachment = upd?.photos?.find((p) => p.id === attachmentId);
  }

  if (!foundAttachment) return state;

  const trashItem: TrashItem = {
    id: `trash-att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    itemType: 'attachment',
    title: foundAttachment.name,
    subtitle: task.title,
    deletedAt: nowIso,
    attachment: foundAttachment,
    parentTaskId: taskId,
    parentTodoId: section === 'todo' ? parentId : undefined,
    parentUpdateId: section === 'update' ? parentId : undefined,
    attachmentSection: section,
  };

  return {
    ...state,
    tasks: state.tasks.map((t) => {
      if (t.id !== taskId) return t;
      if (section === 'todo' && parentId) {
        return removePhotoFromTodoInTask(t, parentId, attachmentId, nowIso);
      }
      if (section === 'update' && parentId) {
        return removePhotoFromUpdateInTask(t, parentId, attachmentId, nowIso);
      }
      return {
        ...t,
        attachments: t.attachments.filter((a) => a.id !== attachmentId),
        updatedAt: nowIso,
      };
    }),
    trash: [trashItem, ...(state.trash || [])],
  };
}

export function restoreTrashItem(
  state: WorkspaceState,
  trashId: string,
  nowIso = new Date().toISOString()
): WorkspaceState {
  const trashList = state.trash || [];
  const item = trashList.find((tr) => tr.id === trashId);
  if (!item) return state;

  const remainingTrash = trashList.filter((tr) => tr.id !== trashId);

  if (item.itemType === 'folder' && item.folder) {
    const existingFolderIds = new Set(state.folders.map((f) => f.id));
    const existingProjectIds = new Set(state.projects.map((p) => p.id));
    const existingTaskIds = new Set(state.tasks.map((t) => t.id));

    return {
      ...state,
      folders: existingFolderIds.has(item.folder.id)
        ? state.folders
        : [...state.folders, item.folder],
      projects: [
        ...state.projects,
        ...(item.childProjects || []).filter((p) => !existingProjectIds.has(p.id)),
      ],
      tasks: [
        ...state.tasks,
        ...(item.childTasks || []).filter((t) => !existingTaskIds.has(t.id)),
      ],
      trash: remainingTrash,
    };
  }

  if (item.itemType === 'project' && item.project) {
    const existingProjectIds = new Set(state.projects.map((p) => p.id));
    const existingTaskIds = new Set(state.tasks.map((t) => t.id));
    // Ensure parent folder exists, or attach to first folder
    const folderExists = state.folders.some((f) => f.id === item.project!.folderId);
    const restoredProject: ProjectGroupItem = folderExists
      ? item.project
      : {
          ...item.project,
          folderId: state.folders[0]?.id || item.project.folderId,
        };

    return {
      ...state,
      projects: existingProjectIds.has(restoredProject.id)
        ? state.projects
        : [...state.projects, restoredProject],
      tasks: [
        ...state.tasks,
        ...(item.childTasks || []).filter((t) => !existingTaskIds.has(t.id)),
      ],
      trash: remainingTrash,
    };
  }

  if (item.itemType === 'task' && item.task) {
    const existingTaskIds = new Set(state.tasks.map((t) => t.id));
    return {
      ...state,
      tasks: existingTaskIds.has(item.task.id)
        ? state.tasks
        : [{ ...item.task, updatedAt: nowIso }, ...state.tasks],
      trash: remainingTrash,
    };
  }

  if (item.itemType === 'todo' && item.todo && item.parentTaskId) {
    return {
      ...state,
      tasks: state.tasks.map((t) => {
        if (t.id !== item.parentTaskId) return t;
        const nextTodos = [...t.todos, item.todo!];
        const nextProg = calculateTaskProgress({
          todos: nextTodos,
          manualProgress: t.manualProgress,
          status: t.status,
        });
        return {
          ...t,
          todos: nextTodos,
          status: deriveTaskStatus(t.status, nextProg),
          updatedAt: nowIso,
        };
      }),
      trash: remainingTrash,
    };
  }

  if (item.itemType === 'subtodo' && item.subTodo && item.parentTaskId && item.parentTodoId) {
    return {
      ...state,
      tasks: state.tasks.map((t) => {
        if (t.id !== item.parentTaskId) return t;
        const nextTodos = t.todos.map((td) => {
          if (td.id !== item.parentTodoId) return td;
          const nextSubs = [...(td.subTodos || []), item.subTodo!];
          const allDone = nextSubs.every((s) => s.completed);
          return { ...td, completed: allDone, subTodos: nextSubs };
        });
        const nextProg = calculateTaskProgress({
          todos: nextTodos,
          manualProgress: t.manualProgress,
          status: t.status,
        });
        return {
          ...t,
          todos: nextTodos,
          status: deriveTaskStatus(t.status, nextProg),
          updatedAt: nowIso,
        };
      }),
      trash: remainingTrash,
    };
  }

  if (item.itemType === 'update' && item.update && item.parentTaskId) {
    return {
      ...state,
      tasks: state.tasks.map((t) => {
        if (t.id !== item.parentTaskId) return t;
        const nextUpdates = [item.update!, ...t.updates].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        return { ...t, updates: nextUpdates, updatedAt: nowIso };
      }),
      trash: remainingTrash,
    };
  }

  if (item.itemType === 'attachment' && item.attachment && item.parentTaskId) {
    return {
      ...state,
      tasks: state.tasks.map((t) => {
        if (t.id !== item.parentTaskId) return t;
        if (item.attachmentSection === 'todo' && item.parentTodoId) {
          return {
            ...t,
            todos: t.todos.map((td) =>
              td.id === item.parentTodoId
                ? { ...td, photos: [...(td.photos || []), item.attachment!] }
                : td
            ),
            updatedAt: nowIso,
          };
        }
        if (item.attachmentSection === 'update' && item.parentUpdateId) {
          return {
            ...t,
            updates: t.updates.map((u) =>
              u.id === item.parentUpdateId
                ? { ...u, photos: [...(u.photos || []), item.attachment!] }
                : u
            ),
            updatedAt: nowIso,
          };
        }
        return {
          ...t,
          attachments: [item.attachment!, ...t.attachments],
          updatedAt: nowIso,
        };
      }),
      trash: remainingTrash,
    };
  }

  return {
    ...state,
    trash: remainingTrash,
  };
}

export function deleteTrashItemPermanently(
  state: WorkspaceState,
  trashId: string
): WorkspaceState {
  return {
    ...state,
    trash: (state.trash || []).filter((tr) => tr.id !== trashId),
  };
}

export function emptyTrash(state: WorkspaceState): WorkspaceState {
  return {
    ...state,
    trash: [],
  };
}

/**
 * ============================================================================
 * NOTIFICATION & DUE-DATE / TIME REMINDER PURE LOGIC HELPERS
 * ============================================================================
 */

export function appendNotification(
  state: WorkspaceState,
  input: {
    category: NotificationCategory;
    section: NotificationSection;
    title: string;
    message: string;
    targetNode?: SelectedSidebarNode;
    dedupeKey?: string;
  },
  nowIso = new Date().toISOString()
): WorkspaceState {
  const existing = state.notifications || [];
  if (input.dedupeKey && existing.some((n) => n.dedupeKey === input.dedupeKey)) {
    return state;
  }

  const newNotif: AppNotification = {
    id: `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    category: input.category,
    section: input.section,
    title: input.title,
    message: input.message,
    timestamp: nowIso,
    read: false,
    targetNode: input.targetNode,
    dedupeKey: input.dedupeKey,
  };

  return {
    ...state,
    notifications: [newNotif, ...existing].slice(0, 150),
  };
}

export function markNotificationRead(
  state: WorkspaceState,
  notificationId: string
): WorkspaceState {
  return {
    ...state,
    notifications: (state.notifications || []).map((n) =>
      n.id === notificationId ? { ...n, read: true } : n
    ),
  };
}

export function markAllNotificationsRead(state: WorkspaceState): WorkspaceState {
  return {
    ...state,
    notifications: (state.notifications || []).map((n) => ({ ...n, read: true })),
  };
}

export function clearAllNotifications(state: WorkspaceState): WorkspaceState {
  return {
    ...state,
    notifications: [],
  };
}

/**
 * Scans all active tasks for due dates and due times and generates deduplicated
 * reminder notifications for overdue tasks, tasks due today, or tasks due tomorrow.
 */
export function generateDueTaskReminders(
  state: WorkspaceState,
  nowDate = new Date(),
  labels?: {
    overdueTitle: string;
    dueTodayTitle: string;
    dueTomorrowTitle: string;
  }
): WorkspaceState {
  const yyyy = nowDate.getFullYear();
  const mm = String(nowDate.getMonth() + 1).padStart(2, '0');
  const dd = String(nowDate.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const tomorrow = new Date(nowDate.getTime() + 24 * 60 * 60 * 1000);
  const tomY = tomorrow.getFullYear();
  const tomM = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const tomD = String(tomorrow.getDate()).padStart(2, '0');
  const tomorrowStr = `${tomY}-${tomM}-${tomD}`;

  const nowHH = String(nowDate.getHours()).padStart(2, '0');
  const nowMin = String(nowDate.getMinutes()).padStart(2, '0');
  const currentHHMM = `${nowHH}:${nowMin}`;
  const nowIso = nowDate.toISOString();

  let nextState = state;

  for (const task of state.tasks) {
    const prog = calculateTaskProgress(task);
    if (prog === 100 || task.status === 'completed' || !task.dueDate) {
      continue;
    }

    const timeSuffix = task.dueTime ? ` (${task.dueTime})` : '';

    // 1. Overdue by date, or due today with a dueTime that has passed
    const isOverdueByDate = task.dueDate < todayStr;
    const isOverdueByTime =
      task.dueDate === todayStr && Boolean(task.dueTime && task.dueTime <= currentHHMM);

    if (isOverdueByDate || isOverdueByTime) {
      const dedupeKey = `reminder-overdue-${task.id}-${task.dueDate}-${task.dueTime || ''}`;
      nextState = appendNotification(
        nextState,
        {
          category: 'reminder',
          section: 'task',
          title: labels?.overdueTitle || 'Overdue Task Reminder',
          message: `${task.title} — ${task.dueDate}${timeSuffix}`,
          targetNode: { type: 'task', id: task.id },
          dedupeKey,
        },
        nowIso
      );
    } else if (task.dueDate === todayStr) {
      const dedupeKey = `reminder-today-${task.id}-${task.dueDate}-${task.dueTime || ''}`;
      nextState = appendNotification(
        nextState,
        {
          category: 'reminder',
          section: 'task',
          title: labels?.dueTodayTitle || 'Task Due Today',
          message: `${task.title} — ${task.dueDate}${timeSuffix}`,
          targetNode: { type: 'task', id: task.id },
          dedupeKey,
        },
        nowIso
      );
    } else if (task.dueDate === tomorrowStr) {
      const dedupeKey = `reminder-tomorrow-${task.id}-${task.dueDate}`;
      nextState = appendNotification(
        nextState,
        {
          category: 'reminder',
          section: 'task',
          title: labels?.dueTomorrowTitle || 'Task Due Tomorrow',
          message: `${task.title} — ${task.dueDate}${timeSuffix}`,
          targetNode: { type: 'task', id: task.id },
          dedupeKey,
        },
        nowIso
      );
    }
  }

  return nextState;
}

export type FilePreviewKind = 'pdf' | 'text' | 'image' | 'audio' | 'video' | 'other';

/**
 * Determines the in-app preview mode for an uploaded attachment based on MIME type and filename extension.
 */
export function resolveFilePreviewKind(file: {
  name: string;
  mimeType?: string;
  url?: string;
}): FilePreviewKind {
  const mime = (file.mimeType || '').toLowerCase().trim();
  const ext = (file.name.split('.').pop() || '').toLowerCase().trim();
  const url = (file.url || '').toLowerCase().trim();

  if (
    mime === 'application/pdf' ||
    ext === 'pdf' ||
    url.startsWith('data:application/pdf')
  ) {
    return 'pdf';
  }

  if (
    mime.startsWith('image/') ||
    ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif'].includes(ext) ||
    url.startsWith('data:image/')
  ) {
    return 'image';
  }

  if (
    mime.startsWith('audio/') ||
    ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext) ||
    url.startsWith('data:audio/')
  ) {
    return 'audio';
  }

  if (
    mime.startsWith('video/') ||
    ['mp4', 'webm', 'mov', 'ogv', 'm4v'].includes(ext) ||
    url.startsWith('data:video/')
  ) {
    return 'video';
  }

  if (
    mime.startsWith('text/') ||
    [
      'application/json',
      'application/xml',
      'application/javascript',
      'application/typescript',
      'application/x-yaml',
      'application/csv',
    ].includes(mime) ||
    [
      'txt',
      'md',
      'markdown',
      'csv',
      'tsv',
      'json',
      'xml',
      'html',
      'htm',
      'css',
      'js',
      'ts',
      'jsx',
      'tsx',
      'yml',
      'yaml',
      'log',
      'ini',
      'conf',
      'env',
      'sql',
      'py',
      'sh',
    ].includes(ext) ||
    url.startsWith('data:text/') ||
    url.startsWith('data:application/json')
  ) {
    return 'text';
  }

  return 'other';
}

/**
 * Decodes a data: URL (base64 or URL-encoded) into a UTF-8 text preview string for text/code/CSV/JSON files.
 */
export function decodeDataUrlTextPreview(url: string, maxChars = 50000): string | null {
  if (!url || !url.startsWith('data:')) return null;
  const commaIdx = url.indexOf(',');
  if (commaIdx === -1) return null;

  const header = url.slice(0, commaIdx).toLowerCase();
  const body = url.slice(commaIdx + 1);

  try {
    let decoded = '';
    if (header.includes(';base64')) {
      if (typeof atob === 'function') {
        const binary = atob(body);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      } else if (typeof Buffer !== 'undefined') {
        decoded = Buffer.from(body, 'base64').toString('utf-8');
      }
    } else {
      decoded = decodeURIComponent(body);
    }

    if (decoded.length > maxChars) {
      return `${decoded.slice(0, maxChars)}\n\n... [Truncated at ${maxChars} characters]`;
    }
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Moves a single task from its current project/group to `targetProjectId`,
 * automatically updating `projectId`, `folderId`, denormalized `project` name, and `updatedAt`.
 */
export function moveTaskToGroup(
  state: WorkspaceState,
  taskId: string,
  targetProjectId: string,
  nowIso = new Date().toISOString()
): WorkspaceState {
  const targetProject = state.projects.find((p) => p.id === targetProjectId);
  const existingTask = state.tasks.find((t) => t.id === taskId);
  if (!targetProject || !existingTask) return state;
  if (
    existingTask.projectId === targetProject.id &&
    existingTask.folderId === targetProject.folderId
  ) {
    return state;
  }

  return {
    ...state,
    tasks: state.tasks.map((tsk) =>
      tsk.id === taskId
        ? {
            ...tsk,
            folderId: targetProject.folderId,
            projectId: targetProject.id,
            project: targetProject.name,
            updatedAt: nowIso,
          }
        : tsk
    ),
  };
}

/**
 * Moves a project/group from its current folder to `targetFolderId` and
 * cascades the updated `folderId` to all child tasks belonging to that group.
 */
export function moveProjectToFolder(
  state: WorkspaceState,
  projectId: string,
  targetFolderId: string,
  nowIso = new Date().toISOString()
): WorkspaceState {
  const targetFolder = state.folders.find((f) => f.id === targetFolderId);
  const existingProject = state.projects.find((p) => p.id === projectId);
  if (!targetFolder || !existingProject) return state;
  if (existingProject.folderId === targetFolder.id) return state;

  return {
    ...state,
    projects: state.projects.map((proj) =>
      proj.id === projectId
        ? {
            ...proj,
            folderId: targetFolder.id,
          }
        : proj
    ),
    tasks: state.tasks.map((tsk) =>
      tsk.projectId === projectId
        ? {
            ...tsk,
            folderId: targetFolder.id,
            updatedAt: nowIso,
          }
        : tsk
    ),
  };
}

/**
 * ============================================================================
 * 1. CALENDAR & TIMELINE VIEW + DRAG-TO-RESCHEDULE HELPERS
 * ============================================================================
 */

export interface CalendarDayCell {
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  weekdayIndex: number;
}

function formatYmd(year: number, monthZeroIndexed: number, day: number): string {
  const d = new Date(Date.UTC(year, monthZeroIndexed, day));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Builds a 42-cell (6 weeks × 7 days, Sunday–Saturday) calendar grid for a given year & month (0-indexed).
 */
export function buildCalendarMonthDays(
  year: number,
  monthZeroIndexed: number
): CalendarDayCell[] {
  const firstOfMonth = new Date(Date.UTC(year, monthZeroIndexed, 1));
  const startWeekday = firstOfMonth.getUTCDay(); // 0 = Sun ... 6 = Sat
  const cells: CalendarDayCell[] = [];

  for (let i = 0; i < 42; i++) {
    const dayOffset = i - startWeekday + 1;
    const cellDate = new Date(Date.UTC(year, monthZeroIndexed, dayOffset));
    const cellYear = cellDate.getUTCFullYear();
    const cellMonth = cellDate.getUTCMonth();
    const cellDay = cellDate.getUTCDate();
    cells.push({
      dateStr: formatYmd(cellYear, cellMonth, cellDay),
      dayNumber: cellDay,
      isCurrentMonth: cellYear === year && cellMonth === monthZeroIndexed,
      weekdayIndex: cellDate.getUTCDay(),
    });
  }

  return cells;
}

/**
 * Builds a 7-cell (Sunday–Saturday) calendar week array containing `anchorDateStr` (YYYY-MM-DD).
 */
export function buildCalendarWeekDays(anchorDateStr: string): CalendarDayCell[] {
  const parts = anchorDateStr.split('-').map((n) => parseInt(n, 10));
  const year = parts[0] || 2026;
  const monthZero = (parts[1] || 1) - 1;
  const day = parts[2] || 1;

  const anchor = new Date(Date.UTC(year, monthZero, day));
  const weekday = anchor.getUTCDay();
  const cells: CalendarDayCell[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.UTC(year, monthZero, day - weekday + i));
    cells.push({
      dateStr: formatYmd(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
      dayNumber: d.getUTCDate(),
      isCurrentMonth: d.getUTCMonth() === monthZero,
      weekdayIndex: d.getUTCDay(),
    });
  }

  return cells;
}

/**
 * Updates a task's `dueDate` (and optionally `dueTime`) when dragged or clicked on the Calendar.
 */
export function rescheduleTaskDueDate(
  state: WorkspaceState,
  taskId: string,
  newDueDate: string,
  newDueTime?: string,
  nowIso = new Date().toISOString()
): WorkspaceState {
  const trimmedDate = newDueDate.trim();
  if (!trimmedDate) return state;
  const existing = state.tasks.find((t) => t.id === taskId);
  if (!existing) return state;

  return {
    ...state,
    tasks: state.tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            dueDate: trimmedDate,
            dueTime: newDueTime !== undefined ? newDueTime : t.dueTime,
            updatedAt: nowIso,
          }
        : t
    ),
  };
}

/**
 * ============================================================================
 * 2. RECURRING TASKS & REUSABLE TASK TEMPLATES HELPERS
 * ============================================================================
 */

function addMonthsClampedUtc(baseDate: Date, monthsToAdd: number): Date {
  const startYear = baseDate.getUTCFullYear();
  const startMonth = baseDate.getUTCMonth();
  const startDay = baseDate.getUTCDate();

  const totalMonths = startMonth + monthsToAdd;
  const targetYear = startYear + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;
  const maxDaysInTargetMonth = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0)
  ).getUTCDate();
  const clampedDay = Math.min(startDay, maxDaysInTargetMonth);
  return new Date(Date.UTC(targetYear, targetMonth, clampedDay));
}

/**
 * Computes the next YYYY-MM-DD due date based on `recurrence` rule
 * (`daily`, `weekly`, `monthly`, `yearly`, or `custom` in `days | weeks | months | years`).
 */
export function computeNextDueDate(
  currentDueDate: string,
  recurrence?: TaskRecurrenceRule
): string | null {
  if (!recurrence || recurrence.frequency === 'none') return null;

  const parts = (currentDueDate || '').split('-').map((n) => parseInt(n, 10));
  let baseDate =
    parts.length === 3 && !parts.some((n) => Number.isNaN(n))
      ? new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))
      : new Date();

  const freq: RecurrenceFrequency = recurrence.frequency;
  if (freq === 'daily') {
    baseDate.setUTCDate(baseDate.getUTCDate() + 1);
  } else if (freq === 'weekly') {
    baseDate.setUTCDate(baseDate.getUTCDate() + 7);
  } else if (freq === 'monthly') {
    baseDate = addMonthsClampedUtc(baseDate, 1);
  } else if (freq === 'yearly') {
    baseDate = addMonthsClampedUtc(baseDate, 12);
  } else if (freq === 'custom') {
    const count = Math.max(
      1,
      Math.round(recurrence.interval ?? recurrence.intervalDays ?? 1)
    );
    const unit: RecurrenceCustomUnit = recurrence.customUnit || 'days';
    if (unit === 'days') {
      baseDate.setUTCDate(baseDate.getUTCDate() + count);
    } else if (unit === 'weeks') {
      baseDate.setUTCDate(baseDate.getUTCDate() + count * 7);
    } else if (unit === 'months') {
      baseDate = addMonthsClampedUtc(baseDate, count);
    } else if (unit === 'years') {
      baseDate = addMonthsClampedUtc(baseDate, count * 12);
    }
  }

  return formatYmd(
    baseDate.getUTCFullYear(),
    baseDate.getUTCMonth(),
    baseDate.getUTCDate()
  );
}

/**
 * Formats a human-readable summary of a task's recurrence rule (localized when `t` is passed).
 */
export function formatRecurrenceSummary(
  recurrence?: TaskRecurrenceRule,
  t?: Pick<
    TranslationDictionary,
    | 'recurrenceNone'
    | 'recurrenceDaily'
    | 'recurrenceWeekly'
    | 'recurrenceMonthly'
    | 'recurrenceYearly'
    | 'recurrenceEveryPrefix'
    | 'recurrenceUnitDays'
    | 'recurrenceUnitWeeks'
    | 'recurrenceUnitMonths'
    | 'recurrenceUnitYears'
  >
): string {
  if (!recurrence || recurrence.frequency === 'none') {
    return t ? t.recurrenceNone : 'None';
  }
  if (recurrence.frequency === 'daily') {
    return t ? t.recurrenceDaily : 'Daily';
  }
  if (recurrence.frequency === 'weekly') {
    return t ? t.recurrenceWeekly : 'Weekly';
  }
  if (recurrence.frequency === 'monthly') {
    return t ? t.recurrenceMonthly : 'Monthly';
  }
  if (recurrence.frequency === 'yearly') {
    return t ? t.recurrenceYearly : 'Yearly';
  }
  const count = Math.max(
    1,
    Math.round(recurrence.interval ?? recurrence.intervalDays ?? 1)
  );
  const unit: RecurrenceCustomUnit = recurrence.customUnit || 'days';
  const prefix = t ? t.recurrenceEveryPrefix : 'Every';
  const unitLabel =
    unit === 'weeks'
      ? t
        ? t.recurrenceUnitWeeks
        : 'Weeks'
      : unit === 'months'
        ? t
          ? t.recurrenceUnitMonths
          : 'Months'
        : unit === 'years'
          ? t
            ? t.recurrenceUnitYears
            : 'Years'
          : t
            ? t.recurrenceUnitDays
            : 'Days';
  return `${prefix} ${count} ${unitLabel}`;
}

/**
 * Marks a task completed and, if it has an active recurrence rule (`daily`, `weekly`, `monthly`, `yearly`, `custom`),
 * automatically spawns the next occurrence with unchecked To-Dos and Sub-To-Dos.
 */
export function completeAndSpawnRecurringTask(
  state: WorkspaceState,
  taskId: string,
  nowIso = new Date().toISOString()
): { state: WorkspaceState; spawnedTask?: TaskItem } {
  const target = state.tasks.find((t) => t.id === taskId);
  if (!target) return { state };

  const completedTodos = target.todos.map((td) => ({
    ...td,
    completed: true,
    subTodos: td.subTodos
      ? td.subTodos.map((st) => ({ ...st, completed: true }))
      : undefined,
  }));

  const completedTask: TaskItem = {
    ...target,
    status: 'completed',
    manualProgress: 100,
    todos: completedTodos,
    updatedAt: nowIso,
  };

  let nextTasks = state.tasks.map((t) => (t.id === taskId ? completedTask : t));
  let spawnedTask: TaskItem | undefined;

  if (target.recurrence && target.recurrence.frequency !== 'none') {
    const nextDueDate = computeNextDueDate(
      target.dueDate || nowIso.slice(0, 10),
      target.recurrence
    );
    if (nextDueDate) {
      const duplicateExists = nextTasks.some(
        (t) =>
          t.id !== target.id &&
          t.title === target.title &&
          t.projectId === target.projectId &&
          t.dueDate === nextDueDate &&
          t.status !== 'completed'
      );

      if (!duplicateExists) {
        const freshTodos: TodoItem[] = target.todos.map((td, idx) => {
          const newTodoId = `todo-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`;
          return {
            id: newTodoId,
            title: td.title,
            localizedTitle: td.localizedTitle,
            completed: false,
            createdAt: nowIso,
            subTodos: td.subTodos
              ? td.subTodos.map((st, sIdx) => ({
                  id: `sub-${Date.now()}-${idx}-${sIdx}-${Math.random().toString(36).slice(2, 6)}`,
                  todoId: newTodoId,
                  title: st.title,
                  localizedTitle: st.localizedTitle,
                  completed: false,
                  createdAt: nowIso,
                }))
              : undefined,
          };
        });

        spawnedTask = {
          id: `tsk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          folderId: target.folderId,
          projectId: target.projectId,
          title: target.title,
          localizedTitle: target.localizedTitle,
          description: target.description,
          localizedDescription: target.localizedDescription,
          project: target.project,
          priority: target.priority,
          status: 'todo',
          dueDate: nextDueDate,
          dueTime: target.dueTime,
          manualProgress: 0,
          pinned: target.pinned,
          tags: target.tags ? [...target.tags] : undefined,
          recurrence: { ...target.recurrence },
          todos: freshTodos,
          updates: [],
          attachments: [],
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        nextTasks = [spawnedTask, ...nextTasks];
      }
    }
  }

  return {
    state: {
      ...state,
      tasks: nextTasks,
    },
    spawnedTask,
  };
}

/**
 * Returns built-in starter templates so users immediately have useful 1-click templates.
 */
export function getBuiltInTaskTemplates(): TaskTemplate[] {
  return [
    {
      id: 'tpl-builtin-site-inspection',
      name: 'Site Inspection & Safety Checklist',
      description: 'Standard field inspection protocol with photo verification and sign-off steps.',
      priority: 'high',
      tags: [
        { id: 'tag-site-visit', label: 'Site Visit', color: 'amber' },
        { id: 'tag-urgent', label: 'Urgent', color: 'rose' },
      ],
      recurrence: { frequency: 'weekly' },
      todos: [
        {
          title: 'Verify site safety & PPE compliance',
          subTodos: ['Check hard hats & vests', 'Inspect perimeter barriers'],
        },
        {
          title: 'Capture progress photos of active work zones',
          subTodos: ['Main structure overview', 'Electrical & piping close-ups'],
        },
        {
          title: 'Log supervisor notes & client sign-off',
        },
      ],
      createdAt: '2026-11-01T08:00:00.000Z',
    },
    {
      id: 'tpl-builtin-weekly-sprint',
      name: 'Weekly Progress Report & QA Review',
      description: 'Routine weekly deliverable review, quality checks, and stakeholder update.',
      priority: 'medium',
      tags: [{ id: 'tag-client-approval', label: 'Client Approval', color: 'blue' }],
      recurrence: { frequency: 'weekly' },
      todos: [
        {
          title: 'Compile completed milestones & metrics',
          subTodos: ['Review open blockers', 'Verify completed sub-tasks'],
        },
        {
          title: 'Export PDF status report & share with team',
        },
      ],
      createdAt: '2026-11-01T08:00:00.000Z',
    },
  ];
}

/**
 * Saves an existing task's structure (priority, tags, recurrence, todos, and sub-todos) as a reusable template.
 */
export function createTemplateFromTask(
  state: WorkspaceState,
  task: TaskItem,
  templateName?: string,
  nowIso = new Date().toISOString()
): { state: WorkspaceState; createdTemplate: TaskTemplate } {
  const name = (templateName || task.title).trim() || 'Task Template';
  const newTemplate: TaskTemplate = {
    id: `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    description: task.description,
    priority: task.priority,
    tags: task.tags ? task.tags.map((tg) => ({ ...tg })) : undefined,
    recurrence: task.recurrence ? { ...task.recurrence } : undefined,
    todos: task.todos.map((td) => ({
      title: td.title,
      subTodos: td.subTodos ? td.subTodos.map((st) => st.title) : undefined,
    })),
    createdAt: nowIso,
  };

  const existingTemplates = state.templates || getBuiltInTaskTemplates();
  return {
    state: {
      ...state,
      templates: [newTemplate, ...existingTemplates],
    },
    createdTemplate: newTemplate,
  };
}

/**
 * Instantiates a brand-new `TaskItem` from a `TaskTemplate`.
 */
export function instantiateTaskFromTemplate(
  template: TaskTemplate,
  targetFolderId: string,
  targetProjectId: string,
  projectName: string,
  dueDate: string,
  dueTime?: string,
  nowIso = new Date().toISOString()
): TaskItem {
  const todos: TodoItem[] = template.todos.map((td, idx) => {
    const todoId = `todo-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`;
    const subTodos: SubTodoItem[] | undefined =
      td.subTodos && td.subTodos.length > 0
        ? td.subTodos.map((subTitle, sIdx) => ({
            id: `sub-${Date.now()}-${idx}-${sIdx}-${Math.random().toString(36).slice(2, 6)}`,
            todoId,
            title: subTitle,
            completed: false,
            createdAt: nowIso,
          }))
        : undefined;

    return {
      id: todoId,
      title: td.title,
      completed: false,
      createdAt: nowIso,
      subTodos,
    };
  });

  return {
    id: `tsk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    folderId: targetFolderId,
    projectId: targetProjectId,
    title: template.name,
    description: template.description,
    project: projectName,
    priority: template.priority,
    status: 'todo',
    dueDate,
    dueTime: dueTime || undefined,
    manualProgress: 0,
    tags: template.tags ? template.tags.map((tg) => ({ ...tg })) : undefined,
    recurrence: template.recurrence ? { ...template.recurrence } : undefined,
    todos,
    updates: [],
    attachments: [],
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function deleteTaskTemplate(
  state: WorkspaceState,
  templateId: string
): WorkspaceState {
  const existing = state.templates || getBuiltInTaskTemplates();
  return {
    ...state,
    templates: existing.filter((tpl) => tpl.id !== templateId),
  };
}

/**
 * ============================================================================
 * 3. PINNING, FAVORITES & COLOR-CODED CUSTOM TAGS HELPERS
 * ============================================================================
 */

export function togglePinTask(
  state: WorkspaceState,
  taskId: string,
  nowIso = new Date().toISOString()
): WorkspaceState {
  return {
    ...state,
    tasks: state.tasks.map((t) =>
      t.id === taskId ? { ...t, pinned: !t.pinned, updatedAt: nowIso } : t
    ),
  };
}

export function togglePinProject(
  state: WorkspaceState,
  projectId: string
): WorkspaceState {
  return {
    ...state,
    projects: state.projects.map((p) =>
      p.id === projectId ? { ...p, pinned: !p.pinned } : p
    ),
  };
}

export function addTagToTask(
  task: TaskItem,
  label: string,
  color: TagColor = 'blue',
  nowIso = new Date().toISOString()
): TaskItem {
  const trimmed = label.trim();
  if (!trimmed) return task;
  const existing = task.tags || [];
  if (existing.some((tg) => tg.label.toLowerCase() === trimmed.toLowerCase())) {
    return task;
  }
  const newTag: TaskTag = {
    id: `tag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label: trimmed,
    color,
  };
  return {
    ...task,
    tags: [...existing, newTag],
    updatedAt: nowIso,
  };
}

export function removeTagFromTask(
  task: TaskItem,
  tagId: string,
  nowIso = new Date().toISOString()
): TaskItem {
  const existing = task.tags || [];
  return {
    ...task,
    tags: existing.filter((tg) => tg.id !== tagId),
    updatedAt: nowIso,
  };
}

/**
 * Returns deduplicated custom tags across all tasks in the workspace.
 */
export function collectAllWorkspaceTags(tasks: TaskItem[]): TaskTag[] {
  const map = new Map<string, TaskTag>();
  for (const t of tasks) {
    for (const tg of t.tags || []) {
      const key = tg.label.toLowerCase();
      if (!map.has(key)) {
        map.set(key, tg);
      }
    }
  }
  return Array.from(map.values());
}

/**
 * ============================================================================
 * 4. BATCH ACTIONS & FULL PROJECT / FOLDER CSV / EXCEL REPORT HELPERS
 * ============================================================================
 */

export function batchUpdateTasks(
  state: WorkspaceState,
  taskIds: string[],
  patch: {
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string;
    targetProjectId?: string;
    pinned?: boolean;
  },
  nowIso = new Date().toISOString()
): WorkspaceState {
  if (!taskIds || taskIds.length === 0) return state;
  const idSet = new Set(taskIds);
  const targetProject = patch.targetProjectId
    ? state.projects.find((p) => p.id === patch.targetProjectId)
    : undefined;

  let nextState: WorkspaceState = {
    ...state,
    tasks: state.tasks.map((task) => {
      if (!idSet.has(task.id)) return task;
      const nextStatus = patch.status !== undefined ? patch.status : task.status;
      const nextManualProgress =
        patch.status === 'completed'
          ? 100
          : patch.status === 'todo'
            ? 0
            : task.manualProgress;
      const nextTodos =
        patch.status === 'completed'
          ? task.todos.map((td) => ({
              ...td,
              completed: true,
              subTodos: td.subTodos
                ? td.subTodos.map((s) => ({ ...s, completed: true }))
                : undefined,
            }))
          : patch.status === 'todo'
            ? task.todos.map((td) => ({
                ...td,
                completed: false,
                subTodos: td.subTodos
                  ? td.subTodos.map((s) => ({ ...s, completed: false }))
                  : undefined,
              }))
            : task.todos;

      return {
        ...task,
        status: nextStatus,
        manualProgress: nextManualProgress,
        todos: nextTodos,
        priority: patch.priority !== undefined ? patch.priority : task.priority,
        dueDate: patch.dueDate !== undefined ? patch.dueDate : task.dueDate,
        pinned: patch.pinned !== undefined ? patch.pinned : task.pinned,
        folderId: targetProject ? targetProject.folderId : task.folderId,
        projectId: targetProject ? targetProject.id : task.projectId,
        project: targetProject ? targetProject.name : task.project,
        updatedAt: nowIso,
      };
    }),
  };

  if (patch.status === 'completed') {
    for (const id of taskIds) {
      const prevTask = state.tasks.find((t) => t.id === id);
      if (
        prevTask &&
        prevTask.status !== 'completed' &&
        prevTask.recurrence &&
        prevTask.recurrence.frequency !== 'none'
      ) {
        nextState = completeAndSpawnRecurringTask(nextState, id, nowIso).state;
      }
    }
  }

  return nextState;
}

export function batchMoveTasksToTrash(
  state: WorkspaceState,
  taskIds: string[],
  nowIso = new Date().toISOString()
): WorkspaceState {
  let nextState = state;
  for (const id of taskIds) {
    nextState = moveTaskToTrash(nextState, id, nowIso);
  }
  return nextState;
}

function escapeCsvCell(val: string | number | undefined | null): string {
  const str = String(val ?? '');
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates an Excel-compatible CSV report string for a list of tasks (Project Group or entire Folder).
 */
export function buildTasksCsvReport(
  tasks: TaskItem[],
  projects: ProjectGroupItem[],
  folders: FolderItem[]
): string {
  const folderMap = new Map(folders.map((f) => [f.id, f.name]));
  const projectMap = new Map(projects.map((p) => [p.id, p.name]));

  const headers = [
    'Folder',
    'Project Group',
    'Task Title',
    'Status',
    'Priority',
    'Progress (%)',
    'Due Date',
    'Due Time',
    'Recurrence',
    'Pinned',
    'Custom Tags',
    'To-Do Checklist (Completed/Total)',
    'Updates Count',
    'Photos Count',
    'Latest Update',
  ];

  const rows: string[] = [headers.map(escapeCsvCell).join(',')];

  for (const task of tasks) {
    const folderName = (task.folderId && folderMap.get(task.folderId)) || 'Workspace';
    const projectName =
      (task.projectId && projectMap.get(task.projectId)) || task.project || 'General';
    const progress = calculateTaskProgress(task);
    const todoCounts = getTaskTodoCounts(task.todos);
    const photosCount = countAllPhotosInTask(task);
    const tagsStr = (task.tags || []).map((t) => t.label).join('; ');
    const recurrenceStr = formatRecurrenceSummary(task.recurrence);
    const latestUpdate = task.updates[0]
      ? `${task.updates[0].timestamp}: ${task.updates[0].content}`
      : '';

    const row = [
      folderName,
      projectName,
      task.title,
      task.status,
      task.priority,
      progress,
      task.dueDate || '',
      task.dueTime || '',
      recurrenceStr,
      task.pinned ? 'Yes' : 'No',
      tagsStr,
      `${todoCounts.completed}/${todoCounts.total}`,
      task.updates.length,
      photosCount,
      latestUpdate,
    ];
    rows.push(row.map(escapeCsvCell).join(','));
  }

  return rows.join('\r\n');
}


