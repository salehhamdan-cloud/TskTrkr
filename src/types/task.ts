export type LanguageCode = 'en' | 'ar' | 'he';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed';

export type RecurrenceFrequency =
  | 'none'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'custom';

export type RecurrenceCustomUnit = 'days' | 'weeks' | 'months' | 'years';

export interface TaskRecurrenceRule {
  frequency: RecurrenceFrequency;
  interval?: number;
  customUnit?: RecurrenceCustomUnit;
  intervalDays?: number;
}

export type TagColor = 'blue' | 'emerald' | 'amber' | 'rose' | 'violet' | 'cyan';

export interface TaskTag {
  id: string;
  label: string;
  color: TagColor;
}

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
  pinned?: boolean;
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
  dueTime?: string; // HH:mm optional reminder time
  manualProgress: number; // Used when todos is empty (0-100)
  pinned?: boolean;
  tags?: TaskTag[];
  recurrence?: TaskRecurrenceRule;
  todos: TodoItem[];
  updates: TaskUpdateLog[];
  attachments: TaskAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  priority: TaskPriority;
  tags?: TaskTag[];
  recurrence?: TaskRecurrenceRule;
  todos: Array<{
    title: string;
    subTodos?: string[];
  }>;
  createdAt: string;
}

export type SelectedSidebarNode =
  | { type: 'dashboard' }
  | { type: 'calendar' }
  | { type: 'settings' }
  | { type: 'trash' }
  | { type: 'notifications' }
  | { type: 'folder'; id: string }
  | { type: 'project'; id: string }
  | { type: 'task'; id: string };

export type TrashItemType =
  | 'folder'
  | 'project'
  | 'task'
  | 'todo'
  | 'subtodo'
  | 'update'
  | 'attachment';

export interface TrashItem {
  id: string;
  itemType: TrashItemType;
  title: string;
  subtitle?: string;
  deletedAt: string;
  folder?: FolderItem;
  childProjects?: ProjectGroupItem[];
  childTasks?: TaskItem[];
  project?: ProjectGroupItem;
  task?: TaskItem;
  todo?: TodoItem;
  subTodo?: SubTodoItem;
  update?: TaskUpdateLog;
  attachment?: TaskAttachment;
  parentTaskId?: string;
  parentTodoId?: string;
  parentUpdateId?: string;
  attachmentSection?: 'attachment' | 'todo' | 'update';
}

export type NotificationCategory =
  | 'reminder'
  | 'update'
  | 'change'
  | 'trash'
  | 'sync';

export type NotificationSection =
  | 'folder'
  | 'project'
  | 'task'
  | 'todo'
  | 'subtodo'
  | 'update'
  | 'attachment'
  | 'trash'
  | 'system';

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  section: NotificationSection;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  targetNode?: SelectedSidebarNode;
  dedupeKey?: string;
}

export interface WorkspaceState {
  folders: FolderItem[];
  projects: ProjectGroupItem[];
  tasks: TaskItem[];
  templates?: TaskTemplate[];
  trash?: TrashItem[];
  notifications?: AppNotification[];
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
