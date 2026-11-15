import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Bell,
  CheckSquare,
  Folder,
  FolderKanban,
  FolderOpen,
  Layers,
  Lock,
  Menu,
  Plus,
  Search,
  Settings,
  Wifi,
  X,
} from 'lucide-react';
import {
  AppNotification,
  LanguageCode,
  PhotoTargetRef,
  SelectedSidebarNode,
  TaskAttachment,
  TaskItem,
  TrashItem,
  WorkspaceState,
} from './types/task';
import { resolveLocalizedText, TRANSLATIONS } from './i18n/translations';
import {
  addAttachmentToTask,
  addPhotoToTodoInTask,
  addPhotoToUpdateInTask,
  addSubTodoToTask,
  addTodoToTask,
  addUpdateToTask,
  annotatePhotoInTask,
  appendNotification,
  clearAllNotifications,
  computeProjectMetrics,
  createFolder,
  createProject,
  deleteTrashItemPermanently,
  deriveTaskStatus,
  editAttachmentInTask,
  editSubTodoInTask,
  editTodoInTask,
  editUpdateInTask,
  emptyTrash,
  generateDueTaskReminders,
  markAllNotificationsRead,
  markNotificationRead,
  moveAttachmentToTrash,
  moveFolderToTrash,
  moveProjectToTrash,
  moveSubTodoToTrash,
  moveTaskToTrash,
  moveTodoToTrash,
  moveUpdateToTrash,
  restoreTrashItem,
  searchWorkspace,
  toggleSubTodoInTask,
  toggleTodoInTask,
  updateFolder,
  updateProject,
} from './utils/taskLogic';
import {
  getDefaultWorkspaceState,
  isSessionUnlocked,
  loadSavedLanguage,
  loadSavedTheme,
  loadSyncMeta,
  loadWorkspaceFromLocalStorage,
  OfflineSyncMeta,
  saveLanguage,
  saveTheme,
  saveWorkspaceToLocalStorage,
  setSessionUnlocked,
} from './utils/offlineStorage';
import {
  loadLocalFolderMeta,
  LocalFolderSyncMeta,
  overwriteLocalSaveFile,
} from './utils/localFolderSync';
import { SidebarTree } from './components/SidebarTree';
import { FolderDetailView } from './components/FolderDetailView';
import { ProjectDetailView } from './components/ProjectDetailView';
import { TaskDetailPanel } from './components/TaskDetailPanel';
import { DashboardView } from './components/DashboardView';
import { SettingsView } from './components/SettingsView';
import { NewTaskModal } from './components/NewTaskModal';
import { PriorityBadge } from './components/PriorityBadge';
import { AppLockScreen } from './components/AppLockScreen';
import { ConfirmDeleteModal, ConfirmDeleteState } from './components/ConfirmDeleteModal';
import { TrashView } from './components/TrashView';
import { NotificationCenter } from './components/NotificationCenter';

export default function App() {
  const [lang, setLangState] = useState<LanguageCode>(() => loadSavedLanguage());
  const t = TRANSLATIONS[lang];
  const isRtl = lang === 'ar' || lang === 'he';

  const [workspace, setWorkspace] = useState<WorkspaceState>(() => {
    const initial = loadWorkspaceFromLocalStorage();
    return generateDueTaskReminders(initial, new Date(), {
      overdueTitle: TRANSLATIONS[loadSavedLanguage()].overdueReminderTitle,
      dueTodayTitle: TRANSLATIONS[loadSavedLanguage()].dueTodayReminderTitle,
      dueTomorrowTitle: TRANSLATIONS[loadSavedLanguage()].dueTomorrowReminderTitle,
    });
  });

  const [syncMeta, setSyncMeta] = useState<OfflineSyncMeta>(() => loadSyncMeta());
  const [localFolderMeta, setLocalFolderMeta] = useState<LocalFolderSyncMeta>(() =>
    loadLocalFolderMeta()
  );

  const [selectedNode, setSelectedNode] = useState<SelectedSidebarNode>(() => {
    const initial = loadWorkspaceFromLocalStorage();
    if (initial.projects[0]) {
      return { type: 'project', id: initial.projects[0].id };
    }
    return { type: 'dashboard' };
  });

  const [isDarkMode, setIsDarkModeState] = useState<boolean>(() => loadSavedTheme());
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => isSessionUnlocked());
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [newTaskContext, setNewTaskContext] = useState<{
    isOpen: boolean;
    folderId?: string;
    projectId?: string;
  }>({ isOpen: false });

  // Confirmation modal state for all deletions across the app
  const [confirmDeleteState, setConfirmDeleteState] =
    useState<ConfirmDeleteState | null>(null);

  // Live toast notification banner state
  const [liveToast, setLiveToast] = useState<{
    id: string;
    title: string;
    message: string;
    targetNode?: SelectedSidebarNode;
  } | null>(null);

  const showToast = (
    title: string,
    message: string,
    targetNode?: SelectedSidebarNode
  ) => {
    const toastId = `toast-${Date.now()}`;
    setLiveToast({ id: toastId, title, message, targetNode });
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      window.Notification.permission === 'granted'
    ) {
      try {
        new window.Notification(title, { body: message, icon: './pwa-192x192.png' });
      } catch {
        // ignore
      }
    }
  };

  useEffect(() => {
    if (!liveToast) return;
    const timer = window.setTimeout(() => {
      setLiveToast(null);
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [liveToast]);

  const setLang = (nextLang: LanguageCode) => {
    saveLanguage(nextLang);
    setLangState(nextLang);
  };

  const setIsDarkMode = (updater: boolean | ((prev: boolean) => boolean)) => {
    setIsDarkModeState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveTheme(next);
      return next;
    });
  };

  // Sync HTML dir and lang attributes and persist language
  useEffect(() => {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    saveLanguage(lang);
  }, [lang, isRtl]);

  // Sync dark mode class on <html> and persist theme
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    saveTheme(isDarkMode);
  }, [isDarkMode]);

  // Periodic background due-date & due-time reminder check every 60 seconds
  useEffect(() => {
    const interval = window.setInterval(() => {
      setWorkspace((prev) => {
        const scanned = generateDueTaskReminders(prev, new Date(), {
          overdueTitle: t.overdueReminderTitle,
          dueTodayTitle: t.dueTodayReminderTitle,
          dueTomorrowTitle: t.dueTomorrowReminderTitle,
        });
        if (
          (scanned.notifications?.length || 0) !==
          (prev.notifications?.length || 0)
        ) {
          saveWorkspaceToLocalStorage(scanned, syncMeta);
          return scanned;
        }
        return prev;
      });
    }, 60000);
    return () => window.clearInterval(interval);
  }, [t.overdueReminderTitle, t.dueTodayReminderTitle, t.dueTomorrowReminderTitle, syncMeta]);

  // Close global search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const commitWorkspace = (
    updater: (prev: WorkspaceState) => WorkspaceState,
    options?: { skipLocalFolderOverwrite?: boolean }
  ) => {
    setWorkspace((prev) => {
      const updated = updater(prev);
      const withReminders = generateDueTaskReminders(updated, new Date(), {
        overdueTitle: t.overdueReminderTitle,
        dueTodayTitle: t.dueTodayReminderTitle,
        dueTomorrowTitle: t.dueTomorrowReminderTitle,
      });
      const nextMeta = saveWorkspaceToLocalStorage(withReminders, syncMeta);
      setSyncMeta(nextMeta);

      // Automatically overwrite the single file (`masar_workspace_autosave.json`) in the chosen local folder
      const currentFolderMeta = loadLocalFolderMeta();
      if (!options?.skipLocalFolderOverwrite && currentFolderMeta.isConnected) {
        overwriteLocalSaveFile(withReminders, lang, isDarkMode, false).then(
          (updatedFolderMeta) => {
            setLocalFolderMeta(updatedFolderMeta);
          }
        );
      }

      return withReminders;
    });
  };

  const metrics = useMemo(
    () => computeProjectMetrics(workspace.tasks),
    [workspace.tasks]
  );

  const searchResults = useMemo(
    () => searchWorkspace(workspace, globalSearchQuery, lang),
    [workspace, globalSearchQuery, lang]
  );

  const trashItems = workspace.trash || [];
  const notifications = workspace.notifications || [];
  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  // ============================================================================
  // FOLDER CRUD (WITH NOTIFICATION & CONFIRM DELETE -> TRASH)
  // ============================================================================
  const handleCreateFolder = (name: string) => {
    commitWorkspace((prev) => {
      const res = createFolder(prev, name);
      if (res.createdFolder) {
        setSelectedNode({ type: 'folder', id: res.createdFolder.id });
        showToast(
          `${t.notifCreatedLabel}: ${t.folderTypeLabel}`,
          res.createdFolder.name,
          { type: 'folder', id: res.createdFolder.id }
        );
        return appendNotification(res.state, {
          category: 'change',
          section: 'folder',
          title: `${t.notifCreatedLabel}: ${t.folderTypeLabel}`,
          message: res.createdFolder.name,
          targetNode: { type: 'folder', id: res.createdFolder.id },
        });
      }
      return res.state;
    });
  };

  const handleUpdateFolder = (folderId: string, name: string) => {
    commitWorkspace((prev) => {
      const next = updateFolder(prev, folderId, name);
      showToast(`${t.notifUpdatedLabel}: ${t.folderTypeLabel}`, name, {
        type: 'folder',
        id: folderId,
      });
      return appendNotification(next, {
        category: 'change',
        section: 'folder',
        title: `${t.notifUpdatedLabel}: ${t.folderTypeLabel}`,
        message: name,
        targetNode: { type: 'folder', id: folderId },
      });
    });
  };

  const handleDeleteFolder = (folderId: string) => {
    const folder = workspace.folders.find((f) => f.id === folderId);
    if (!folder) return;
    const folderName = resolveLocalizedText(folder.name, folder.localizedName, lang);

    setConfirmDeleteState({
      isOpen: true,
      itemName: folderName,
      itemTypeBadge: t.folderTypeLabel,
      isPermanent: false,
      onConfirm: () => {
        commitWorkspace((prev) => {
          const next = moveFolderToTrash(prev, folderId);
          if (selectedNode.type === 'folder' && selectedNode.id === folderId) {
            if (next.folders[0]) {
              setSelectedNode({ type: 'folder', id: next.folders[0].id });
            } else {
              setSelectedNode({ type: 'dashboard' });
            }
          }
          showToast(t.notifMovedToTrashLabel, folderName, { type: 'trash' });
          return appendNotification(next, {
            category: 'trash',
            section: 'folder',
            title: `${t.notifMovedToTrashLabel}: ${t.folderTypeLabel}`,
            message: folderName,
            targetNode: { type: 'trash' },
          });
        });
      },
    });
  };

  // ============================================================================
  // PROJECT CRUD (WITH NOTIFICATION & CONFIRM DELETE -> TRASH)
  // ============================================================================
  const handleCreateProject = (
    folderId: string,
    name: string,
    description = ''
  ) => {
    commitWorkspace((prev) => {
      const res = createProject(prev, folderId, name, description);
      if (res.createdProject) {
        setSelectedNode({ type: 'project', id: res.createdProject.id });
        showToast(
          `${t.notifCreatedLabel}: ${t.projectTypeLabel}`,
          res.createdProject.name,
          { type: 'project', id: res.createdProject.id }
        );
        return appendNotification(res.state, {
          category: 'change',
          section: 'project',
          title: `${t.notifCreatedLabel}: ${t.projectTypeLabel}`,
          message: res.createdProject.name,
          targetNode: { type: 'project', id: res.createdProject.id },
        });
      }
      return res.state;
    });
  };

  const handleUpdateProject = (
    projectId: string,
    patch: { name?: string; description?: string }
  ) => {
    commitWorkspace((prev) => {
      const next = updateProject(prev, projectId, patch);
      const proj = next.projects.find((p) => p.id === projectId);
      const label = proj
        ? resolveLocalizedText(proj.name, proj.localizedName, lang)
        : patch.name || '';
      showToast(`${t.notifUpdatedLabel}: ${t.projectTypeLabel}`, label, {
        type: 'project',
        id: projectId,
      });
      return appendNotification(next, {
        category: 'change',
        section: 'project',
        title: `${t.notifUpdatedLabel}: ${t.projectTypeLabel}`,
        message: label,
        targetNode: { type: 'project', id: projectId },
      });
    });
  };

  const handleDeleteProject = (projectId: string) => {
    const targetProj = workspace.projects.find((p) => p.id === projectId);
    if (!targetProj) return;
    const projName = resolveLocalizedText(
      targetProj.name,
      targetProj.localizedName,
      lang
    );

    setConfirmDeleteState({
      isOpen: true,
      itemName: projName,
      itemTypeBadge: t.projectTypeLabel,
      isPermanent: false,
      onConfirm: () => {
        commitWorkspace((prev) => {
          const next = moveProjectToTrash(prev, projectId);
          if (selectedNode.type === 'project' && selectedNode.id === projectId) {
            setSelectedNode({ type: 'folder', id: targetProj.folderId });
          }
          showToast(t.notifMovedToTrashLabel, projName, { type: 'trash' });
          return appendNotification(next, {
            category: 'trash',
            section: 'project',
            title: `${t.notifMovedToTrashLabel}: ${t.projectTypeLabel}`,
            message: projName,
            targetNode: { type: 'trash' },
          });
        });
      },
    });
  };

  // ============================================================================
  // TASK CRUD (WITH NOTIFICATION, REMINDER & CONFIRM DELETE -> TRASH)
  // ============================================================================
  const handleCreateTask = (newTask: TaskItem) => {
    commitWorkspace((prev) => {
      const withTask: WorkspaceState = {
        ...prev,
        tasks: [newTask, ...prev.tasks],
      };
      showToast(
        `${t.notifCreatedLabel}: ${t.taskTypeLabel}`,
        `${newTask.title} (${newTask.dueDate}${newTask.dueTime ? ` · ${newTask.dueTime}` : ''})`,
        { type: 'task', id: newTask.id }
      );
      return appendNotification(withTask, {
        category: 'change',
        section: 'task',
        title: `${t.notifCreatedLabel}: ${t.taskTypeLabel}`,
        message: `${newTask.title} — ${t.dueDateLabel}: ${newTask.dueDate}${
          newTask.dueTime ? ` (${newTask.dueTime})` : ''
        }`,
        targetNode: { type: 'task', id: newTask.id },
      });
    });
    setSelectedNode({ type: 'task', id: newTask.id });
  };

  const handleUpdateTaskMeta = (
    taskId: string,
    patch: Partial<
      Pick<
        TaskItem,
        | 'status'
        | 'priority'
        | 'manualProgress'
        | 'dueDate'
        | 'dueTime'
        | 'title'
        | 'description'
      >
    >
  ) => {
    commitWorkspace((prev) => {
      let updatedTaskTitle = '';
      const nextTasks = prev.tasks.map((tsk) => {
        if (tsk.id !== taskId) return tsk;
        const updated: TaskItem = {
          ...tsk,
          ...patch,
          localizedTitle: patch.title !== undefined ? undefined : tsk.localizedTitle,
          localizedDescription:
            patch.description !== undefined ? undefined : tsk.localizedDescription,
          updatedAt: new Date().toISOString(),
        };
        if (patch.manualProgress !== undefined && updated.todos.length === 0) {
          updated.status = deriveTaskStatus(updated.status, patch.manualProgress);
        }
        updatedTaskTitle = resolveLocalizedText(
          updated.title,
          updated.localizedTitle,
          lang
        );
        return updated;
      });

      const isDueChanged = patch.dueDate !== undefined || patch.dueTime !== undefined;
      const notifTitle = isDueChanged
        ? `${t.notifUpdatedLabel}: ${t.dueDateLabel}`
        : `${t.notifUpdatedLabel}: ${t.taskTypeLabel}`;
      showToast(notifTitle, updatedTaskTitle, { type: 'task', id: taskId });

      return appendNotification(
        { ...prev, tasks: nextTasks },
        {
          category: isDueChanged ? 'reminder' : 'change',
          section: 'task',
          title: notifTitle,
          message: updatedTaskTitle,
          targetNode: { type: 'task', id: taskId },
        }
      );
    });
  };

  const handleDeleteTask = (taskId: string) => {
    const targetTask = workspace.tasks.find((tsk) => tsk.id === taskId);
    if (!targetTask) return;
    const taskTitle = resolveLocalizedText(
      targetTask.title,
      targetTask.localizedTitle,
      lang
    );

    setConfirmDeleteState({
      isOpen: true,
      itemName: taskTitle,
      itemTypeBadge: t.taskTypeLabel,
      isPermanent: false,
      onConfirm: () => {
        commitWorkspace((prev) => {
          const next = moveTaskToTrash(prev, taskId);
          showToast(t.notifMovedToTrashLabel, taskTitle, { type: 'trash' });
          return appendNotification(next, {
            category: 'trash',
            section: 'task',
            title: `${t.notifMovedToTrashLabel}: ${t.taskTypeLabel}`,
            message: taskTitle,
            targetNode: { type: 'trash' },
          });
        });
        if (selectedNode.type === 'task' && selectedNode.id === taskId) {
          if (targetTask.projectId) {
            setSelectedNode({ type: 'project', id: targetTask.projectId });
          } else {
            setSelectedNode({ type: 'dashboard' });
          }
        }
      },
    });
  };

  // ============================================================================
  // TO-DO & SUB-TO-DO CRUD (WITH NOTIFICATION & CONFIRM DELETE -> TRASH)
  // ============================================================================
  const handleAddTodo = (
    taskId: string,
    title: string,
    photos?: Omit<TaskAttachment, 'id' | 'addedAt'>[]
  ) => {
    commitWorkspace((prev) => {
      const nextTasks = prev.tasks.map((tsk) =>
        tsk.id === taskId ? addTodoToTask(tsk, title, photos) : tsk
      );
      showToast(`${t.notifCreatedLabel}: ${t.todoTypeLabel}`, title, {
        type: 'task',
        id: taskId,
      });
      return appendNotification(
        { ...prev, tasks: nextTasks },
        {
          category: 'change',
          section: 'todo',
          title: `${t.notifCreatedLabel}: ${t.todoTypeLabel}`,
          message: title,
          targetNode: { type: 'task', id: taskId },
        }
      );
    });
  };

  const handleAddPhotoToTodo = (
    taskId: string,
    todoId: string,
    photo: Omit<TaskAttachment, 'id' | 'addedAt'>
  ) => {
    commitWorkspace((prev) => {
      const nextTasks = prev.tasks.map((tsk) =>
        tsk.id === taskId ? addPhotoToTodoInTask(tsk, todoId, photo) : tsk
      );
      showToast(`${t.notifCreatedLabel}: ${t.attachmentTypeLabel}`, photo.name, {
        type: 'task',
        id: taskId,
      });
      return appendNotification(
        { ...prev, tasks: nextTasks },
        {
          category: 'update',
          section: 'attachment',
          title: `${t.notifCreatedLabel}: ${t.attachmentTypeLabel}`,
          message: photo.name,
          targetNode: { type: 'task', id: taskId },
        }
      );
    });
  };

  const handleDeletePhotoFromTodo = (
    taskId: string,
    todoId: string,
    photoId: string
  ) => {
    const task = workspace.tasks.find((t) => t.id === taskId);
    const todo = task?.todos.find((td) => td.id === todoId);
    const photo = todo?.photos?.find((p) => p.id === photoId);
    if (!photo) return;

    setConfirmDeleteState({
      isOpen: true,
      itemName: photo.name,
      itemTypeBadge: t.attachmentTypeLabel,
      isPermanent: false,
      onConfirm: () => {
        commitWorkspace((prev) => {
          const next = moveAttachmentToTrash(prev, taskId, 'todo', photoId, todoId);
          showToast(t.notifMovedToTrashLabel, photo.name, { type: 'trash' });
          return appendNotification(next, {
            category: 'trash',
            section: 'attachment',
            title: `${t.notifMovedToTrashLabel}: ${t.attachmentTypeLabel}`,
            message: photo.name,
            targetNode: { type: 'trash' },
          });
        });
      },
    });
  };

  const handleEditTodo = (taskId: string, todoId: string, newTitle: string) => {
    commitWorkspace((prev) => {
      const nextTasks = prev.tasks.map((tsk) =>
        tsk.id === taskId ? editTodoInTask(tsk, todoId, newTitle) : tsk
      );
      return appendNotification(
        { ...prev, tasks: nextTasks },
        {
          category: 'change',
          section: 'todo',
          title: `${t.notifUpdatedLabel}: ${t.todoTypeLabel}`,
          message: newTitle,
          targetNode: { type: 'task', id: taskId },
        }
      );
    });
  };

  const handleToggleTodo = (taskId: string, todoId: string) => {
    commitWorkspace((prev) => {
      const nextTasks = prev.tasks.map((tsk) =>
        tsk.id === taskId ? toggleTodoInTask(tsk, todoId) : tsk
      );
      const targetTask = nextTasks.find((t) => t.id === taskId);
      const targetTodo = targetTask?.todos.find((td) => td.id === todoId);
      const todoTitle = targetTodo
        ? resolveLocalizedText(targetTodo.title, targetTodo.localizedTitle, lang)
        : '';
      return appendNotification(
        { ...prev, tasks: nextTasks },
        {
          category: 'change',
          section: 'todo',
          title: `${
            targetTodo?.completed ? t.notifCompletedLabel : t.notifUpdatedLabel
          }: ${t.todoTypeLabel}`,
          message: todoTitle,
          targetNode: { type: 'task', id: taskId },
        }
      );
    });
  };

  const handleDeleteTodo = (taskId: string, todoId: string) => {
    const task = workspace.tasks.find((t) => t.id === taskId);
    const todo = task?.todos.find((td) => td.id === todoId);
    if (!todo) return;
    const todoTitle = resolveLocalizedText(todo.title, todo.localizedTitle, lang);

    setConfirmDeleteState({
      isOpen: true,
      itemName: todoTitle,
      itemTypeBadge: t.todoTypeLabel,
      isPermanent: false,
      onConfirm: () => {
        commitWorkspace((prev) => {
          const next = moveTodoToTrash(prev, taskId, todoId);
          showToast(t.notifMovedToTrashLabel, todoTitle, { type: 'trash' });
          return appendNotification(next, {
            category: 'trash',
            section: 'todo',
            title: `${t.notifMovedToTrashLabel}: ${t.todoTypeLabel}`,
            message: todoTitle,
            targetNode: { type: 'trash' },
          });
        });
      },
    });
  };

  const handleAddSubTodo = (taskId: string, todoId: string, title: string) => {
    commitWorkspace((prev) => {
      const nextTasks = prev.tasks.map((tsk) =>
        tsk.id === taskId ? addSubTodoToTask(tsk, todoId, title) : tsk
      );
      showToast(`${t.notifCreatedLabel}: ${t.subTodoTypeLabel}`, title, {
        type: 'task',
        id: taskId,
      });
      return appendNotification(
        { ...prev, tasks: nextTasks },
        {
          category: 'change',
          section: 'subtodo',
          title: `${t.notifCreatedLabel}: ${t.subTodoTypeLabel}`,
          message: title,
          targetNode: { type: 'task', id: taskId },
        }
      );
    });
  };

  const handleToggleSubTodo = (taskId: string, todoId: string, subTodoId: string) => {
    commitWorkspace((prev) => {
      const nextTasks = prev.tasks.map((tsk) =>
        tsk.id === taskId ? toggleSubTodoInTask(tsk, todoId, subTodoId) : tsk
      );
      const targetTask = nextTasks.find((t) => t.id === taskId);
      const targetSub = targetTask?.todos
        .find((td) => td.id === todoId)
        ?.subTodos?.find((s) => s.id === subTodoId);
      const subTitle = targetSub
        ? resolveLocalizedText(targetSub.title, targetSub.localizedTitle, lang)
        : '';
      return appendNotification(
        { ...prev, tasks: nextTasks },
        {
          category: 'change',
          section: 'subtodo',
          title: `${
            targetSub?.completed ? t.notifCompletedLabel : t.notifUpdatedLabel
          }: ${t.subTodoTypeLabel}`,
          message: subTitle,
          targetNode: { type: 'task', id: taskId },
        }
      );
    });
  };

  const handleEditSubTodo = (
    taskId: string,
    todoId: string,
    subTodoId: string,
    newTitle: string
  ) => {
    commitWorkspace((prev) => {
      const nextTasks = prev.tasks.map((tsk) =>
        tsk.id === taskId ? editSubTodoInTask(tsk, todoId, subTodoId, newTitle) : tsk
      );
      return appendNotification(
        { ...prev, tasks: nextTasks },
        {
          category: 'change',
          section: 'subtodo',
          title: `${t.notifUpdatedLabel}: ${t.subTodoTypeLabel}`,
          message: newTitle,
          targetNode: { type: 'task', id: taskId },
        }
      );
    });
  };

  const handleDeleteSubTodo = (taskId: string, todoId: string, subTodoId: string) => {
    const task = workspace.tasks.find((t) => t.id === taskId);
    const todo = task?.todos.find((td) => td.id === todoId);
    const sub = todo?.subTodos?.find((s) => s.id === subTodoId);
    if (!sub) return;
    const subTitle = resolveLocalizedText(sub.title, sub.localizedTitle, lang);

    setConfirmDeleteState({
      isOpen: true,
      itemName: subTitle,
      itemTypeBadge: t.subTodoTypeLabel,
      isPermanent: false,
      onConfirm: () => {
        commitWorkspace((prev) => {
          const next = moveSubTodoToTrash(prev, taskId, todoId, subTodoId);
          showToast(t.notifMovedToTrashLabel, subTitle, { type: 'trash' });
          return appendNotification(next, {
            category: 'trash',
            section: 'subtodo',
            title: `${t.notifMovedToTrashLabel}: ${t.subTodoTypeLabel}`,
            message: subTitle,
            targetNode: { type: 'trash' },
          });
        });
      },
    });
  };

  // ============================================================================
  // TASK UPDATES & ATTACHMENTS CRUD (WITH NOTIFICATION & CONFIRM DELETE -> TRASH)
  // ============================================================================
  const handleAddUpdate = (
    taskId: string,
    update: {
      content: string;
      timestamp: string;
      author: string;
      photos?: Omit<TaskAttachment, 'id' | 'addedAt'>[];
    }
  ) => {
    commitWorkspace((prev) => {
      const nextTasks = prev.tasks.map((tsk) =>
        tsk.id === taskId ? addUpdateToTask(tsk, update) : tsk
      );
      showToast(`${t.notifCreatedLabel}: ${t.updateTypeLabel}`, update.content, {
        type: 'task',
        id: taskId,
      });
      return appendNotification(
        { ...prev, tasks: nextTasks },
        {
          category: 'update',
          section: 'update',
          title: `${t.notifCreatedLabel}: ${t.updateTypeLabel}`,
          message: update.content,
          targetNode: { type: 'task', id: taskId },
        }
      );
    });
  };

  const handleAddPhotoToUpdate = (
    taskId: string,
    updateId: string,
    photo: Omit<TaskAttachment, 'id' | 'addedAt'>
  ) => {
    commitWorkspace((prev) => {
      const nextTasks = prev.tasks.map((tsk) =>
        tsk.id === taskId ? addPhotoToUpdateInTask(tsk, updateId, photo) : tsk
      );
      showToast(`${t.notifCreatedLabel}: ${t.attachmentTypeLabel}`, photo.name, {
        type: 'task',
        id: taskId,
      });
      return appendNotification(
        { ...prev, tasks: nextTasks },
        {
          category: 'update',
          section: 'attachment',
          title: `${t.notifCreatedLabel}: ${t.attachmentTypeLabel}`,
          message: photo.name,
          targetNode: { type: 'task', id: taskId },
        }
      );
    });
  };

  const handleDeletePhotoFromUpdate = (
    taskId: string,
    updateId: string,
    photoId: string
  ) => {
    const task = workspace.tasks.find((t) => t.id === taskId);
    const upd = task?.updates.find((u) => u.id === updateId);
    const photo = upd?.photos?.find((p) => p.id === photoId);
    if (!photo) return;

    setConfirmDeleteState({
      isOpen: true,
      itemName: photo.name,
      itemTypeBadge: t.attachmentTypeLabel,
      isPermanent: false,
      onConfirm: () => {
        commitWorkspace((prev) => {
          const next = moveAttachmentToTrash(prev, taskId, 'update', photoId, updateId);
          showToast(t.notifMovedToTrashLabel, photo.name, { type: 'trash' });
          return appendNotification(next, {
            category: 'trash',
            section: 'attachment',
            title: `${t.notifMovedToTrashLabel}: ${t.attachmentTypeLabel}`,
            message: photo.name,
            targetNode: { type: 'trash' },
          });
        });
      },
    });
  };

  const handleEditUpdate = (
    taskId: string,
    updateId: string,
    patch: { content: string; timestamp?: string; author?: string }
  ) => {
    commitWorkspace((prev) => {
      const nextTasks = prev.tasks.map((tsk) =>
        tsk.id === taskId ? editUpdateInTask(tsk, updateId, patch) : tsk
      );
      return appendNotification(
        { ...prev, tasks: nextTasks },
        {
          category: 'update',
          section: 'update',
          title: `${t.notifUpdatedLabel}: ${t.updateTypeLabel}`,
          message: patch.content,
          targetNode: { type: 'task', id: taskId },
        }
      );
    });
  };

  const handleDeleteUpdate = (taskId: string, updateId: string) => {
    const task = workspace.tasks.find((t) => t.id === taskId);
    const upd = task?.updates.find((u) => u.id === updateId);
    if (!upd) return;
    const updText = resolveLocalizedText(upd.content, upd.localizedContent, lang);

    setConfirmDeleteState({
      isOpen: true,
      itemName: updText,
      itemTypeBadge: t.updateTypeLabel,
      isPermanent: false,
      onConfirm: () => {
        commitWorkspace((prev) => {
          const next = moveUpdateToTrash(prev, taskId, updateId);
          showToast(t.notifMovedToTrashLabel, updText, { type: 'trash' });
          return appendNotification(next, {
            category: 'trash',
            section: 'update',
            title: `${t.notifMovedToTrashLabel}: ${t.updateTypeLabel}`,
            message: updText,
            targetNode: { type: 'trash' },
          });
        });
      },
    });
  };

  const handleAddAttachment = (
    taskId: string,
    attachment: Omit<TaskAttachment, 'id' | 'addedAt'>
  ) => {
    commitWorkspace((prev) => {
      const nextTasks = prev.tasks.map((tsk) =>
        tsk.id === taskId ? addAttachmentToTask(tsk, attachment) : tsk
      );
      showToast(`${t.notifCreatedLabel}: ${t.attachmentTypeLabel}`, attachment.name, {
        type: 'task',
        id: taskId,
      });
      return appendNotification(
        { ...prev, tasks: nextTasks },
        {
          category: 'update',
          section: 'attachment',
          title: `${t.notifCreatedLabel}: ${t.attachmentTypeLabel}`,
          message: attachment.name,
          targetNode: { type: 'task', id: taskId },
        }
      );
    });
  };

  const handleEditAttachment = (
    taskId: string,
    attachmentId: string,
    patch: { name?: string; caption?: string }
  ) => {
    commitWorkspace((prev) => {
      const nextTasks = prev.tasks.map((tsk) =>
        tsk.id === taskId ? editAttachmentInTask(tsk, attachmentId, patch) : tsk
      );
      return appendNotification(
        { ...prev, tasks: nextTasks },
        {
          category: 'update',
          section: 'attachment',
          title: `${t.notifUpdatedLabel}: ${t.attachmentTypeLabel}`,
          message: patch.name || patch.caption || '',
          targetNode: { type: 'task', id: taskId },
        }
      );
    });
  };

  const handleDeleteAttachment = (taskId: string, attachmentId: string) => {
    const task = workspace.tasks.find((t) => t.id === taskId);
    const att = task?.attachments.find((a) => a.id === attachmentId);
    if (!att) return;

    setConfirmDeleteState({
      isOpen: true,
      itemName: att.name,
      itemTypeBadge: t.attachmentTypeLabel,
      isPermanent: false,
      onConfirm: () => {
        commitWorkspace((prev) => {
          const next = moveAttachmentToTrash(prev, taskId, 'attachment', attachmentId);
          showToast(t.notifMovedToTrashLabel, att.name, { type: 'trash' });
          return appendNotification(next, {
            category: 'trash',
            section: 'attachment',
            title: `${t.notifMovedToTrashLabel}: ${t.attachmentTypeLabel}`,
            message: att.name,
            targetNode: { type: 'trash' },
          });
        });
      },
    });
  };

  const handleAnnotatePhoto = (
    taskId: string,
    target: PhotoTargetRef,
    annotatedDataUrl: string,
    caption?: string
  ) => {
    commitWorkspace((prev) => {
      const nextTasks = prev.tasks.map((tsk) =>
        tsk.id === taskId
          ? annotatePhotoInTask(tsk, target, annotatedDataUrl, caption)
          : tsk
      );
      showToast(
        `${t.notifUpdatedLabel}: ${t.annotatedBadge}`,
        caption || t.annotatedBadge,
        { type: 'task', id: taskId }
      );
      return appendNotification(
        { ...prev, tasks: nextTasks },
        {
          category: 'update',
          section: 'attachment',
          title: `${t.notifUpdatedLabel}: ${t.annotatedBadge}`,
          message: caption || t.annotatedBadge,
          targetNode: { type: 'task', id: taskId },
        }
      );
    });
  };

  // ============================================================================
  // TRASH RESTORE, PERMANENT DELETE & EMPTY TRASH HANDLERS
  // ============================================================================
  const handleRestoreTrashItem = (trashId: string) => {
    const item = trashItems.find((tr) => tr.id === trashId);
    if (!item) return;
    commitWorkspace((prev) => {
      const restored = restoreTrashItem(prev, trashId);
      showToast(t.notifRestoredLabel, item.title);
      return appendNotification(restored, {
        category: 'trash',
        section: 'trash',
        title: t.notifRestoredLabel,
        message: item.title,
      });
    });
  };

  const handleDeleteTrashItemPermanently = (trashItem: TrashItem) => {
    setConfirmDeleteState({
      isOpen: true,
      itemName: trashItem.title,
      itemTypeBadge: trashItem.itemType,
      isPermanent: true,
      onConfirm: () => {
        commitWorkspace((prev) => deleteTrashItemPermanently(prev, trashItem.id));
      },
    });
  };

  const handleEmptyTrash = () => {
    setConfirmDeleteState({
      isOpen: true,
      title: t.confirmEmptyTrashTitle,
      description: t.confirmEmptyTrashDesc,
      itemName: `${trashItems.length} ${t.trashNav}`,
      isPermanent: true,
      confirmButtonLabel: t.emptyTrashButton,
      onConfirm: () => {
        commitWorkspace((prev) => emptyTrash(prev));
      },
    });
  };

  const handleResetDefaultWorkspaceWithConfirm = () => {
    setConfirmDeleteState({
      isOpen: true,
      title: t.confirmResetDemoTitle,
      description: t.confirmResetDemoDesc,
      itemName: t.resetDefaultDataButton,
      isPermanent: true,
      confirmButtonLabel: t.resetDefaultDataButton,
      onConfirm: () => {
        commitWorkspace(() => getDefaultWorkspaceState());
      },
    });
  };

  // ============================================================================
  // NOTIFICATION CENTER HANDLERS
  // ============================================================================
  const handleSelectNotification = (notif: AppNotification) => {
    commitWorkspace((prev) => markNotificationRead(prev, notif.id));
    if (notif.targetNode) {
      setSelectedNode(notif.targetNode);
    }
  };

  const handleMarkAllNotificationsRead = () => {
    commitWorkspace((prev) => markAllNotificationsRead(prev));
  };

  const handleClearAllNotifications = () => {
    commitWorkspace((prev) => clearAllNotifications(prev));
  };

  const handleScanRemindersNow = () => {
    commitWorkspace((prev) =>
      generateDueTaskReminders(prev, new Date(), {
        overdueTitle: t.overdueReminderTitle,
        dueTodayTitle: t.dueTodayReminderTitle,
        dueTomorrowTitle: t.dueTomorrowReminderTitle,
      })
    );
    showToast(t.checkRemindersNowButton, t.notificationsTitle, {
      type: 'notifications',
    });
  };

  // Resolve active item for main canvas
  const activeFolder =
    selectedNode.type === 'folder'
      ? workspace.folders.find((f) => f.id === selectedNode.id) || workspace.folders[0]
      : undefined;

  const activeProject =
    selectedNode.type === 'project'
      ? workspace.projects.find((p) => p.id === selectedNode.id) ||
        workspace.projects[0]
      : undefined;

  const activeTask =
    selectedNode.type === 'task'
      ? workspace.tasks.find((tsk) => tsk.id === selectedNode.id) || workspace.tasks[0]
      : undefined;

  const handleUnlockApp = () => {
    setSessionUnlocked(true);
    setIsUnlocked(true);
  };

  const handleLockApp = () => {
    setSessionUnlocked(false);
    setIsUnlocked(false);
  };

  if (!isUnlocked) {
    return (
      <AppLockScreen
        t={t}
        isRtl={isRtl}
        onUnlock={handleUnlockApp}
      />
    );
  }

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="h-dvh w-full max-w-[100vw] overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
    >
      {/* CLEAN MODERN TOP HEADER WITH GLOBAL SEARCH, NOTIFICATIONS, TRASH & SETTINGS */}
      <header className="shrink-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-2.5 py-2 sm:py-0 sm:px-6 sm:h-14 flex flex-wrap sm:flex-nowrap items-center justify-between gap-x-1.5 gap-y-2 sm:gap-3 w-full max-w-[100vw]">
        {/* Left / Start: Mobile menu button + App Brand */}
        <div className="order-1 flex items-center gap-1.5 sm:gap-3 min-w-0 shrink">
          <button
            type="button"
            data-testid="mobile-menu-btn"
            onClick={() => setIsMobileSidebarOpen(true)}
            aria-label={t.openMenu}
            className="lg:hidden h-8 w-8 sm:h-9 sm:w-9 shrink-0 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setSelectedNode({ type: 'dashboard' })}
              className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate max-w-[115px] xs:max-w-[160px] sm:max-w-none cursor-pointer font-display hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {t.appName}
            </button>
            <span className="hidden md:inline-block text-slate-300 dark:text-slate-700">|</span>
            <span className="hidden md:inline-block text-xs text-slate-500 dark:text-slate-400 font-normal truncate max-w-[200px] xl:max-w-none">
              {t.appSubtitle}
            </span>
          </div>

          <span className="hidden 2xl:inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 ms-1 shrink-0">
            {localFolderMeta.isConnected ? (
              <>
                <FolderOpen className="w-3.5 h-3.5" />
                <span>{localFolderMeta.folderName}</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span>{t.offlineSyncBadge}</span>
              </>
            )}
          </span>
        </div>

        {/* Center (Row 2 on <640px mobile, Center on >=640px): Global Workspace Search Bar */}
        <div
          ref={searchContainerRef}
          className="order-3 w-full sm:order-2 sm:w-auto sm:flex-1 sm:max-w-md sm:mx-auto relative min-w-0"
        >
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 pointer-events-none" />
            <input
              type="search"
              value={globalSearchQuery}
              onFocus={() => setIsSearchOpen(true)}
              onChange={(e) => {
                setGlobalSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              placeholder={t.globalSearchPlaceholder}
              aria-label={t.globalSearchPlaceholder}
              className="w-full h-8 sm:h-9 ps-9 pe-8 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-colors"
            />
            {globalSearchQuery && (
              <button
                type="button"
                onClick={() => {
                  setGlobalSearchQuery('');
                  setIsSearchOpen(false);
                }}
                aria-label={t.cancel}
                className="absolute end-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {isSearchOpen && globalSearchQuery.trim().length > 0 && (
            <div className="absolute start-0 end-0 top-10 sm:top-11 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                  {t.noSearchResults}
                </div>
              ) : (
                searchResults.map((res) => (
                  <button
                    key={res.id}
                    type="button"
                    onClick={() => {
                      setSelectedNode(res.node);
                      setIsSearchOpen(false);
                      setGlobalSearchQuery('');
                    }}
                    className="w-full px-3.5 py-2.5 text-start hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-start gap-2.5 transition-colors cursor-pointer"
                  >
                    <div className="mt-0.5 text-blue-600 dark:text-blue-400 shrink-0">
                      {res.type === 'folder' ? (
                        <Folder className="w-4 h-4" />
                      ) : res.type === 'project' ? (
                        <Layers className="w-4 h-4" />
                      ) : (
                        <CheckSquare className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {res.priority && (
                            <PriorityBadge priority={res.priority} t={t} size="xs" />
                          )}
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {res.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 shrink-0">
                          {res.type === 'folder'
                            ? t.folderTypeLabel
                            : res.type === 'project'
                              ? t.projectTypeLabel
                              : t.taskTypeLabel}
                        </span>
                      </div>
                      {res.subtitle && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {res.subtitle}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right / End: Lock + New Task (Notifications, Trash, Settings, Theme & Install App live in Side List & Settings) */}
        <div className="order-2 sm:order-3 flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Lock App Button */}
          <button
            type="button"
            data-testid="header-lock-btn"
            onClick={handleLockApp}
            aria-label={t.lockAppButton}
            title={t.lockAppButton}
            className="h-8 min-w-[32px] px-2 sm:h-9 sm:min-w-[36px] sm:px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 inline-flex items-center justify-center gap-1.5 text-xs font-medium transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden md:inline">{t.lockAppButton}</span>
          </button>

          {/* Primary Action: New Task */}
          <button
            type="button"
            data-testid="header-new-task-btn"
            onClick={() =>
              setNewTaskContext({
                isOpen: true,
                folderId: activeFolder?.id || activeProject?.folderId,
                projectId: activeProject?.id || activeTask?.projectId,
              })
            }
            aria-label={t.newTaskButton}
            className="h-8 px-2.5 sm:h-9 sm:px-3.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>{t.newTaskButton}</span>
          </button>
        </div>
      </header>

      {/* BODY: SIDE LIST + SINGLE FOCUSED MAIN VIEW */}
      <div className="flex-1 flex min-h-0 min-w-0 w-full overflow-hidden">
        {/* Desktop Persistent Side List (288px) */}
        <div className="hidden lg:block w-72 shrink-0 h-full overflow-hidden">
          <div className="h-full">
            <SidebarTree
              folders={workspace.folders}
              projects={workspace.projects}
              tasks={workspace.tasks}
              selectedNode={selectedNode}
              overallProgress={metrics.overallProgressPercent}
              trashCount={trashItems.length}
              unreadNotificationsCount={unreadNotificationsCount}
              lang={lang}
              t={t}
              onSelectNode={(node) => setSelectedNode(node)}
              onCreateFolder={handleCreateFolder}
              onUpdateFolder={handleUpdateFolder}
              onDeleteFolder={handleDeleteFolder}
              onCreateProject={handleCreateProject}
              onUpdateProject={handleUpdateProject}
              onDeleteProject={handleDeleteProject}
              onOpenNewTaskForProject={(folderId, projectId) =>
                setNewTaskContext({ isOpen: true, folderId, projectId })
              }
              onDeleteTask={handleDeleteTask}
            />
          </div>
        </div>

        {/* Mobile Slide-Over Side List Drawer */}
        {isMobileSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex">
            <div className="w-80 max-w-[85vw] h-full bg-white dark:bg-slate-900 flex flex-col">
              <div className="h-12 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t.sidebarTitle}
                </span>
                <button
                  type="button"
                  onClick={() => setIsMobileSidebarOpen(false)}
                  aria-label={t.closeMenu}
                  className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <SidebarTree
                  folders={workspace.folders}
                  projects={workspace.projects}
                  tasks={workspace.tasks}
                  selectedNode={selectedNode}
                  overallProgress={metrics.overallProgressPercent}
                  trashCount={trashItems.length}
                  unreadNotificationsCount={unreadNotificationsCount}
                  lang={lang}
                  t={t}
                  onSelectNode={(node) => {
                    setSelectedNode(node);
                    setIsMobileSidebarOpen(false);
                  }}
                  onCreateFolder={handleCreateFolder}
                  onUpdateFolder={handleUpdateFolder}
                  onDeleteFolder={handleDeleteFolder}
                  onCreateProject={handleCreateProject}
                  onUpdateProject={handleUpdateProject}
                  onDeleteProject={handleDeleteProject}
                  onOpenNewTaskForProject={(folderId, projectId) => {
                    setIsMobileSidebarOpen(false);
                    setNewTaskContext({ isOpen: true, folderId, projectId });
                  }}
                  onDeleteTask={handleDeleteTask}
                />
              </div>
            </div>
          </div>
        )}

        {/* FOCUSED MAIN CANVAS */}
        <main
          key={`${selectedNode.type}-${'id' in selectedNode ? selectedNode.id : 'root'}`}
          className="flex-1 min-w-0 min-h-0 w-full max-w-full px-3 sm:px-6 lg:px-8 pt-3.5 sm:pt-6 pb-20 lg:pb-8 overflow-y-auto overflow-x-hidden overscroll-y-contain"
        >
          {selectedNode.type === 'settings' && (
            <SettingsView
              workspace={workspace}
              lang={lang}
              t={t}
              darkMode={isDarkMode}
              syncMeta={syncMeta}
              localFolderMeta={localFolderMeta}
              onUpdateLocalFolderMeta={setLocalFolderMeta}
              onSelectLanguage={setLang}
              onToggleDarkMode={() => setIsDarkMode((d) => !d)}
              onSetDarkMode={(dark) => setIsDarkMode(dark)}
              onRestoreWorkspace={(nextState, options) => {
                const normalizedReplacement: WorkspaceState = {
                  folders: nextState.folders,
                  projects: nextState.projects,
                  tasks: nextState.tasks,
                  trash: Array.isArray(nextState.trash) ? nextState.trash : [],
                  notifications: Array.isArray(nextState.notifications)
                    ? nextState.notifications
                    : [],
                };
                commitWorkspace(() => normalizedReplacement, options);
              }}
              onResetDefaultWorkspace={handleResetDefaultWorkspaceWithConfirm}
              onLockApp={handleLockApp}
            />
          )}

          {selectedNode.type === 'trash' && (
            <TrashView
              trashItems={trashItems}
              t={t}
              onRestoreItem={handleRestoreTrashItem}
              onDeleteItemPermanently={handleDeleteTrashItemPermanently}
              onEmptyTrash={handleEmptyTrash}
            />
          )}

          {selectedNode.type === 'notifications' && (
            <NotificationCenter
              notifications={notifications}
              t={t}
              onSelectNotification={handleSelectNotification}
              onMarkAllRead={handleMarkAllNotificationsRead}
              onClearAll={handleClearAllNotifications}
              onScanRemindersNow={handleScanRemindersNow}
              onNavigate={setSelectedNode}
            />
          )}

          {selectedNode.type === 'dashboard' && (
            <DashboardView
              projects={workspace.projects}
              tasks={workspace.tasks}
              metrics={metrics}
              lang={lang}
              t={t}
              onSelectNode={setSelectedNode}
            />
          )}

          {selectedNode.type === 'folder' && activeFolder && (
            <FolderDetailView
              folder={activeFolder}
              projects={workspace.projects.filter(
                (p) => p.folderId === activeFolder.id
              )}
              tasks={workspace.tasks}
              lang={lang}
              t={t}
              onSelectNode={setSelectedNode}
              onUpdateFolder={handleUpdateFolder}
              onDeleteFolder={handleDeleteFolder}
              onCreateProject={handleCreateProject}
              onUpdateProject={handleUpdateProject}
              onDeleteProject={handleDeleteProject}
            />
          )}

          {selectedNode.type === 'project' && activeProject && (
            <ProjectDetailView
              project={activeProject}
              parentFolder={workspace.folders.find(
                (f) => f.id === activeProject.folderId
              )}
              tasks={workspace.tasks.filter(
                (tsk) => tsk.projectId === activeProject.id
              )}
              lang={lang}
              t={t}
              onSelectNode={setSelectedNode}
              onUpdateProject={handleUpdateProject}
              onDeleteProject={handleDeleteProject}
              onOpenNewTaskModal={() =>
                setNewTaskContext({
                  isOpen: true,
                  folderId: activeProject.folderId,
                  projectId: activeProject.id,
                })
              }
              onUpdateTaskMeta={handleUpdateTaskMeta}
              onDeleteTask={handleDeleteTask}
            />
          )}

          {selectedNode.type === 'task' && activeTask && (
            <TaskDetailPanel
              task={activeTask}
              parentProject={workspace.projects.find(
                (p) => p.id === activeTask.projectId
              )}
              lang={lang}
              t={t}
              onBackToProject={
                activeTask.projectId
                  ? () =>
                      setSelectedNode({
                        type: 'project',
                        id: activeTask.projectId!,
                      })
                  : undefined
              }
              onAddTodo={handleAddTodo}
              onEditTodo={handleEditTodo}
              onToggleTodo={handleToggleTodo}
              onDeleteTodo={handleDeleteTodo}
              onAddSubTodo={handleAddSubTodo}
              onToggleSubTodo={handleToggleSubTodo}
              onEditSubTodo={handleEditSubTodo}
              onDeleteSubTodo={handleDeleteSubTodo}
              onAddPhotoToTodo={handleAddPhotoToTodo}
              onDeletePhotoFromTodo={handleDeletePhotoFromTodo}
              onAddUpdate={handleAddUpdate}
              onEditUpdate={handleEditUpdate}
              onDeleteUpdate={handleDeleteUpdate}
              onAddPhotoToUpdate={handleAddPhotoToUpdate}
              onDeletePhotoFromUpdate={handleDeletePhotoFromUpdate}
              onAddAttachment={handleAddAttachment}
              onEditAttachment={handleEditAttachment}
              onDeleteAttachment={handleDeleteAttachment}
              onAnnotatePhoto={handleAnnotatePhoto}
              onUpdateTaskMeta={handleUpdateTaskMeta}
              onDeleteTask={handleDeleteTask}
            />
          )}
        </main>
      </div>

      {/* LIVE FLOATING NOTIFICATION TOAST BANNER */}
      {liveToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-18 lg:bottom-5 inset-x-3 sm:inset-x-auto sm:end-4 z-40 sm:max-w-sm bg-slate-900 dark:bg-slate-800 text-white border border-slate-700 rounded-xl shadow-xl p-3 flex items-start gap-3"
        >
          <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
            <Bell className="w-4 h-4" />
          </div>
          <div
            onClick={() => {
              if (liveToast.targetNode) {
                setSelectedNode(liveToast.targetNode);
              }
              setLiveToast(null);
            }}
            className="min-w-0 flex-1 cursor-pointer"
          >
            <div className="text-xs font-bold text-white truncate">
              {liveToast.title}
            </div>
            <div className="text-[11px] text-slate-300 truncate mt-0.5">
              {liveToast.message}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLiveToast(null)}
            aria-label={t.cancel}
            className="p-1 text-slate-400 hover:text-white rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* MOBILE & TABLET FIXED BOTTOM THUMB-ZONE NAVIGATION BAR (< 1024px) */}
      <nav
        aria-label={t.sidebarTitle}
        className="lg:hidden shrink-0 z-40 h-15 w-full max-w-[100vw] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-5 items-center px-1"
      >
        <button
          type="button"
          data-testid="mobile-nav-dashboard"
          onClick={() => {
            setIsMobileSidebarOpen(false);
            setSelectedNode({ type: 'dashboard' });
          }}
          className={`flex flex-col items-center justify-center min-h-[48px] rounded-xl transition-colors cursor-pointer ${
            selectedNode.type === 'dashboard' && !isMobileSidebarOpen
              ? 'text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] mt-1 truncate max-w-[64px]">{t.navDashboard}</span>
        </button>

        <button
          type="button"
          data-testid="mobile-nav-workspace"
          onClick={() => setIsMobileSidebarOpen((v) => !v)}
          className={`flex flex-col items-center justify-center min-h-[48px] rounded-xl transition-colors cursor-pointer ${
            isMobileSidebarOpen ||
            selectedNode.type === 'folder' ||
            selectedNode.type === 'project' ||
            selectedNode.type === 'task'
              ? 'text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FolderKanban className="w-5 h-5" />
          <span className="text-[10px] mt-1 truncate max-w-[64px]">{t.navWorkspace}</span>
        </button>

        <button
          type="button"
          data-testid="mobile-nav-new-task"
          onClick={() => {
            setIsMobileSidebarOpen(false);
            setNewTaskContext({
              isOpen: true,
              folderId: activeFolder?.id || activeProject?.folderId,
              projectId: activeProject?.id || activeTask?.projectId,
            });
          }}
          className="flex flex-col items-center justify-center min-h-[48px] rounded-xl text-blue-600 dark:text-blue-400 font-semibold cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Plus className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-0.5 truncate max-w-[64px]">{t.navNewTask}</span>
        </button>

        <button
          type="button"
          data-testid="mobile-nav-notifications"
          onClick={() => {
            setIsMobileSidebarOpen(false);
            setSelectedNode({ type: 'notifications' });
          }}
          className={`relative flex flex-col items-center justify-center min-h-[48px] rounded-xl transition-colors cursor-pointer ${
            selectedNode.type === 'notifications' && !isMobileSidebarOpen
              ? 'text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Bell className="w-5 h-5" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1.5 end-3 w-2 h-2 rounded-full bg-blue-600" />
          )}
          <span className="text-[10px] mt-1 truncate max-w-[64px]">{t.notificationsNav}</span>
        </button>

        <button
          type="button"
          data-testid="mobile-nav-settings"
          onClick={() => {
            setIsMobileSidebarOpen(false);
            setSelectedNode({ type: 'settings' });
          }}
          className={`flex flex-col items-center justify-center min-h-[48px] rounded-xl transition-colors cursor-pointer ${
            selectedNode.type === 'settings' && !isMobileSidebarOpen
              ? 'text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] mt-1 truncate max-w-[64px]">{t.navSettings}</span>
        </button>
      </nav>

      {/* New Task Modal */}
      <NewTaskModal
        isOpen={newTaskContext.isOpen}
        folders={workspace.folders}
        projects={workspace.projects}
        defaultFolderId={newTaskContext.folderId}
        defaultProjectId={newTaskContext.projectId}
        lang={lang}
        t={t}
        onClose={() => setNewTaskContext({ isOpen: false })}
        onCreateTask={handleCreateTask}
      />

      {/* Global Confirm Delete Modal for all app items */}
      <ConfirmDeleteModal
        state={confirmDeleteState}
        t={t}
        onCancel={() => setConfirmDeleteState(null)}
      />
    </div>
  );
}
