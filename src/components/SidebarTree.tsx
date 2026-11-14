import React, { useState } from 'react';
import {
  BarChart3,
  Bell,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderPlus,
  Layers,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  FolderItem,
  LanguageCode,
  ProjectGroupItem,
  SelectedSidebarNode,
  TaskItem,
} from '../types/task';
import {
  resolveLocalizedText,
  TranslationDictionary,
} from '../i18n/translations';
import { calculateTaskProgress } from '../utils/taskLogic';

interface SidebarTreeProps {
  folders: FolderItem[];
  projects: ProjectGroupItem[];
  tasks: TaskItem[];
  selectedNode: SelectedSidebarNode;
  overallProgress: number;
  trashCount?: number;
  unreadNotificationsCount?: number;
  lang: LanguageCode;
  t: TranslationDictionary;
  onSelectNode: (node: SelectedSidebarNode) => void;
  onCreateFolder: (name: string) => void;
  onUpdateFolder: (folderId: string, name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onCreateProject: (folderId: string, name: string, description?: string) => void;
  onUpdateProject: (projectId: string, patch: { name?: string; description?: string }) => void;
  onDeleteProject: (projectId: string) => void;
  onOpenNewTaskForProject: (folderId: string, projectId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

export const SidebarTree: React.FC<SidebarTreeProps> = ({
  folders,
  projects,
  tasks,
  selectedNode,
  overallProgress,
  trashCount = 0,
  unreadNotificationsCount = 0,
  lang,
  t,
  onSelectNode,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onOpenNewTaskForProject,
  onDeleteTask,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    folders.forEach((f) => {
      map[f.id] = true;
    });
    return map;
  });

  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    projects.forEach((p) => {
      map[p.id] = true;
    });
    return map;
  });

  // Add folder inline state
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Edit folder inline state
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');

  // Add project inline state per folder
  const [addingProjectForFolderId, setAddingProjectForFolderId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');

  // Edit project inline state
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');

  const toggleFolderExpand = (folderId: string) => {
    setExpandedFolders((prev) => ({ ...prev, [folderId]: !(prev[folderId] ?? true) }));
  };

  const toggleProjectExpand = (projectId: string) => {
    setExpandedProjects((prev) => ({ ...prev, [projectId]: !(prev[projectId] ?? true) }));
  };

  const handleAddFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    onCreateFolder(newFolderName.trim());
    setNewFolderName('');
    setIsAddingFolder(false);
  };

  const handleSaveFolderEdit = (folderId: string) => {
    if (editingFolderName.trim()) {
      onUpdateFolder(folderId, editingFolderName.trim());
    }
    setEditingFolderId(null);
  };

  const handleAddProjectSubmit = (e: React.FormEvent, folderId: string) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    onCreateProject(folderId, newProjectName.trim());
    setNewProjectName('');
    setAddingProjectForFolderId(null);
    setExpandedFolders((prev) => ({ ...prev, [folderId]: true }));
  };

  const handleSaveProjectEdit = (projectId: string) => {
    if (editingProjectName.trim()) {
      onUpdateProject(projectId, { name: editingProjectName.trim() });
    }
    setEditingProjectId(null);
  };

  return (
    <aside
      aria-label={t.sidebarTitle}
      className="w-full h-full flex flex-col bg-white dark:bg-slate-900 border-e border-slate-200 dark:border-slate-800 select-none"
    >
      {/* Top Dashboard, Notifications & Trash Navigation Items */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800 space-y-1">
        <button
          type="button"
          onClick={() => onSelectNode({ type: 'dashboard' })}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            selectedNode.type === 'dashboard'
              ? 'bg-blue-600 text-white'
              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span className="inline-flex items-center gap-2.5 truncate">
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span className="truncate">{t.dashboardNav}</span>
          </span>
          <span
            className={`font-mono tabular-nums text-[11px] ${
              selectedNode.type === 'dashboard'
                ? 'text-blue-100'
                : 'text-blue-600 dark:text-blue-400'
            }`}
          >
            {overallProgress}%
          </span>
        </button>

        <button
          type="button"
          data-testid="sidebar-notifications-btn"
          onClick={() => onSelectNode({ type: 'notifications' })}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            selectedNode.type === 'notifications'
              ? 'bg-blue-600 text-white'
              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span className="inline-flex items-center gap-2.5 truncate">
            <Bell className="w-4 h-4 shrink-0" />
            <span className="truncate">{t.notificationsNav}</span>
          </span>
          {unreadNotificationsCount > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded-md font-mono tabular-nums text-[10px] font-bold ${
                selectedNode.type === 'notifications'
                  ? 'bg-white/20 text-white'
                  : 'bg-blue-600 text-white'
              }`}
            >
              {unreadNotificationsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          data-testid="sidebar-trash-btn"
          onClick={() => onSelectNode({ type: 'trash' })}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            selectedNode.type === 'trash'
              ? 'bg-rose-600 text-white'
              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span className="inline-flex items-center gap-2.5 truncate">
            <Trash2 className="w-4 h-4 shrink-0" />
            <span className="truncate">{t.trashNav}</span>
          </span>
          <span
            className={`px-1.5 py-0.5 rounded-md font-mono tabular-nums text-[10px] font-semibold ${
              selectedNode.type === 'trash'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            {trashCount}
          </span>
        </button>
      </div>

      {/* Folders Header + Add Folder Action */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
          {t.foldersHeader}
        </span>
        <button
          type="button"
          onClick={() => setIsAddingFolder((v) => !v)}
          aria-label={t.addFolder}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span>{t.addFolder}</span>
        </button>
      </div>

      {/* Inline Add Folder Input */}
      {isAddingFolder && (
        <form onSubmit={handleAddFolderSubmit} className="px-3 pb-2 flex items-center gap-1.5">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder={t.folderNamePlaceholder}
            aria-label={t.folderNamePlaceholder}
            autoFocus
            className="flex-1 h-8 px-2.5 text-xs rounded-lg border border-blue-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
          />
          <button
            type="submit"
            aria-label={t.create}
            className="h-8 px-2.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 cursor-pointer"
          >
            {t.create}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAddingFolder(false);
              setNewFolderName('');
            }}
            aria-label={t.cancel}
            className="p-1.5 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      )}

      {/* Scrollable Hierarchy Tree: Folders -> Projects -> Tasks */}
      <div className="flex-1 overflow-y-auto px-2.5 pb-6 space-y-1.5">
        {folders.map((folder) => {
          const isFolderExpanded = expandedFolders[folder.id] ?? true;
          const isFolderSelected =
            selectedNode.type === 'folder' && selectedNode.id === folder.id;
          const folderProjects = projects.filter((p) => p.folderId === folder.id);
          const folderDisplayName = resolveLocalizedText(
            folder.name,
            folder.localizedName,
            lang
          );

          return (
            <div key={folder.id} className="space-y-1">
              {/* Folder Row */}
              {editingFolderId === folder.id ? (
                <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <input
                    type="text"
                    value={editingFolderName}
                    onChange={(e) => setEditingFolderName(e.target.value)}
                    aria-label={t.editFolder}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveFolderEdit(folder.id);
                      if (e.key === 'Escape') setEditingFolderId(null);
                    }}
                    className="flex-1 h-7 px-2 text-xs rounded border border-blue-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveFolderEdit(folder.id)}
                    aria-label={t.saveChanges}
                    className="p-1 text-emerald-600 hover:text-emerald-700"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingFolderId(null)}
                    aria-label={t.cancel}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  className={`group flex items-center justify-between rounded-xl px-2 py-1.5 transition-colors ${
                    isFolderSelected
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => toggleFolderExpand(folder.id)}
                      aria-label={`Toggle folder ${folderDisplayName}`}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded"
                    >
                      {isFolderExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectNode({ type: 'folder', id: folder.id })}
                      className="flex items-center gap-2 min-w-0 flex-1 text-start py-0.5 text-xs font-semibold cursor-pointer"
                    >
                      <Folder className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="truncate">{folderDisplayName}</span>
                    </button>
                  </div>

                  {/* Folder Quick Actions: Add Project, Edit Folder, Delete Folder */}
                  <div className="flex items-center gap-0.5 shrink-0 opacity-85 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => {
                        setAddingProjectForFolderId(folder.id);
                        setExpandedFolders((prev) => ({ ...prev, [folder.id]: true }));
                      }}
                      title={t.addProject}
                      aria-label={`${t.addProject} (${folderDisplayName})`}
                      className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingFolderId(folder.id);
                        setEditingFolderName(folderDisplayName);
                      }}
                      title={t.editFolder}
                      aria-label={`${t.editFolder} ${folderDisplayName}`}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteFolder(folder.id)}
                      title={t.deleteFolder}
                      aria-label={`${t.deleteFolder} ${folderDisplayName}`}
                      className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Inline Add Project inside this Folder */}
              {addingProjectForFolderId === folder.id && (
                <form
                  onSubmit={(e) => handleAddProjectSubmit(e, folder.id)}
                  className="ms-5 pe-1 py-1 flex items-center gap-1"
                >
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder={t.projectNamePlaceholder}
                    aria-label={t.projectNamePlaceholder}
                    autoFocus
                    className="flex-1 h-7 px-2 text-xs rounded border border-blue-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="submit"
                    className="h-7 px-2 bg-blue-600 text-white text-[11px] font-medium rounded"
                  >
                    {t.create}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddingProjectForFolderId(null);
                      setNewProjectName('');
                    }}
                    aria-label={t.cancel}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}

              {/* Nested Projects inside Folder */}
              {isFolderExpanded && (
                <div className="ms-4 ps-2 border-s border-slate-200 dark:border-slate-800 space-y-1">
                  {folderProjects.map((project) => {
                    const isProjectExpanded = expandedProjects[project.id] ?? true;
                    const isProjectSelected =
                      selectedNode.type === 'project' && selectedNode.id === project.id;
                    const projectTasks = tasks.filter((tsk) => tsk.projectId === project.id);
                    const projectDisplayName = resolveLocalizedText(
                      project.name,
                      project.localizedName,
                      lang
                    );

                    return (
                      <div key={project.id} className="space-y-0.5">
                        {editingProjectId === project.id ? (
                          <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            <input
                              type="text"
                              value={editingProjectName}
                              onChange={(e) => setEditingProjectName(e.target.value)}
                              aria-label={t.editProject}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveProjectEdit(project.id);
                                if (e.key === 'Escape') setEditingProjectId(null);
                              }}
                              className="flex-1 h-7 px-2 text-xs rounded border border-blue-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveProjectEdit(project.id)}
                              aria-label={t.saveChanges}
                              className="p-1 text-emerald-600"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingProjectId(null)}
                              aria-label={t.cancel}
                              className="p-1 text-slate-400"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div
                            className={`group flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors ${
                              isProjectSelected
                                ? 'bg-blue-600 text-white font-semibold'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            <div className="flex items-center gap-1 min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => toggleProjectExpand(project.id)}
                                aria-label={`Toggle project ${projectDisplayName}`}
                                className={`p-0.5 rounded ${
                                  isProjectSelected
                                    ? 'text-blue-100'
                                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
                                }`}
                              >
                                {isProjectExpanded ? (
                                  <ChevronDown className="w-3 h-3" />
                                ) : (
                                  <ChevronRight className="w-3 h-3 rtl:rotate-180" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  onSelectNode({ type: 'project', id: project.id })
                                }
                                className="flex items-center gap-1.5 min-w-0 flex-1 text-start text-xs cursor-pointer"
                              >
                                <Layers className="w-3.5 h-3.5 shrink-0 opacity-80" />
                                <span className="truncate">{projectDisplayName}</span>
                              </button>
                            </div>

                            {/* Project Quick Actions: Add Task, Edit Project, Delete Project */}
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenNewTaskForProject(folder.id, project.id)
                                }
                                title={t.addTask}
                                aria-label={`${t.addTask} (${projectDisplayName})`}
                                className={`p-1 rounded ${
                                  isProjectSelected
                                    ? 'text-blue-100 hover:text-white'
                                    : 'text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'
                                }`}
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingProjectId(project.id);
                                  setEditingProjectName(projectDisplayName);
                                }}
                                title={t.editProject}
                                aria-label={`${t.editProject} ${projectDisplayName}`}
                                className={`p-1 rounded ${
                                  isProjectSelected
                                    ? 'text-blue-100 hover:text-white'
                                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
                                }`}
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteProject(project.id)}
                                title={t.deleteProject}
                                aria-label={`${t.deleteProject} ${projectDisplayName}`}
                                className={`p-1 rounded ${
                                  isProjectSelected
                                    ? 'text-blue-100 hover:text-red-200'
                                    : 'text-slate-400 hover:text-red-600 dark:hover:text-red-400'
                                }`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Nested Tasks inside Project */}
                        {isProjectExpanded && projectTasks.length > 0 && (
                          <div className="ms-4 ps-2 border-s border-slate-200/80 dark:border-slate-800 space-y-0.5 py-0.5">
                            {projectTasks.map((tsk) => {
                              const isTaskSelected =
                                selectedNode.type === 'task' && selectedNode.id === tsk.id;
                              const prog = calculateTaskProgress(tsk);
                              const taskDisplayTitle = resolveLocalizedText(
                                tsk.title,
                                tsk.localizedTitle,
                                lang
                              );

                              return (
                                <div
                                  key={tsk.id}
                                  className={`group flex items-center justify-between gap-1 rounded-lg px-2 py-1.5 text-xs transition-colors ${
                                    isTaskSelected
                                      ? 'bg-blue-600 text-white font-medium'
                                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onSelectNode({ type: 'task', id: tsk.id })
                                    }
                                    className="flex items-center gap-1.5 min-w-0 flex-1 text-start cursor-pointer"
                                  >
                                    <CheckSquare className="w-3.5 h-3.5 shrink-0 opacity-75" />
                                    <span className="truncate">{taskDisplayTitle}</span>
                                  </button>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span
                                      className={`font-mono tabular-nums text-[10px] ${
                                        isTaskSelected
                                          ? 'text-blue-100'
                                          : 'text-slate-400 dark:text-slate-500'
                                      }`}
                                    >
                                      {prog}%
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => onDeleteTask(tsk.id)}
                                      aria-label={`${t.deleteTask} ${taskDisplayTitle}`}
                                      className={`p-1 rounded opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity ${
                                        isTaskSelected
                                          ? 'text-blue-100 hover:text-white'
                                          : 'text-slate-400 hover:text-red-600'
                                      }`}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};
