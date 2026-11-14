export type LanguageCode = 'en' | 'ar' | 'he';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed';

export interface LocalizedText {
  en: string;
  ar: string;
  he: string;
}

export interface FolderItem {
  id: string;
  name: string;
  localizedName?: LocalizedText;
  createdAt: string;
}

export interface ProjectGroupItem {
  id: string;
  folderId: string;
  name: string;
  description: string;
  localizedName?: LocalizedText;
  localizedDescription?: LocalizedText;
  createdAt: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  type: 'photo' | 'file';
  mimeType: string;
  sizeBytes: number;
  url: string;
  addedAt: string;
  caption?: string;
  localizedCaption?: LocalizedText;
  annotatedAt?: string;
}

export interface SubTodoItem {
  id: string;
  todoId: string;
  title: string;
  localizedTitle?: LocalizedText;
  completed: boolean;
  createdAt: string;
}

export interface TodoItem {
  id: string;
  title: string;
  localizedTitle?: LocalizedText;
  completed: boolean;
  createdAt: string;
  photos?: TaskAttachment[];
  subTodos?: SubTodoItem[];
}

export interface TaskUpdateLog {
  id: string;
  content: string;
  localizedContent?: LocalizedText;
  timestamp: string; // YYYY-MM-DDTHH:mm
  author: string;
  milestoneTag?: string;
  photos?: TaskAttachment[];
}

export interface PhotoTargetRef {
  section: 'todo' | 'update' | 'attachment';
  parentId?: string; // todoId when section === 'todo', updateId when section === 'update'
  photoId: string;
}

export interface TaskItem {
  id: string;
  folderId?: string;
  projectId?: string;
  title: string;
  description: string;
  localizedTitle?: LocalizedText;
  localizedDescription?: LocalizedText;
  project: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string; // YYYY-MM-DD
  manualProgress: number; // Used when todos is empty (0-100)
  todos: TodoItem[];
  updates: TaskUpdateLog[];
  attachments: TaskAttachment[];
  createdAt: string;
  updatedAt: string;
}

export type SelectedSidebarNode =
  | { type: 'dashboard' }
  | { type: 'settings' }
  | { type: 'folder'; id: string }
  | { type: 'project'; id: string }
  | { type: 'task'; id: string };

export interface WorkspaceState {
  folders: FolderItem[];
  projects: ProjectGroupItem[];
  tasks: TaskItem[];
}

export interface ProjectMetrics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  overdueTasks: number;
  overallProgressPercent: number;
  totalSubtasks: number;
  completedSubtasks: number;
  subtaskCompletionPercent: number;
  totalUpdates: number;
  totalAttachments: number;
  totalPhotos: number;
  totalFiles: number;
  projectBreakdown: Array<{
    projectId?: string;
    project: string;
    taskCount: number;
    completedCount: number;
    averageProgress: number;
    subtasksDone: number;
    subtasksTotal: number;
  }>;
  priorityBreakdown: Record<TaskPriority, { total: number; avgProgress: number }>;
}
