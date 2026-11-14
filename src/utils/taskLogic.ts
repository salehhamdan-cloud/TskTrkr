import {
  FolderItem,
  LanguageCode,
  PhotoTargetRef,
  ProjectGroupItem,
  ProjectMetrics,
  SelectedSidebarNode,
  SubTodoItem,
  TaskAttachment,
  TaskItem,
  TaskPriority,
  TaskStatus,
  TaskUpdateLog,
  TodoItem,
  WorkspaceState,
} from '../types/task';
import { resolveLocalizedText } from '../i18n/translations';

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
      todoTexts,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (searchable.includes(q)) {
      const prog = calculateTaskProgress(task);
      results.push({
        id: `task-${task.id}`,
        node: { type: 'task', id: task.id },
        type: 'task',
        title: displayTitle,
        subtitle: `${prog}% · ${displayDesc || task.project}`,
        matchedField: milestoneTags.toLowerCase().includes(q) ? 'tag' : 'task',
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
