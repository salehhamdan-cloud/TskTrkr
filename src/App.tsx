import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  CheckSquare,
  Folder,
  FolderKanban,
  Layers,
  Lock,
  Menu,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  Wifi,
  X,
} from 'lucide-react';
import {
  LanguageCode,
  PhotoTargetRef,
  SelectedSidebarNode,
  TaskAttachment,
  TaskItem,
  WorkspaceState,
} from './types/task';
import { TRANSLATIONS } from './i18n/translations';
import {
  addAttachmentToTask,
  addPhotoToTodoInTask,
  addPhotoToUpdateInTask,
  addSubTodoToTask,
  addTodoToTask,
  addUpdateToTask,
  annotatePhotoInTask,
  computeProjectMetrics,
  createFolder,
  createProject,
  deriveTaskStatus,
  editAttachmentInTask,
  editSubTodoInTask,
  editTodoInTask,
  editUpdateInTask,
  removeFolder,
  removePhotoFromTodoInTask,
  removePhotoFromUpdateInTask,
  removeProject,
  removeSubTodoFromTask,
  removeTodoFromTask,
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
import { SidebarTree } from './components/SidebarTree';
import { FolderDetailView } from './components/FolderDetailView';
import { ProjectDetailView } from './components/ProjectDetailView';
import { TaskDetailPanel } from './components/TaskDetailPanel';
import { DashboardView } from './components/DashboardView';
import { SettingsView } from './components/SettingsView';
import { NewTaskModal } from './components/NewTaskModal';
import { PriorityBadge } from './components/PriorityBadge';
import { PWAInstallButton } from './components/PWAInstallButton';
import { AppLockScreen } from './components/AppLockScreen';

export default function App() {
  const [workspace, setWorkspace] = useState<WorkspaceState>(() =>
    loadWorkspaceFromLocalStorage()
  );
  const [syncMeta, setSyncMeta] = useState<OfflineSyncMeta>(() => loadSyncMeta());
  const [lang, setLangState] = useState<LanguageCode>(() => loadSavedLanguage());
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

  const t = TRANSLATIONS[lang];
  const isRtl = lang === 'ar' || lang === 'he';

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

  const commitWorkspace = (updater: (prev: WorkspaceState) => WorkspaceState) => {
    setWorkspace((prev) => {
      const next = updater(prev);
      const nextMeta = saveWorkspaceToLocalStorage(next, syncMeta);
      setSyncMeta(nextMeta);
      return next;
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

  // Folder CRUD
  const handleCreateFolder = (name: string) => {
    commitWorkspace((prev) => {
      const res = createFolder(prev, name);
      if (res.createdFolder) {
        setSelectedNode({ type: 'folder', id: res.createdFolder.id });
      }
      return res.state;
    });
  };

  const handleUpdateFolder = (folderId: string, name: string) => {
    commitWorkspace((prev) => updateFolder(prev, folderId, name));
  };

  const handleDeleteFolder = (folderId: string) => {
    commitWorkspace((prev) => {
      const next = removeFolder(prev, folderId);
      if (selectedNode.type === 'folder' && selectedNode.id === folderId) {
        if (next.folders[0]) {
          setSelectedNode({ type: 'folder', id: next.folders[0].id });
        } else {
          setSelectedNode({ type: 'dashboard' });
        }
      }
      return next;
    });
  };

  // Project CRUD
  const handleCreateProject = (
    folderId: string,
    name: string,
    description = ''
  ) => {
    commitWorkspace((prev) => {
      const res = createProject(prev, folderId, name, description);
      if (res.createdProject) {
        setSelectedNode({ type: 'project', id: res.createdProject.id });
      }
      return res.state;
    });
  };

  const handleUpdateProject = (
    projectId: string,
    patch: { name?: string; description?: string }
  ) => {
    commitWorkspace((prev) => updateProject(prev, projectId, patch));
  };

  const handleDeleteProject = (projectId: string) => {
    const targetProj = workspace.projects.find((p) => p.id === projectId);
    commitWorkspace((prev) => {
      const next = removeProject(prev, projectId);
      if (selectedNode.type === 'project' && selectedNode.id === projectId) {
        if (targetProj) {
          setSelectedNode({ type: 'folder', id: targetProj.folderId });
        } else {
          setSelectedNode({ type: 'dashboard' });
        }
      }
      return next;
    });
  };

  // Task CRUD
  const handleCreateTask = (newTask: TaskItem) => {
    commitWorkspace((prev) => ({
      ...prev,
      tasks: [newTask, ...prev.tasks],
    }));
    setSelectedNode({ type: 'task', id: newTask.id });
  };

  const handleUpdateTaskMeta = (
    taskId: string,
    patch: Partial<
      Pick<
        TaskItem,
        'status' | 'priority' | 'manualProgress' | 'dueDate' | 'title' | 'description'
      >
    >
  ) => {
    commitWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((tsk) => {
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
        return updated;
      }),
    }));
  };

  const handleDeleteTask = (taskId: string) => {
    const targetTask = workspace.tasks.find((tsk) => tsk.id === taskId);
    commitWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((tsk) => tsk.id !== taskId),
    }));
    if (selectedNode.type === 'task' && selectedNode.id === taskId) {
      if (targetTask?.projectId) {
        setSelectedNode({ type: 'project', id: targetTask.projectId });
      } else {
        setSelectedNode({ type: 'dashboard' });
      }
    }
  };

  // Nested To-Do CRUD + To-Do Photos
  const handleAddTodo = (
    taskId: string,
    title: string,
    photos?: Omit<TaskAttachment, 'id' | 'addedAt'>[]
  ) => {
    commitWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((tsk) =>
        tsk.id === taskId ? addTodoToTask(tsk, title, photos) : tsk
      ),
    }));
  };

  const handleAddPhotoToTodo = (
    taskId: string,
    todoId: string,
    photo: Omit<TaskAttachment, 'id' | 'addedAt'>
  ) => {
    commitWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((tsk) =>
        tsk.id === taskId ? addPhotoToTodoInTask(tsk, todoId, photo) : tsk
      ),
    }));
  };

  const handleDeletePhotoFromTodo = (
    taskId: string,
    todoId: string,
    photoId: string
  ) => {
    commitWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((tsk) =>
        tsk.id === taskId ? removePhotoFromTodoInTask(tsk, todoId, photoId) : tsk
      ),
    }));
  };

  const handleEditTodo = (taskId: string, todoId: string, newTitle: string) => {
    commitWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((tsk) =>
        tsk.id === taskId ? editTodoInTask(tsk, todoId, newTitle) : tsk
      ),
    }));
  };

  const handleToggleTodo = (taskId: string, todoId: string) => {
    commitWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((tsk) =>
        tsk.id === taskId ? toggleTodoInTask(tsk, todoId) : tsk
      ),
    }));
  };

  const handleDeleteTodo = (taskId: string, todoId: string) => {
    commitWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((tsk) =>
        tsk.id === taskId ? removeTodoFromTask(tsk, todoId) : tsk
      ),
    }));
  };

  const handleAddSubTodo = (taskId: string, todoId: string, title: string) => {
    commitWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((tsk) =>
        tsk.id === taskId ? addSubTodoToTask(tsk, todoId, title) : tsk
      ),
    }));
  };

  const handleToggleSubTodo = (taskId: string, todoId: string, subTodoId: string) => {
    commitWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((tsk) =>
        tsk.id === taskId ? toggleSubTodoInTask(tsk, todoId, subTodoId) : tsk
      ),
    }));
  };

  const handleEditSubTodo = (
    taskId: string,
    todoId: string,
    subTodoId: string,
    newTitle: string
  ) => {
    commitWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((tsk) =>
        tsk.id === taskId ? editSubTodoInTask(tsk, todoId, subTodoId, newTitle) : tsk
      ),
    }));
  };

  const handleDeleteSubTodo = (taskId: string, todoId: string, subTodoId: string) => {
    commitWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((tsk) =>
        tsk.id === taskId ? removeSubTodoFromTask(tsk, todoId, subTodoId) : tsk
      ),
    }));
  };

  // Task Updates CRUD + Update Photos
  const handleAddUpdate = (
    taskId: string,
    update: {
      content: string;
      timestamp: string;
      author: string;
      photos?: Omit<TaskAttachment, 'id' | 'addedAt'>[];
    }
  ) => {
    commitWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((tsk) =>
        tsk.id === taskId ? addUpdateToTask(tsk, update) : tsk
      ),
    }));
  };

  const handleAddPhotoToUpdate = (
    taskId: string,
    updateId: string,
    photo: Omit<TaskAttachment, 'id' | 'addedAt'>
  ) => {
    commitWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((tsk) =>
        tsk.id === taskId ? addPhotoToUpdateInTask(tsk, updateId, photo) : tsk
      ),
    }));
  };

  const handleDeletePhotoFromUpdate = (
    taskId: string,
    updateId: string,
    photoId: string
  ) => {
    commitWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((tsk) =>
        tsk.id === taskId
          ? removePhotoFromUpdateInTask(tsk, updateId, photoId)
          : tsk
      ),
    }));
  };

  const handleEditUpdate = (
    taskId: string,
    updateId: string,
    patch: { content: string; timestamp?: string; author?: string }
  ) => {
    commitWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((tsk) =>
        tsk.id === taskId ? editUpdateInTask(tsk, updateId, patch) : tsk
      ),
    }));
  };

  const handleDeleteUpdate = (taskId: string, updateId: string) => {
    commitWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((tsk) =>
        tsk.id === taskId
          ? {
              ...tsk,
              updates: tsk.updates.filter((u) => u.id !== updateId),
              updatedAt: new Date().toISOString(),
            }
          : tsk
      ),
    }));
  };

  // Attachments CRUD + Cross-Section Photo Annotation
  const handleAddAttachment = (
    taskId: string,
    attachment: Omit<TaskAttachment, 'id' | 'addedAt'>
  ) => {
    commitWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((tsk) =>
        tsk.id === taskId ? addAttachmentToTask(tsk, attachment) : tsk
      ),
    }));
  };

  const handleEditAttachment = (
    taskId: string,
    attachmentId: string,
    patch: { name?: string; caption?: string }
  ) => {
    commitWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((tsk) =>
        tsk.id === taskId
          ? editAttachmentInTask(tsk, attachmentId, patch)
          : tsk
      ),
    }));
  };

  const handleDeleteAttachment = (taskId: string, attachmentId: string) => {
    commitWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((tsk) =>
        tsk.id === taskId
          ? {
              ...tsk,
              attachments: tsk.attachments.filter((a) => a.id !== attachmentId),
              updatedAt: new Date().toISOString(),
            }
          : tsk
      ),
    }));
  };

  const handleAnnotatePhoto = (
    taskId: string,
    target: PhotoTargetRef,
    annotatedDataUrl: string,
    caption?: string
  ) => {
    commitWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((tsk) =>
        tsk.id === taskId
          ? annotatePhotoInTask(tsk, target, annotatedDataUrl, caption)
          : tsk
      ),
    }));
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
      className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
    >
      {/* CLEAN MODERN TOP HEADER WITH GLOBAL SEARCH & SETTINGS ICON */}
      <header className="sticky top-0 z-30 h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-3">
        {/* Left / Start: Mobile menu button + App Brand */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            aria-label={t.openMenu}
            className="lg:hidden min-h-[40px] min-w-[40px] flex items-center justify-center -ms-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedNode({ type: 'dashboard' })}
              className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap cursor-pointer font-display hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {t.appName}
            </button>
            <span className="hidden md:inline-block text-slate-300 dark:text-slate-700">|</span>
            <span className="hidden md:inline-block text-xs text-slate-500 dark:text-slate-400 font-normal truncate max-w-[200px] xl:max-w-none">
              {t.appSubtitle}
            </span>
          </div>

          <span className="hidden 2xl:inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 ms-1">
            <Wifi className="w-3.5 h-3.5" />
            <span>{t.offlineSyncBadge}</span>
          </span>
        </div>

        {/* Center: Global Workspace Search Bar */}
        <div
          ref={searchContainerRef}
          className="relative flex-1 max-w-md mx-auto"
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
              className="w-full h-9 ps-9 pe-8 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-colors"
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
            <div className="absolute start-0 end-0 top-11 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
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

        {/* Right / End: PWA Install + Settings Button + Theme Toggle + New Task CTA */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <PWAInstallButton t={t} variant="compact" />

          {/* Settings Page Icon Button */}
          <button
            type="button"
            data-testid="header-settings-btn"
            onClick={() => setSelectedNode({ type: 'settings' })}
            aria-label={t.settingsNav}
            title={t.settingsNav}
            className={`h-9 min-w-[36px] px-2.5 rounded-lg border inline-flex items-center justify-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
              selectedNode.type === 'settings'
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="hidden xl:inline">{t.settingsNav}</span>
          </button>

          {/* Dark / Light Theme Button */}
          <button
            type="button"
            data-testid="header-theme-btn"
            onClick={() => setIsDarkMode((d) => !d)}
            aria-label={isDarkMode ? t.lightTheme : t.darkTheme}
            className="h-9 min-w-[36px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-1.5 text-xs font-medium cursor-pointer"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="hidden xl:inline">
              {isDarkMode ? t.lightTheme : t.darkTheme}
            </span>
          </button>

          {/* Lock App Button */}
          <button
            type="button"
            data-testid="header-lock-btn"
            onClick={handleLockApp}
            aria-label={t.lockAppButton}
            title={t.lockAppButton}
            className="h-9 min-w-[36px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 inline-flex items-center justify-center gap-1.5 text-xs font-medium transition-colors cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span className="hidden xl:inline">{t.lockAppButton}</span>
          </button>

          {/* Primary Action: New Task */}
          <button
            type="button"
            onClick={() =>
              setNewTaskContext({
                isOpen: true,
                folderId: activeFolder?.id || activeProject?.folderId,
                projectId: activeProject?.id || activeTask?.projectId,
              })
            }
            className="h-9 px-2.5 sm:px-3.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t.newTaskButton}</span>
          </button>
        </div>
      </header>

      {/* BODY: SIDE LIST + SINGLE FOCUSED MAIN VIEW */}
      <div className="flex-1 flex min-h-0">
        {/* Desktop Persistent Side List (288px) */}
        <div className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-14 h-[calc(100vh-3.5rem)]">
            <SidebarTree
              folders={workspace.folders}
              projects={workspace.projects}
              tasks={workspace.tasks}
              selectedNode={selectedNode}
              overallProgress={metrics.overallProgressPercent}
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

        {/* FOCUSED MAIN CANVAS: Renders ONLY the item selected from the side list or Settings */}
        <main className="flex-1 min-w-0 px-3.5 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-24 lg:pb-8 overflow-y-auto">
          {selectedNode.type === 'settings' && (
            <SettingsView
              workspace={workspace}
              lang={lang}
              t={t}
              darkMode={isDarkMode}
              syncMeta={syncMeta}
              onSelectLanguage={setLang}
              onToggleDarkMode={() => setIsDarkMode((d) => !d)}
              onSetDarkMode={(dark) => setIsDarkMode(dark)}
              onRestoreWorkspace={(nextState) => {
                commitWorkspace(() => nextState);
              }}
              onResetDefaultWorkspace={() => {
                commitWorkspace(() => getDefaultWorkspaceState());
              }}
              onLockApp={handleLockApp}
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

      {/* MOBILE & TABLET FIXED BOTTOM THUMB-ZONE NAVIGATION BAR (< 1024px) */}
      <nav
        aria-label={t.sidebarTitle}
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-4 items-center px-2"
      >
        <button
          type="button"
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
          <span className="text-[10px] mt-1 truncate max-w-[72px]">{t.navDashboard}</span>
        </button>

        <button
          type="button"
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
          <span className="text-[10px] mt-1 truncate max-w-[72px]">{t.navWorkspace}</span>
        </button>

        <button
          type="button"
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
          <span className="text-[10px] mt-0.5 truncate max-w-[72px]">{t.navNewTask}</span>
        </button>

        <button
          type="button"
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
          <span className="text-[10px] mt-1 truncate max-w-[72px]">{t.navSettings}</span>
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
    </div>
  );
}

