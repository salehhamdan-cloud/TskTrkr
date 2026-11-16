import React, { useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  ArrowUpDown,
  Check,
  FileSpreadsheet,
  FileText,
  Folder,
  Layers,
  Pencil,
  Pin,
  Plus,
  RotateCcw,
  Search,
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
import { exportFolderToPdf, exportTasksToExcelCsv } from '../utils/pdfExport';

interface FolderDetailViewProps {
  folder: FolderItem;
  projects: ProjectGroupItem[];
  tasks: TaskItem[];
  lang: LanguageCode;
  t: TranslationDictionary;
  onSelectNode: (node: SelectedSidebarNode) => void;
  onUpdateFolder: (folderId: string, name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onCreateProject: (folderId: string, name: string, description: string) => void;
  onUpdateProject: (projectId: string, patch: { name?: string; description?: string }) => void;
  onMoveProject?: (projectId: string) => void;
  onTogglePinProject?: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
}

export const FolderDetailView: React.FC<FolderDetailViewProps> = ({
  folder,
  projects,
  tasks,
  lang,
  t,
  onSelectNode,
  onUpdateFolder,
  onDeleteFolder,
  onCreateProject,
  onUpdateProject,
  onMoveProject,
  onTogglePinProject,
  onDeleteProject,
}) => {
  const folderDisplayName = resolveLocalizedText(
    folder.name,
    folder.localizedName,
    lang
  );

  // Edit folder header state
  const [isEditingFolder, setIsEditingFolder] = useState(false);
  const [folderNameDraft, setFolderNameDraft] = useState(folderDisplayName);

  // Create new project state
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  // Edit project card state
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDesc, setEditProjectDesc] = useState('');

  // Filter & sort state for projects in folder
  const [projectFilter, setProjectFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [projectSort, setProjectSort] = useState<'name' | 'progress' | 'taskCount'>('name');
  const [projectSearch, setProjectSearch] = useState('');

  const folderTasks = tasks.filter(
    (tsk) =>
      tsk.folderId === folder.id ||
      projects.some((p) => p.id === tsk.projectId)
  );
  const folderAvgProgress =
    folderTasks.length > 0
      ? Math.round(
          folderTasks.reduce((acc, tsk) => acc + calculateTaskProgress(tsk), 0) /
            folderTasks.length
        )
      : 0;

  const filteredProjects = useMemo(() => {
    let list = projects.filter((proj) => {
      const projTasks = tasks.filter((tsk) => tsk.projectId === proj.id);
      const projProgress =
        projTasks.length > 0
          ? Math.round(
              projTasks.reduce((acc, tsk) => acc + calculateTaskProgress(tsk), 0) /
                projTasks.length
            )
          : 0;

      if (projectFilter === 'active' && projProgress === 100 && projTasks.length > 0) return false;
      if (projectFilter === 'completed' && (projProgress < 100 || projTasks.length === 0)) return false;

      if (projectSearch.trim()) {
        const query = projectSearch.toLowerCase();
        const name = resolveLocalizedText(proj.name, proj.localizedName, lang).toLowerCase();
        const desc = resolveLocalizedText(proj.description, proj.localizedDescription, lang).toLowerCase();
        if (!name.includes(query) && !desc.includes(query)) return false;
      }

      return true;
    });

    list = [...list].sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) {
        return a.pinned ? -1 : 1;
      }
      const aTasks = tasks.filter((tsk) => tsk.projectId === a.id);
      const bTasks = tasks.filter((tsk) => tsk.projectId === b.id);
      const aProgress =
        aTasks.length > 0
          ? Math.round(aTasks.reduce((acc, t) => acc + calculateTaskProgress(t), 0) / aTasks.length)
          : 0;
      const bProgress =
        bTasks.length > 0
          ? Math.round(bTasks.reduce((acc, t) => acc + calculateTaskProgress(t), 0) / bTasks.length)
          : 0;

      if (projectSort === 'progress') {
        return bProgress - aProgress;
      }
      if (projectSort === 'taskCount') {
        return bTasks.length - aTasks.length;
      }
      const aName = resolveLocalizedText(a.name, a.localizedName, lang);
      const bName = resolveLocalizedText(b.name, b.localizedName, lang);
      return aName.localeCompare(bName);
    });

    return list;
  }, [projects, tasks, projectFilter, projectSort, projectSearch, lang]);

  const handleSaveFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (folderNameDraft.trim()) {
      onUpdateFolder(folder.id, folderNameDraft.trim());
    }
    setIsEditingFolder(false);
  };

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    onCreateProject(folder.id, newProjectName.trim(), newProjectDesc.trim());
    setNewProjectName('');
    setNewProjectDesc('');
  };

  const handleSaveProjectEdit = (projectId: string) => {
    if (editProjectName.trim()) {
      onUpdateProject(projectId, {
        name: editProjectName.trim(),
        description: editProjectDesc.trim(),
      });
    }
    setEditingProjectId(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 sm:space-y-6">
      {/* Folder Focus Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6">
        {isEditingFolder ? (
          <form onSubmit={handleSaveFolder} className="flex flex-wrap sm:flex-nowrap items-center gap-2 mb-4">
            <input
              type="text"
              value={folderNameDraft}
              onChange={(e) => setFolderNameDraft(e.target.value)}
              aria-label={t.editFolder}
              autoFocus
              className="w-full sm:w-auto sm:flex-1 min-w-0 h-10 px-3 text-base font-bold rounded-lg border border-blue-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
            <button
              type="submit"
              className="h-10 px-4 bg-blue-600 text-white text-xs font-semibold rounded-lg shrink-0"
            >
              {t.saveChanges}
            </button>
            <button
              type="button"
              onClick={() => setIsEditingFolder(false)}
              className="h-10 px-3 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg shrink-0"
            >
              {t.cancel}
            </button>
          </form>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 mb-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Folder className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 break-words">
                  {folderDisplayName}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
                  {projects.length} {t.projectsInFolder} · {folderTasks.length} tasks
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <button
                type="button"
                data-testid="export-folder-pdf-btn"
                onClick={() => exportFolderToPdf(folder, projects, folderTasks, lang, t)}
                className="h-9 px-3 rounded-lg border border-blue-200 dark:border-blue-800/70 bg-blue-50/70 dark:bg-blue-950/40 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100/80 dark:hover:bg-blue-900/50 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span>{t.exportFolderPdfButton}</span>
              </button>
              <button
                type="button"
                data-testid="export-folder-csv-btn"
                onClick={() =>
                  exportTasksToExcelCsv(
                    folderTasks,
                    projects,
                    [folder],
                    `folder_${folder.id}_tasks.csv`
                  )
                }
                className="h-9 px-3 rounded-lg border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/70 dark:bg-emerald-950/40 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/50 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                <span>{t.exportExcelCsvButton}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFolderNameDraft(folderDisplayName);
                  setIsEditingFolder(true);
                }}
                aria-label={t.editFolder}
                className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>{t.edit}</span>
              </button>
              <button
                type="button"
                onClick={() => onDeleteFolder(folder.id)}
                aria-label={t.deleteFolder}
                className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.delete}</span>
              </button>
            </div>
          </div>
        )}

        {/* Folder Progress Bar */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-600 dark:text-slate-400 font-medium">
              {t.progressLabel}
            </span>
            <span className="font-mono font-bold tabular-nums text-blue-600 dark:text-blue-400">
              {folderAvgProgress}%
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 dark:bg-blue-500 origin-left rtl:origin-right transition-transform duration-150"
              style={{ transform: `scaleX(${folderAvgProgress / 100})` }}
            />
          </div>
        </div>
      </div>

      {/* Add New Project / Group Form */}
      <form
        onSubmit={handleAddProject}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3"
      >
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          {t.addProject}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder={t.projectNamePlaceholder}
            aria-label={t.projectNamePlaceholder}
            className="h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
          />
          <input
            type="text"
            value={newProjectDesc}
            onChange={(e) => setNewProjectDesc(e.target.value)}
            placeholder={t.projectDescPlaceholder}
            aria-label={t.projectDescPlaceholder}
            className="h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addProject}</span>
          </button>
        </div>
      </form>

      {/* Projects List in this Folder */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {t.projectsInFolder} ({projects.length})
          </h2>

          {projects.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative min-w-[140px] flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  placeholder={t.filterSearchPlaceholder}
                  className="w-full h-8 ps-8 pe-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setProjectFilter('all')}
                  className={`px-2 py-1 rounded-md font-medium transition cursor-pointer ${
                    projectFilter === 'all'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {t.filterAllProjects}
                </button>
                <button
                  type="button"
                  onClick={() => setProjectFilter('active')}
                  className={`px-2 py-1 rounded-md font-medium transition cursor-pointer ${
                    projectFilter === 'active'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {t.filterActiveProjects}
                </button>
                <button
                  type="button"
                  onClick={() => setProjectFilter('completed')}
                  className={`px-2 py-1 rounded-md font-medium transition cursor-pointer ${
                    projectFilter === 'completed'
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {t.filterCompletedProjects}
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 h-8 text-xs">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={projectSort}
                  onChange={(e) => setProjectSort(e.target.value as any)}
                  aria-label={t.sortProjectsBy}
                  className="bg-transparent text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
                >
                  <option value="name" className="dark:bg-slate-900">{t.sortByName}</option>
                  <option value="progress" className="dark:bg-slate-900">{t.sortByProgress}</option>
                  <option value="taskCount" className="dark:bg-slate-900">{t.sortByTaskCount}</option>
                </select>
              </div>

              {/* Reset if filtered */}
              {(projectFilter !== 'all' || projectSearch.trim() || projectSort !== 'name') && (
                <button
                  type="button"
                  onClick={() => {
                    setProjectFilter('all');
                    setProjectSearch('');
                    setProjectSort('name');
                  }}
                  title={t.resetFilters}
                  className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1 text-xs cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {projects.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-500">
            {t.noProjectsYet}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
            <span>{t.noMatchingTasks}</span>
            <button
              type="button"
              onClick={() => {
                setProjectFilter('all');
                setProjectSearch('');
                setProjectSort('name');
              }}
              className="px-3 py-1 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-md font-medium cursor-pointer"
            >
              {t.resetFilters}
            </button>
          </div>
        ) : (
          filteredProjects.map((proj) => {
            const projName = resolveLocalizedText(proj.name, proj.localizedName, lang);
            const projDesc = resolveLocalizedText(
              proj.description,
              proj.localizedDescription,
              lang
            );
            const projTasks = tasks.filter((tsk) => tsk.projectId === proj.id);
            const projProgress =
              projTasks.length > 0
                ? Math.round(
                    projTasks.reduce((acc, tsk) => acc + calculateTaskProgress(tsk), 0) /
                      projTasks.length
                  )
                : 0;

            return (
              <div
                key={proj.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                {editingProjectId === proj.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editProjectName}
                      onChange={(e) => setEditProjectName(e.target.value)}
                      aria-label={t.editProject}
                      className="w-full h-10 px-3 text-sm font-semibold rounded-lg border border-blue-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    />
                    <input
                      type="text"
                      value={editProjectDesc}
                      onChange={(e) => setEditProjectDesc(e.target.value)}
                      placeholder={t.projectDescPlaceholder}
                      className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => handleSaveProjectEdit(proj.id)}
                        className="h-9 px-3.5 bg-blue-600 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {t.saveChanges}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingProjectId(null)}
                        className="h-9 px-3 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg inline-flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        {t.cancel}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <button
                        type="button"
                        onClick={() => onSelectNode({ type: 'project', id: proj.id })}
                        className="text-start flex-1 min-w-0 cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            {projName}
                          </h3>
                        </div>
                        {projDesc && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {projDesc}
                          </p>
                        )}
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        {onTogglePinProject && (
                          <button
                            type="button"
                            data-testid={`pin-project-btn-${proj.id}`}
                            onClick={() => onTogglePinProject(proj.id)}
                            title={proj.pinned ? t.unpinItemButton : t.pinItemButton}
                            aria-label={proj.pinned ? t.unpinItemButton : t.pinItemButton}
                            className={`p-2 rounded-lg transition-colors cursor-pointer ${
                              proj.pinned
                                ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                                : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onMoveProject && (
                          <button
                            type="button"
                            data-testid={`move-project-btn-${proj.id}`}
                            onClick={() => onMoveProject(proj.id)}
                            title={t.moveGroupButton}
                            aria-label={`${t.moveGroupButton} ${projName}`}
                            className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProjectId(proj.id);
                            setEditProjectName(projName);
                            setEditProjectDesc(projDesc);
                          }}
                          aria-label={`${t.editProject} ${projName}`}
                          className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteProject(proj.id)}
                          aria-label={`${t.deleteProject} ${projName}`}
                          className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectNode({ type: 'project', id: proj.id })}
                      className="w-full text-start pt-2 border-t border-slate-100 dark:border-slate-800 cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 mb-1.5">
                        <span>{projTasks.length} tasks</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {projProgress}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full origin-left ${
                            projProgress === 100 ? 'bg-emerald-600' : 'bg-blue-600'
                          }`}
                          style={{ transform: `scaleX(${projProgress / 100})` }}
                        />
                      </div>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
