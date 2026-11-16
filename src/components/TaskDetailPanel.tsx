import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRightLeft,
  ArrowUpDown,
  BookmarkPlus,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  CornerDownRight,
  Download,
  Eye,
  FileDown,
  FileText,
  Image as ImageIcon,
  Pencil,
  PenTool,
  Pin,
  Plus,
  Repeat,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  LanguageCode,
  PhotoTargetRef,
  ProjectGroupItem,
  RecurrenceCustomUnit,
  RecurrenceFrequency,
  TagColor,
  TaskAttachment,
  TaskItem,
  TaskPriority,
  TaskRecurrenceRule,
  TaskStatus,
} from '../types/task';
import {
  getStatusLabel,
  resolveLocalizedText,
  TranslationDictionary,
} from '../i18n/translations';
import {
  calculateTaskProgress,
  decodeDataUrlTextPreview,
  formatDateTimeStamp,
  formatFileSize,
  resolveFilePreviewKind,
} from '../utils/taskLogic';
import { exportTaskToPdf } from '../utils/pdfExport';
import { PhotoAnnotationModal } from './PhotoAnnotationModal';
import { PriorityBadge } from './PriorityBadge';

interface TaskDetailPanelProps {
  task: TaskItem;
  parentProject?: ProjectGroupItem;
  lang: LanguageCode;
  t: TranslationDictionary;
  onBackToProject?: () => void;
  onAddTodo: (
    taskId: string,
    title: string,
    photos?: Omit<TaskAttachment, 'id' | 'addedAt'>[]
  ) => void;
  onEditTodo: (taskId: string, todoId: string, newTitle: string) => void;
  onToggleTodo: (taskId: string, todoId: string) => void;
  onDeleteTodo: (taskId: string, todoId: string) => void;
  onAddSubTodo?: (taskId: string, todoId: string, title: string) => void;
  onToggleSubTodo?: (taskId: string, todoId: string, subTodoId: string) => void;
  onEditSubTodo?: (taskId: string, todoId: string, subTodoId: string, newTitle: string) => void;
  onDeleteSubTodo?: (taskId: string, todoId: string, subTodoId: string) => void;
  onAddPhotoToTodo: (
    taskId: string,
    todoId: string,
    photo: Omit<TaskAttachment, 'id' | 'addedAt'>
  ) => void;
  onDeletePhotoFromTodo: (taskId: string, todoId: string, photoId: string) => void;
  onAddUpdate: (
    taskId: string,
    update: {
      content: string;
      timestamp: string;
      author: string;
      photos?: Omit<TaskAttachment, 'id' | 'addedAt'>[];
    }
  ) => void;
  onEditUpdate: (
    taskId: string,
    updateId: string,
    patch: { content: string; timestamp?: string; author?: string }
  ) => void;
  onDeleteUpdate: (taskId: string, updateId: string) => void;
  onAddPhotoToUpdate: (
    taskId: string,
    updateId: string,
    photo: Omit<TaskAttachment, 'id' | 'addedAt'>
  ) => void;
  onDeletePhotoFromUpdate: (
    taskId: string,
    updateId: string,
    photoId: string
  ) => void;
  onAddAttachment: (
    taskId: string,
    attachment: Omit<TaskAttachment, 'id' | 'addedAt'>
  ) => void;
  onEditAttachment: (
    taskId: string,
    attachmentId: string,
    patch: { name?: string; caption?: string }
  ) => void;
  onDeleteAttachment: (taskId: string, attachmentId: string) => void;
  onAnnotatePhoto: (
    taskId: string,
    target: PhotoTargetRef,
    annotatedDataUrl: string,
    caption?: string
  ) => void;
  onUpdateTaskMeta: (
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
        | 'pinned'
        | 'tags'
        | 'recurrence'
      >
    >
  ) => void;
  onMoveTask?: (taskId: string) => void;
  onTogglePinTask?: (taskId: string) => void;
  onSaveTaskAsTemplate?: (task: TaskItem) => void;
  onAddTagToTask?: (taskId: string, label: string, color: TagColor) => void;
  onRemoveTagFromTask?: (taskId: string, tagId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

const TAG_PILL_STYLES: Record<TagColor, string> = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/70',
  emerald:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/70',
  amber:
    'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/70',
  rose: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/70',
  violet:
    'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800/70',
  cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800/70',
};

const getNowLocalDatetime = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

export const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({
  task,
  parentProject,
  lang,
  t,
  onBackToProject,
  onAddTodo,
  onEditTodo,
  onToggleTodo,
  onDeleteTodo,
  onAddSubTodo,
  onToggleSubTodo,
  onEditSubTodo,
  onDeleteSubTodo,
  onAddPhotoToTodo,
  onDeletePhotoFromTodo,
  onAddUpdate,
  onEditUpdate,
  onDeleteUpdate,
  onAddPhotoToUpdate,
  onDeletePhotoFromUpdate,
  onAddAttachment,
  onEditAttachment,
  onDeleteAttachment,
  onAnnotatePhoto,
  onUpdateTaskMeta,
  onMoveTask,
  onTogglePinTask,
  onSaveTaskAsTemplate,
  onAddTagToTask,
  onRemoveTagFromTask,
  onDeleteTask,
}) => {
  const displayTitle = resolveLocalizedText(task.title, task.localizedTitle, lang);
  const displayDesc = resolveLocalizedText(task.description, task.localizedDescription, lang);

  // Edit Task Title & Description inline
  const [isEditingTaskHeader, setIsEditingTaskHeader] = useState(false);
  const [taskTitleDraft, setTaskTitleDraft] = useState(displayTitle);
  const [taskDescDraft, setTaskDescDraft] = useState(displayDesc);

  // Custom Tag & Template Toast state
  const [newTagLabel, setNewTagLabel] = useState('');
  const [newTagColor, setNewTagColor] = useState<TagColor>('blue');
  const [templateToast, setTemplateToast] = useState<string | null>(null);

  // Popup adding window state ('todo' | 'update' | 'attachment' | null)
  const [activeAddModal, setActiveAddModal] = useState<
    'todo' | 'update' | 'attachment' | null
  >(null);

  // Nested To-Do states
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [stagedTodoPhotos, setStagedTodoPhotos] = useState<
    Omit<TaskAttachment, 'id' | 'addedAt'>[]
  >([]);
  const [todoFilter, setTodoFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editingTodoTitle, setEditingTodoTitle] = useState('');
  const [activeTodoPhotoUploadId, setActiveTodoPhotoUploadId] = useState<string | null>(
    null
  );
  const newTodoPhotoInputRef = useRef<HTMLInputElement>(null);
  const existingTodoPhotoInputRef = useRef<HTMLInputElement>(null);

  // Sub-todo states
  const [addingSubTodoForId, setAddingSubTodoForId] = useState<string | null>(null);
  const [newSubTodoTitle, setNewSubTodoTitle] = useState('');
  const [editingSubTodoId, setEditingSubTodoId] = useState<string | null>(null);
  const [editingSubTodoTitle, setEditingSubTodoTitle] = useState('');

  // Collapsing states for main sections
  const [isTodosCollapsed, setIsTodosCollapsed] = useState(false);
  const [isUpdatesCollapsed, setIsUpdatesCollapsed] = useState(false);
  const [isAttachmentsCollapsed, setIsAttachmentsCollapsed] = useState(false);

  // Collapsing states for individual to-do sub-todos lists & individual update photos
  const [collapsedTodoSubs, setCollapsedTodoSubs] = useState<Record<string, boolean>>({});
  const [collapsedUpdates, setCollapsedUpdates] = useState<Record<string, boolean>>({});

  const toggleTodoSubsCollapse = (todoId: string) => {
    setCollapsedTodoSubs((prev) => ({ ...prev, [todoId]: !prev[todoId] }));
  };

  const toggleUpdateCollapse = (updateId: string) => {
    setCollapsedUpdates((prev) => ({ ...prev, [updateId]: !prev[updateId] }));
  };

  // Task Update states
  const [updateContent, setUpdateContent] = useState('');
  const [updateTimestamp, setUpdateTimestamp] = useState(getNowLocalDatetime);
  const [updateAuthor, setUpdateAuthor] = useState('Saleh Hmdan');
  const [stagedUpdatePhotos, setStagedUpdatePhotos] = useState<
    Omit<TaskAttachment, 'id' | 'addedAt'>[]
  >([]);
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);
  const [editUpdateContent, setEditUpdateContent] = useState('');
  const [editUpdateTimestamp, setEditUpdateTimestamp] = useState('');
  const [editUpdateAuthor, setEditUpdateAuthor] = useState('');
  const [activeUpdatePhotoUploadId, setActiveUpdatePhotoUploadId] = useState<
    string | null
  >(null);
  const newUpdatePhotoInputRef = useRef<HTMLInputElement>(null);
  const existingUpdatePhotoInputRef = useRef<HTMLInputElement>(null);

  // Attachment states
  const [attachmentCaption, setAttachmentCaption] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<{
    photo: TaskAttachment;
    target: PhotoTargetRef;
  } | null>(null);
  const [previewFile, setPreviewFile] = useState<TaskAttachment | null>(null);
  const [annotatingState, setAnnotatingState] = useState<{
    photo: TaskAttachment;
    target: PhotoTargetRef;
  } | null>(null);
  const [editingAttId, setEditingAttId] = useState<string | null>(null);
  const [editAttName, setEditAttName] = useState('');
  const [editAttCaption, setEditAttCaption] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const progress = calculateTaskProgress(task);
  const completedTodos = task.todos.filter((item) => item.completed).length;
  const [todoSort, setTodoSort] = useState<'default' | 'incomplete' | 'title' | 'subTodos'>('default');
  const [updatesSort, setUpdatesSort] = useState<'newest' | 'oldest'>('newest');
  const [updatesWithPhotosOnly, setUpdatesWithPhotosOnly] = useState(false);
  const [attachmentFilter, setAttachmentFilter] = useState<'all' | 'photo' | 'file'>('all');

  const filteredTodos = useMemo(() => {
    let list = task.todos.filter((item) => {
      if (todoFilter === 'active') return !item.completed;
      if (todoFilter === 'completed') return item.completed;
      return true;
    });

    list = [...list].sort((a, b) => {
      if (todoSort === 'incomplete') {
        return (a.completed ? 1 : 0) - (b.completed ? 1 : 0);
      }
      if (todoSort === 'title') {
        return a.title.localeCompare(b.title);
      }
      if (todoSort === 'subTodos') {
        return (b.subTodos?.length || 0) - (a.subTodos?.length || 0);
      }
      return 0;
    });

    return list;
  }, [task.todos, todoFilter, todoSort]);

  const displayedUpdates = useMemo(() => {
    let list = task.updates.filter((u) => {
      if (updatesWithPhotosOnly && (!u.photos || u.photos.length === 0)) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      if (updatesSort === 'oldest') {
        return a.timestamp.localeCompare(b.timestamp);
      }
      return b.timestamp.localeCompare(a.timestamp);
    });

    return list;
  }, [task.updates, updatesWithPhotosOnly, updatesSort]);

  const displayedAttachments = useMemo(() => {
    if (attachmentFilter === 'photo') return task.attachments.filter((a) => a.type === 'photo');
    if (attachmentFilter === 'file') return task.attachments.filter((a) => a.type === 'file');
    return task.attachments;
  }, [task.attachments, attachmentFilter]);

  const readImageFilesAsPayloads = (
    files: FileList | null,
    onDone: (items: Omit<TaskAttachment, 'id' | 'addedAt'>[]) => void
  ) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    const results: Omit<TaskAttachment, 'id' | 'addedAt'>[] = [];
    let completed = 0;

    fileArray.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const resultUrl = typeof reader.result === 'string' ? reader.result : '';
        results.push({
          name: file.name,
          type: 'photo',
          mimeType: file.type || 'image/jpeg',
          sizeBytes: file.size,
          url: resultUrl,
          caption: file.name,
        });
        completed += 1;
        if (completed === fileArray.length) {
          onDone(results);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSaveTaskHeader = (e: React.FormEvent) => {
    e.preventDefault();
    if (taskTitleDraft.trim()) {
      onUpdateTaskMeta(task.id, {
        title: taskTitleDraft.trim(),
        description: taskDescDraft.trim(),
      });
    }
    setIsEditingTaskHeader(false);
  };

  const handleTodoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;
    onAddTodo(
      task.id,
      newTodoTitle.trim(),
      stagedTodoPhotos.length > 0 ? stagedTodoPhotos : undefined
    );
    setNewTodoTitle('');
    setStagedTodoPhotos([]);
    setIsTodosCollapsed(false);
    setActiveAddModal(null);
  };

  const handleSaveTodoEdit = (todoId: string) => {
    if (editingTodoTitle.trim()) {
      onEditTodo(task.id, todoId, editingTodoTitle.trim());
    }
    setEditingTodoId(null);
  };

  const handleAddSubTodoSubmit = (todoId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubTodoTitle.trim()) return;
    if (onAddSubTodo) {
      onAddSubTodo(task.id, todoId, newSubTodoTitle.trim());
    }
    setNewSubTodoTitle('');
    setAddingSubTodoForId(null);
  };

  const handleSaveSubTodoEdit = (todoId: string, subTodoId: string) => {
    if (editingSubTodoTitle.trim() && onEditSubTodo) {
      onEditSubTodo(task.id, todoId, subTodoId, editingSubTodoTitle.trim());
    }
    setEditingSubTodoId(null);
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateContent.trim()) return;
    onAddUpdate(task.id, {
      content: updateContent.trim(),
      timestamp: updateTimestamp || getNowLocalDatetime(),
      author: updateAuthor.trim() || 'Saleh Hmdan',
      photos: stagedUpdatePhotos.length > 0 ? stagedUpdatePhotos : undefined,
    });
    setUpdateContent('');
    setUpdateTimestamp(getNowLocalDatetime());
    setStagedUpdatePhotos([]);
    setIsUpdatesCollapsed(false);
    setActiveAddModal(null);
  };

  const handleSaveUpdateEdit = (updateId: string) => {
    if (editUpdateContent.trim()) {
      onEditUpdate(task.id, updateId, {
        content: editUpdateContent.trim(),
        timestamp: editUpdateTimestamp,
        author: editUpdateAuthor,
      });
    }
    setEditingUpdateId(null);
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    forcedType: 'photo' | 'file'
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const captionToUse = attachmentCaption.trim();
    Array.from(files).forEach((file) => {
      const isImage = forcedType === 'photo' || file.type.startsWith('image/');
      const reader = new FileReader();
      reader.onload = () => {
        const resultUrl = typeof reader.result === 'string' ? reader.result : '';
        onAddAttachment(task.id, {
          name: file.name,
          type: isImage ? 'photo' : 'file',
          mimeType: file.type || (isImage ? 'image/jpeg' : 'application/octet-stream'),
          sizeBytes: file.size,
          url: resultUrl,
          caption: captionToUse || file.name,
        });
      };
      reader.readAsDataURL(file);
    });
    setAttachmentCaption('');
    setIsAttachmentsCollapsed(false);
    setActiveAddModal(null);
    e.target.value = '';
  };

  const handleSaveAttachmentEdit = (attId: string) => {
    onEditAttachment(task.id, attId, {
      name: editAttName.trim(),
      caption: editAttCaption.trim(),
    });
    setEditingAttId(null);
  };

  // Reusable mini photo card renderer for To-Dos and Task Updates
  const renderSectionPhotoGrid = (
    photos: TaskAttachment[] | undefined,
    section: 'todo' | 'update',
    parentId: string,
    onDeletePhoto: (photoId: string) => void
  ) => {
    if (!photos || photos.length === 0) return null;
    return (
      <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {photos.map((photo) => {
          const cap = resolveLocalizedText(
            photo.caption || '',
            photo.localizedCaption,
            lang
          );
          const targetRef: PhotoTargetRef = {
            section,
            parentId,
            photoId: photo.id,
          };
          return (
            <div
              key={photo.id}
              className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/70 dark:bg-slate-950/60 flex flex-col"
            >
              <div className="relative h-28 bg-slate-900 overflow-hidden group">
                <img
                  src={photo.url}
                  alt={cap || photo.name}
                  referrerPolicy="no-referrer"
                  onClick={() => setPreviewPhoto({ photo, target: targetRef })}
                  className="w-full h-full object-cover cursor-pointer"
                />
                {photo.annotatedAt && (
                  <span className="absolute top-2 start-2 px-2 py-0.5 bg-blue-600/90 text-white text-[10px] font-semibold rounded">
                    {t.annotatedBadge}
                  </span>
                )}
                <div className="absolute bottom-2 end-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAnnotatingState({ photo, target: targetRef })}
                    aria-label={`${t.annotatePhoto} ${photo.name}`}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold rounded-md inline-flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <PenTool className="w-3 h-3" />
                    <span>{t.annotatePhoto}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewPhoto({ photo, target: targetRef })}
                    className="px-2 py-1 bg-black/75 text-white text-[11px] font-medium rounded-md cursor-pointer"
                  >
                    {t.inspectPhoto}
                  </button>
                </div>
              </div>
              <div className="px-3 py-2 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                    {photo.name}
                  </div>
                  {cap && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {cap}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setAnnotatingState({ photo, target: targetRef })}
                    title={t.annotatePhoto}
                    aria-label={`${t.annotatePhoto} ${photo.name}`}
                    className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded cursor-pointer"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeletePhoto(photo.id)}
                    aria-label={`${t.delete} ${photo.name}`}
                    className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 sm:space-y-6">
      {/* Hidden file inputs for existing To-Do and Update photo uploads */}
      <input
        ref={existingTodoPhotoInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          const targetTodoId = activeTodoPhotoUploadId;
          readImageFilesAsPayloads(e.target.files, (items) => {
            if (targetTodoId) {
              items.forEach((item) => onAddPhotoToTodo(task.id, targetTodoId, item));
            }
          });
          e.target.value = '';
        }}
        className="hidden"
      />

      <input
        ref={existingUpdatePhotoInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          const targetUpdateId = activeUpdatePhotoUploadId;
          readImageFilesAsPayloads(e.target.files, (items) => {
            if (targetUpdateId) {
              items.forEach((item) => onAddPhotoToUpdate(task.id, targetUpdateId, item));
            }
          });
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* Back to Project Breadcrumb */}
      {onBackToProject && (
        <div>
          <button
            type="button"
            onClick={onBackToProject}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 text-xs font-medium text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-white hover:bg-blue-100/60 dark:hover:bg-blue-900/40 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
            <span>
              {t.backToProject}
              {parentProject
                ? `: ${resolveLocalizedText(
                    parentProject.name,
                    parentProject.localizedName,
                    lang
                  )}`
                : ''}
            </span>
          </button>
        </div>
      )}

      {/* Main Focused Task Card */}
      <div className="bg-white dark:bg-slate-900 border border-blue-200/90 dark:border-blue-900/60 rounded-2xl shadow-xs overflow-hidden">
        {/* Top Header of Task with Export PDF, Edit & Delete Task */}
        <div className="p-3.5 sm:p-6 bg-gradient-to-r from-blue-50/50 via-white to-indigo-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/30 border-b border-blue-100 dark:border-slate-800">
          {isEditingTaskHeader ? (
            <form onSubmit={handleSaveTaskHeader} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  {t.taskTitleLabel}
                </label>
                <input
                  type="text"
                  value={taskTitleDraft}
                  onChange={(e) => setTaskTitleDraft(e.target.value)}
                  autoFocus
                  className="w-full h-10 px-3 text-base font-bold rounded-lg border border-blue-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  {t.taskDescLabel}
                </label>
                <textarea
                  rows={2}
                  value={taskDescDraft}
                  onChange={(e) => setTaskDescDraft(e.target.value)}
                  className="w-full p-3 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="submit"
                  className="h-9 px-4 bg-blue-600 text-white text-xs font-semibold rounded-lg"
                >
                  {t.saveChanges}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingTaskHeader(false)}
                  className="h-9 px-3 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  {t.cancel}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3.5 sm:gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs mb-2">
                  <PriorityBadge priority={task.priority} t={t} size="sm" />
                  <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                  <span className="font-semibold text-blue-700 dark:text-blue-300">
                    {parentProject
                      ? resolveLocalizedText(
                          parentProject.name,
                          parentProject.localizedName,
                          lang
                        )
                      : task.project}
                  </span>
                  <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                  <span className="font-medium text-slate-600 dark:text-slate-400">
                    {getStatusLabel(task.status, t)}
                  </span>
                  <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {t.dueDateLabel}: {task.dueDate}
                    {task.dueTime ? ` · ${task.dueTime}` : ''}
                  </span>
                </div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 leading-snug break-words">
                  {displayTitle}
                </h1>
                {displayDesc && (
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed break-words">
                    {displayDesc}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                {onTogglePinTask && (
                  <button
                    type="button"
                    data-testid="pin-task-btn"
                    onClick={() => onTogglePinTask(task.id)}
                    aria-label={task.pinned ? t.unpinItemButton : t.pinItemButton}
                    className={`h-9 px-3 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                      task.pinned
                        ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Pin className="w-3.5 h-3.5 shrink-0" />
                    <span>{task.pinned ? t.unpinItemButton : t.pinItemButton}</span>
                  </button>
                )}
                {onSaveTaskAsTemplate && (
                  <button
                    type="button"
                    data-testid="save-task-template-btn"
                    onClick={() => {
                      onSaveTaskAsTemplate(task);
                      setTemplateToast(t.templateSavedToast);
                      setTimeout(() => setTemplateToast(null), 2600);
                    }}
                    className="h-9 px-3 rounded-lg border border-violet-200 dark:border-violet-800/70 bg-violet-50/70 dark:bg-violet-950/40 text-xs font-semibold text-violet-700 dark:text-violet-300 hover:bg-violet-100/80 dark:hover:bg-violet-900/50 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5 shrink-0" />
                    <span>{t.saveAsTemplateButton}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => exportTaskToPdf(task, lang, t)}
                  aria-label={t.exportPdfButton}
                  className="h-9 px-3 rounded-lg border border-blue-200 dark:border-blue-900/70 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{t.exportPdfButton}</span>
                </button>
                {onMoveTask && (
                  <button
                    type="button"
                    data-testid="move-task-header-btn"
                    onClick={() => onMoveTask(task.id)}
                    aria-label={t.moveTaskButton}
                    className="h-9 px-3 rounded-lg border border-blue-200 dark:border-blue-900/70 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{t.moveTaskButton}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setTaskTitleDraft(displayTitle);
                    setTaskDescDraft(displayDesc);
                    setIsEditingTaskHeader(true);
                  }}
                  aria-label={t.editTask}
                  className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>{t.edit}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteTask(task.id)}
                  aria-label={t.deleteTask}
                  className="h-9 px-3 rounded-lg border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-900 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.delete}</span>
                </button>
              </div>
            </div>
          )}
          {templateToast && (
            <div
              data-testid="template-saved-toast"
              className="mt-3 rounded-lg bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800 px-3 py-2 text-xs font-semibold text-violet-800 dark:text-violet-200"
            >
              {templateToast}
            </div>
          )}
        </div>

        {/* Body Sections */}
        <div className="p-3.5 sm:p-6 space-y-5 sm:space-y-6">
          {/* SECTION 1: TASK PROGRESS BAR & STATUS / PRIORITY / DUE DATE */}
          <section
            aria-labelledby="task-progress-heading"
            className="bg-slate-50/90 dark:bg-slate-800/40 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-700/80"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div>
                <h2
                  id="task-progress-heading"
                  className="text-sm font-semibold text-slate-900 dark:text-slate-100"
                >
                  {t.progressLabel}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {task.todos.length > 0 ? t.autoSyncedFromTodos : t.manualProgressHint}
                </p>
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400">
                {progress}%
              </div>
            </div>

            <div
              className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-4"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t.progressLabel}
            >
              <div
                className={`h-full transition-transform duration-150 origin-left rtl:origin-right ${
                  progress === 100 ? 'bg-emerald-600' : 'bg-blue-600'
                }`}
                style={{ transform: `scaleX(${progress / 100})` }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/70 dark:border-slate-700/60">
              <div>
                <label
                  htmlFor="detail-task-status"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  {t.statusLabel}
                </label>
                <select
                  id="detail-task-status"
                  value={task.status}
                  onChange={(e) =>
                    onUpdateTaskMeta(task.id, { status: e.target.value as TaskStatus })
                  }
                  className="w-full h-9 px-2.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="todo">{t.statusTodo}</option>
                  <option value="in_progress">{t.statusInProgress}</option>
                  <option value="review">{t.statusReview}</option>
                  <option value="completed">{t.statusCompleted}</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="detail-task-priority"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-400"
                  >
                    {t.priorityLabel}
                  </label>
                  <PriorityBadge priority={task.priority} t={t} size="xs" />
                </div>
                <select
                  id="detail-task-priority"
                  data-testid="detail-task-priority"
                  value={task.priority}
                  onChange={(e) =>
                    onUpdateTaskMeta(task.id, {
                      priority: e.target.value as TaskPriority,
                    })
                  }
                  className="w-full h-9 px-2.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="low">{t.priorityLow}</option>
                  <option value="medium">{t.priorityMedium}</option>
                  <option value="high">{t.priorityHigh}</option>
                  <option value="critical">{t.priorityCritical}</option>
                </select>
              </div>

              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-2 min-w-0">
                <div className="min-w-0">
                  <label
                    htmlFor="detail-task-duedate"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 truncate"
                  >
                    {t.dueDateLabel}
                  </label>
                  <input
                    id="detail-task-duedate"
                    type="date"
                    value={task.dueDate}
                    onChange={(e) => onUpdateTaskMeta(task.id, { dueDate: e.target.value })}
                    className="w-full min-w-0 h-9 px-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="min-w-0">
                  <label
                    htmlFor="detail-task-duetime"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 truncate"
                  >
                    {t.dueTimeLabel}
                  </label>
                  <input
                    id="detail-task-duetime"
                    type="time"
                    value={task.dueTime || ''}
                    onChange={(e) => onUpdateTaskMeta(task.id, { dueTime: e.target.value })}
                    className="w-full min-w-0 h-9 px-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* Recurrence & Custom Tags Row */}
            <div className="mt-3 pt-3 border-t border-slate-200/70 dark:border-slate-700/60 grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Recurrence Rule */}
              <div>
                <label
                  htmlFor="detail-task-recurrence"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 inline-flex items-center gap-1.5"
                >
                  <Repeat className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{t.recurrenceLabel}</span>
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    id="detail-task-recurrence"
                    data-testid="task-recurrence-select"
                    value={task.recurrence?.frequency || 'none'}
                    onChange={(e) => {
                      const freq = e.target.value as RecurrenceFrequency;
                      const currentCount =
                        task.recurrence?.interval ??
                        task.recurrence?.intervalDays ??
                        1;
                      const currentUnit: RecurrenceCustomUnit =
                        task.recurrence?.customUnit || 'days';
                      const nextRec: TaskRecurrenceRule = {
                        frequency: freq,
                        interval: freq === 'custom' ? currentCount : undefined,
                        customUnit: freq === 'custom' ? currentUnit : undefined,
                        intervalDays:
                          freq === 'custom' && currentUnit === 'days'
                            ? currentCount
                            : undefined,
                      };
                      onUpdateTaskMeta(task.id, { recurrence: nextRec });
                    }}
                    className="flex-1 min-w-[140px] h-9 px-2.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  >
                    <option value="none">{t.recurrenceNone}</option>
                    <option value="daily">{t.recurrenceDaily}</option>
                    <option value="weekly">{t.recurrenceWeekly}</option>
                    <option value="monthly">{t.recurrenceMonthly}</option>
                    <option value="yearly">{t.recurrenceYearly}</option>
                    <option value="custom">{t.recurrenceCustom}</option>
                  </select>
                  {task.recurrence?.frequency === 'custom' && (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={1}
                        max={999}
                        data-testid="task-recurrence-interval-input"
                        value={
                          task.recurrence.interval ??
                          task.recurrence.intervalDays ??
                          1
                        }
                        onChange={(e) => {
                          const nextCount = Math.max(
                            1,
                            Number(e.target.value) || 1
                          );
                          const unit: RecurrenceCustomUnit =
                            task.recurrence?.customUnit || 'days';
                          onUpdateTaskMeta(task.id, {
                            recurrence: {
                              frequency: 'custom',
                              interval: nextCount,
                              customUnit: unit,
                              intervalDays:
                                unit === 'days' ? nextCount : undefined,
                            },
                          });
                        }}
                        aria-label={t.recurrenceIntervalDaysLabel}
                        className="w-16 h-9 px-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      />
                      <select
                        data-testid="task-recurrence-unit-select"
                        value={task.recurrence.customUnit || 'days'}
                        onChange={(e) => {
                          const nextUnit = e.target
                            .value as RecurrenceCustomUnit;
                          const count =
                            task.recurrence?.interval ??
                            task.recurrence?.intervalDays ??
                            1;
                          onUpdateTaskMeta(task.id, {
                            recurrence: {
                              frequency: 'custom',
                              interval: count,
                              customUnit: nextUnit,
                              intervalDays:
                                nextUnit === 'days' ? count : undefined,
                            },
                          });
                        }}
                        aria-label={t.recurrenceCustom}
                        className="h-9 px-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      >
                        <option value="days">{t.recurrenceUnitDays}</option>
                        <option value="weeks">{t.recurrenceUnitWeeks}</option>
                        <option value="months">{t.recurrenceUnitMonths}</option>
                        <option value="years">{t.recurrenceUnitYears}</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Custom Color Tags */}
              <div data-testid="task-tags-section">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 inline-flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{t.customTagsLabel}</span>
                </label>
                {onAddTagToTask && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      data-testid="add-tag-input"
                      value={newTagLabel}
                      onChange={(e) => setNewTagLabel(e.target.value)}
                      placeholder={t.addTagPlaceholder}
                      className="flex-1 min-w-0 h-9 px-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    />
                    <select
                      data-testid="add-tag-color-select"
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value as TagColor)}
                      aria-label="Tag color"
                      className="h-9 px-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    >
                      <option value="blue">Blue</option>
                      <option value="emerald">Green</option>
                      <option value="amber">Amber</option>
                      <option value="rose">Rose</option>
                      <option value="violet">Violet</option>
                      <option value="cyan">Cyan</option>
                    </select>
                    <button
                      type="button"
                      data-testid="add-tag-submit-btn"
                      onClick={() => {
                        if (!newTagLabel.trim()) return;
                        onAddTagToTask(task.id, newTagLabel.trim(), newTagColor);
                        setNewTagLabel('');
                      }}
                      className="h-9 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shrink-0 cursor-pointer"
                    >
                      {t.addTagButton}
                    </button>
                  </div>
                )}

                {/* Active Tags + Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {(task.tags || []).map((tg) => (
                    <span
                      key={tg.id}
                      data-testid={`task-tag-pill-${tg.label}`}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                        TAG_PILL_STYLES[tg.color] || TAG_PILL_STYLES.blue
                      }`}
                    >
                      <span>{tg.label}</span>
                      {onRemoveTagFromTask && (
                        <button
                          type="button"
                          onClick={() => onRemoveTagFromTask(task.id, tg.id)}
                          aria-label={`Remove ${tg.label}`}
                          className="hover:opacity-75 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                  {onAddTagToTask &&
                    (
                      [
                        { label: 'Urgent', color: 'rose' as TagColor },
                        { label: 'Client Approval', color: 'blue' as TagColor },
                        { label: 'Waiting on Parts', color: 'amber' as TagColor },
                        { label: 'Site Visit', color: 'emerald' as TagColor },
                      ] as const
                    )
                      .filter(
                        (preset) =>
                          !(task.tags || []).some(
                            (tg) =>
                              tg.label.toLowerCase() === preset.label.toLowerCase()
                          )
                      )
                      .map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          data-testid={`preset-tag-btn-${preset.label}`}
                          onClick={() =>
                            onAddTagToTask(task.id, preset.label, preset.color)
                          }
                          className="px-2 py-0.5 rounded-md border border-dashed border-slate-300 dark:border-slate-700 text-[10px] font-medium text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 cursor-pointer"
                        >
                          + {preset.label}
                        </button>
                      ))}
                </div>
              </div>
            </div>

            {task.todos.length === 0 && (
              <div className="mt-3 pt-3 border-t border-slate-200/70 dark:border-slate-700/60">
                <label
                  htmlFor="manual-progress-slider"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  {t.manualProgressLabel} ({task.manualProgress}%)
                </label>
                <input
                  id="manual-progress-slider"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={task.manualProgress}
                  onChange={(e) =>
                    onUpdateTaskMeta(task.id, { manualProgress: Number(e.target.value) })
                  }
                  className="w-full accent-blue-600"
                />
              </div>
            )}
          </section>

          {/* QUICK ADD ACTION BUTTONS BAR */}
          <div
            data-testid="task-quick-add-bar"
            className="grid grid-cols-1 sm:grid-cols-3 gap-2.5"
          >
            <button
              type="button"
              data-testid="open-add-todo-modal-btn"
              onClick={() => setActiveAddModal('todo')}
              className="h-11 px-4 rounded-xl border border-blue-300 dark:border-blue-800/80 bg-blue-50/80 hover:bg-blue-100/80 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs sm:text-sm font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer"
            >
              <span className="inline-flex items-center gap-2 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Plus className="w-4 h-4" />
                </span>
                <span className="truncate">{t.addTodoButton}</span>
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-900/80 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 shrink-0">
                {completedTodos}/{task.todos.length}
              </span>
            </button>

            <button
              type="button"
              data-testid="open-add-update-modal-btn"
              onClick={() => {
                setUpdateTimestamp(getNowLocalDatetime());
                setActiveAddModal('update');
              }}
              className="h-11 px-4 rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/80 hover:bg-emerald-100/80 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer"
            >
              <span className="inline-flex items-center gap-2 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </span>
                <span className="truncate">{t.postUpdateButton}</span>
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 shrink-0">
                {task.updates.length}
              </span>
            </button>

            <button
              type="button"
              data-testid="open-add-attachment-modal-btn"
              onClick={() => setActiveAddModal('attachment')}
              className="h-11 px-4 rounded-xl border border-indigo-300 dark:border-indigo-800/80 bg-indigo-50/80 hover:bg-indigo-100/80 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 text-xs sm:text-sm font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer"
            >
              <span className="inline-flex items-center gap-2 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Upload className="w-4 h-4" />
                </span>
                <span className="truncate">{t.attachmentsSectionTitle}</span>
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-900/80 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 shrink-0">
                {task.attachments.length}
              </span>
            </button>
          </div>

          {/* SECTION 2: TO-DO CHECKLIST (BLUE OUTLINED CARD) */}
          <section
            aria-labelledby="nested-todo-heading"
            className="rounded-xl border border-blue-200/90 dark:border-blue-900/60 bg-blue-50/20 dark:bg-slate-900/60 p-3.5 sm:p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <button
                type="button"
                onClick={() => setIsTodosCollapsed((prev) => !prev)}
                className="flex items-center gap-2 text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                aria-label={isTodosCollapsed ? t.expandSection : t.collapseSection}
              >
                {isTodosCollapsed ? (
                  <ChevronRight className="w-4 h-4 rtl:rotate-180 text-blue-600 dark:text-blue-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                )}
                <h2 id="nested-todo-heading">
                  {t.todoChecklistTitle} ({completedTodos}/{task.todos.length})
                </h2>
              </button>

              <div className="flex flex-wrap items-center gap-1.5">
                {!isTodosCollapsed && task.todos.length > 0 && (
                  <>
                    <div className="flex items-center gap-1 p-0.5 bg-white dark:bg-slate-800 border border-blue-200/70 dark:border-slate-700 rounded-lg">
                      {(
                        [
                          { id: 'all', label: t.filterAll },
                          { id: 'active', label: t.filterActive },
                          { id: 'completed', label: t.filterCompleted },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setTodoFilter(tab.id)}
                          className={`px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                            todoFilter === tab.id
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <select
                      value={todoSort}
                      onChange={(e) => setTodoSort(e.target.value as any)}
                      aria-label={t.sortBy}
                      className="h-8 px-2 text-[11px] font-medium rounded-lg border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      <option value="default">{t.sortDefault}</option>
                      <option value="incomplete">{t.filterActive}</option>
                      <option value="title">{t.sortTitleAsc}</option>
                      <option value="subTodos">{t.subTodosTitle}</option>
                    </select>
                  </>
                )}

                <button
                  type="button"
                  data-testid="section-add-todo-btn"
                  onClick={() => setActiveAddModal('todo')}
                  className="h-8 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.addTodoButton}</span>
                </button>
              </div>
            </div>

            {!isTodosCollapsed && (
              <>
                {filteredTodos.length === 0 ? (
                  <div className="py-5 px-4 text-center border border-dashed border-blue-200 dark:border-blue-900/60 bg-white/60 dark:bg-slate-900/40 rounded-xl text-xs text-slate-500 flex flex-col items-center gap-2">
                    <span>{t.noTodosYet}</span>
                    <button
                      type="button"
                      onClick={() => setActiveAddModal('todo')}
                      className="h-8 px-3 rounded-lg border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.addTodoButton}</span>
                    </button>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {filteredTodos.map((todo) => {
                      const todoText = resolveLocalizedText(
                        todo.title,
                        todo.localizedTitle,
                        lang
                      );
                      return (
                        <li
                          key={todo.id}
                          className="px-3.5 py-3 rounded-xl border border-blue-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-700 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            {editingTodoId === todo.id ? (
                              <div className="flex items-center gap-1.5 flex-1">
                                <input
                                  type="text"
                                  value={editingTodoTitle}
                                  onChange={(e) => setEditingTodoTitle(e.target.value)}
                                  aria-label={t.editTodoPrompt}
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveTodoEdit(todo.id);
                                    if (e.key === 'Escape') setEditingTodoId(null);
                                  }}
                                  className="flex-1 h-8 px-2.5 text-sm rounded border border-blue-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveTodoEdit(todo.id)}
                                  aria-label={t.saveChanges}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingTodoId(null)}
                                  aria-label={t.cancel}
                                  className="p-1.5 text-slate-400 hover:bg-slate-100 rounded"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                  {todo.subTodos && todo.subTodos.length > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => toggleTodoSubsCollapse(todo.id)}
                                      aria-label={
                                        collapsedTodoSubs[todo.id]
                                          ? t.expandSection
                                          : t.collapseSection
                                      }
                                      className="p-1 -ms-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded cursor-pointer"
                                    >
                                      {collapsedTodoSubs[todo.id] ? (
                                        <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
                                      ) : (
                                        <ChevronDown className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  ) : (
                                    <div className="w-3.5" />
                                  )}
                                  <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 py-0.5">
                                    <input
                                      type="checkbox"
                                      checked={todo.completed}
                                      onChange={() => onToggleTodo(task.id, todo.id)}
                                      aria-label={todoText}
                                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 shrink-0"
                                    />
                                    <span
                                      className={`text-sm leading-snug ${
                                        todo.completed
                                          ? 'line-through text-slate-400 dark:text-slate-500'
                                          : 'text-slate-800 dark:text-slate-200 font-medium'
                                      }`}
                                    >
                                      {todoText}
                                    </span>
                                    {todo.subTodos && todo.subTodos.length > 0 && (
                                      <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 ms-1">
                                        ({todo.subTodos.filter((s) => s.completed).length}/
                                        {todo.subTodos.length})
                                      </span>
                                    )}
                                  </label>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAddingSubTodoForId(
                                        addingSubTodoForId === todo.id ? null : todo.id
                                      );
                                      setNewSubTodoTitle('');
                                    }}
                                    title={t.addSubTodo}
                                    aria-label={`${t.addSubTodo} ${todoText}`}
                                    className={`p-1.5 rounded cursor-pointer transition-colors ${
                                      addingSubTodoForId === todo.id
                                        ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                                        : 'text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'
                                    }`}
                                  >
                                    <CornerDownRight className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveTodoPhotoUploadId(todo.id);
                                      existingTodoPhotoInputRef.current?.click();
                                    }}
                                    title={t.attachTodoPhoto}
                                    aria-label={`${t.attachTodoPhoto} ${todoText}`}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded cursor-pointer"
                                  >
                                    <ImageIcon className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingTodoId(todo.id);
                                      setEditingTodoTitle(todoText);
                                    }}
                                    aria-label={`${t.edit} ${todoText}`}
                                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded cursor-pointer"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onDeleteTodo(task.id, todo.id)}
                                    aria-label={`${t.delete} ${todoText}`}
                                    className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Sub-Todos Section */}
                          {((todo.subTodos &&
                            todo.subTodos.length > 0 &&
                            !collapsedTodoSubs[todo.id]) ||
                            addingSubTodoForId === todo.id) && (
                            <div className="mt-2.5 ms-3 sm:ms-6 p-2.5 rounded-lg border border-blue-100 dark:border-slate-800 bg-blue-50/30 dark:bg-slate-950/50 space-y-2">
                              {todo.subTodos &&
                                todo.subTodos.length > 0 &&
                                !collapsedTodoSubs[todo.id] && (
                                  <ul className="space-y-1.5">
                                    {todo.subTodos.map((sub) => {
                                      const subText = resolveLocalizedText(
                                        sub.title,
                                        sub.localizedTitle,
                                        lang
                                      );
                                      return (
                                        <li
                                          key={sub.id}
                                          className="flex items-center justify-between gap-2 py-1 px-2 rounded-md hover:bg-white dark:hover:bg-slate-800/60 text-xs"
                                        >
                                          {editingSubTodoId === sub.id ? (
                                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                              <input
                                                type="text"
                                                value={editingSubTodoTitle}
                                                onChange={(e) =>
                                                  setEditingSubTodoTitle(e.target.value)
                                                }
                                                aria-label={t.editSubTodoPrompt}
                                                autoFocus
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter')
                                                    handleSaveSubTodoEdit(todo.id, sub.id);
                                                  if (e.key === 'Escape')
                                                    setEditingSubTodoId(null);
                                                }}
                                                className="flex-1 min-w-0 h-7 px-2 text-xs rounded border border-blue-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                                              />
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleSaveSubTodoEdit(todo.id, sub.id)
                                                }
                                                aria-label={t.saveChanges}
                                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded shrink-0"
                                              >
                                                <Check className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setEditingSubTodoId(null)}
                                                aria-label={t.cancel}
                                                className="p-1 text-slate-400 hover:bg-slate-100 rounded shrink-0"
                                              >
                                                <X className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          ) : (
                                            <>
                                              <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                                                <input
                                                  type="checkbox"
                                                  checked={sub.completed}
                                                  onChange={() =>
                                                    onToggleSubTodo &&
                                                    onToggleSubTodo(task.id, todo.id, sub.id)
                                                  }
                                                  aria-label={subText}
                                                  className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-600 text-blue-600 shrink-0"
                                                />
                                                <span
                                                  className={`leading-snug break-words ${
                                                    sub.completed
                                                      ? 'line-through text-slate-400 dark:text-slate-500'
                                                      : 'text-slate-700 dark:text-slate-300'
                                                  }`}
                                                >
                                                  {subText}
                                                </span>
                                              </label>
                                              <div className="flex items-center gap-0.5 shrink-0 opacity-80 hover:opacity-100">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setEditingSubTodoId(sub.id);
                                                    setEditingSubTodoTitle(subText);
                                                  }}
                                                  aria-label={`${t.edit} ${subText}`}
                                                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded cursor-pointer"
                                                >
                                                  <Pencil className="w-3 h-3" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    onDeleteSubTodo &&
                                                    onDeleteSubTodo(task.id, todo.id, sub.id)
                                                  }
                                                  aria-label={`${t.delete} ${subText}`}
                                                  className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded cursor-pointer"
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </button>
                                              </div>
                                            </>
                                          )}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}

                              {addingSubTodoForId === todo.id ? (
                                <form
                                  onSubmit={(e) => handleAddSubTodoSubmit(todo.id, e)}
                                  className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 pt-1"
                                >
                                  <input
                                    type="text"
                                    value={newSubTodoTitle}
                                    onChange={(e) => setNewSubTodoTitle(e.target.value)}
                                    placeholder={t.subTodoInputPlaceholder}
                                    aria-label={t.subTodoInputPlaceholder}
                                    autoFocus
                                    className="w-full sm:w-auto sm:flex-1 min-w-0 h-7 px-2.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                                  />
                                  <button
                                    type="submit"
                                    className="h-7 px-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded inline-flex items-center gap-1 shrink-0 cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>{t.addSubTodo}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAddingSubTodoForId(null);
                                      setNewSubTodoTitle('');
                                    }}
                                    className="h-7 px-2 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white rounded"
                                  >
                                    {t.cancel}
                                  </button>
                                </form>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAddingSubTodoForId(todo.id);
                                    setNewSubTodoTitle('');
                                  }}
                                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline pt-0.5 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>{t.addSubTodo}</span>
                                </button>
                              )}
                            </div>
                          )}

                          {/* Photos attached to this To-Do item */}
                          {renderSectionPhotoGrid(
                            todo.photos,
                            'todo',
                            todo.id,
                            (photoId) => onDeletePhotoFromTodo(task.id, todo.id, photoId)
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </section>

          {/* SECTION 3: TASK UPDATES (EMERALD OUTLINED CARD) */}
          <section
            aria-labelledby="task-updates-heading"
            className="rounded-xl border border-emerald-200/90 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-slate-900/60 p-3.5 sm:p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <button
                type="button"
                onClick={() => setIsUpdatesCollapsed((prev) => !prev)}
                className="flex items-center gap-2 text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
                aria-label={isUpdatesCollapsed ? t.expandSection : t.collapseSection}
              >
                {isUpdatesCollapsed ? (
                  <ChevronRight className="w-4 h-4 rtl:rotate-180 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                )}
                <h2 id="task-updates-heading">
                  {t.updatesSectionTitle} ({displayedUpdates.length}
                  {displayedUpdates.length !== task.updates.length
                    ? ` / ${task.updates.length}`
                    : ''}
                  )
                </h2>
              </button>

              <div className="flex flex-wrap items-center gap-1.5">
                {!isUpdatesCollapsed && task.updates.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setUpdatesWithPhotosOnly((prev) => !prev)}
                      className={`h-8 px-2.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                        updatesWithPhotosOnly
                          ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-400 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                          : 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{t.filterWithPhotosOnly}</span>
                    </button>
                    <select
                      value={updatesSort}
                      onChange={(e) => setUpdatesSort(e.target.value as any)}
                      aria-label={t.sortBy}
                      className="h-8 px-2 text-[11px] font-medium rounded-lg border border-emerald-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      <option value="newest">{t.sortNewest}</option>
                      <option value="oldest">{t.sortOldest}</option>
                    </select>
                  </>
                )}

                <button
                  type="button"
                  data-testid="section-add-update-btn"
                  onClick={() => {
                    setUpdateTimestamp(getNowLocalDatetime());
                    setActiveAddModal('update');
                  }}
                  className="h-8 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.postUpdateButton}</span>
                </button>
              </div>
            </div>

            {!isUpdatesCollapsed && (
              <>
                {task.updates.length === 0 ? (
                  <div className="py-5 px-4 text-center border border-dashed border-emerald-200 dark:border-emerald-900/60 bg-white/60 dark:bg-slate-900/40 rounded-xl text-xs text-slate-500 flex flex-col items-center gap-2">
                    <span>{t.noUpdatesYet}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setUpdateTimestamp(getNowLocalDatetime());
                        setActiveAddModal('update');
                      }}
                      className="h-8 px-3 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.postUpdateButton}</span>
                    </button>
                  </div>
                ) : displayedUpdates.length === 0 ? (
                  <div className="py-5 px-4 text-center border border-dashed border-emerald-200 dark:border-emerald-900/60 rounded-xl text-xs text-slate-500 space-y-1">
                    <p>{t.noMatchingTasks}</p>
                    <button
                      type="button"
                      onClick={() => setUpdatesWithPhotosOnly(false)}
                      className="text-emerald-600 hover:underline cursor-pointer"
                    >
                      {t.resetFilters}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {displayedUpdates.map((upd) => {
                      const updText = resolveLocalizedText(
                        upd.content,
                        upd.localizedContent,
                        lang
                      );
                      return (
                        <div
                          key={upd.id}
                          className="p-3.5 rounded-xl border border-emerald-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-400 dark:hover:border-emerald-700 transition-colors"
                        >
                          {editingUpdateId === upd.id ? (
                            <div className="space-y-2.5">
                              <textarea
                                rows={2}
                                value={editUpdateContent}
                                onChange={(e) => setEditUpdateContent(e.target.value)}
                                className="w-full p-2.5 text-sm rounded-lg border border-emerald-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                              />
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input
                                  type="datetime-local"
                                  value={editUpdateTimestamp}
                                  onChange={(e) => setEditUpdateTimestamp(e.target.value)}
                                  className="h-8 px-2 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                                />
                                <input
                                  type="text"
                                  value={editUpdateAuthor}
                                  onChange={(e) => setEditUpdateAuthor(e.target.value)}
                                  className="h-8 px-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                                />
                              </div>
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleSaveUpdateEdit(upd.id)}
                                  className="h-8 px-3 bg-emerald-600 text-white text-xs font-semibold rounded-lg"
                                >
                                  {t.saveChanges}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingUpdateId(null)}
                                  className="h-8 px-2.5 text-xs text-slate-500"
                                >
                                  {t.cancel}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => toggleUpdateCollapse(upd.id)}
                                    aria-label={
                                      collapsedUpdates[upd.id]
                                        ? t.expandSection
                                        : t.collapseSection
                                    }
                                    className="p-1 -ms-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded cursor-pointer shrink-0"
                                  >
                                    {collapsedUpdates[upd.id] ? (
                                      <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
                                    ) : (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 min-w-0">
                                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                      {upd.author}
                                    </span>
                                    <span aria-hidden="true">·</span>
                                    <span className="font-mono tabular-nums text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1 shrink-0">
                                      <Calendar className="w-3 h-3" />
                                      {formatDateTimeStamp(upd.timestamp)}
                                    </span>
                                    {upd.photos && upd.photos.length > 0 && (
                                      <>
                                        <span aria-hidden="true">·</span>
                                        <span className="text-[11px] text-slate-400 inline-flex items-center gap-1">
                                          <ImageIcon className="w-3 h-3 text-emerald-500" />
                                          {upd.photos.length}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveUpdatePhotoUploadId(upd.id);
                                      existingUpdatePhotoInputRef.current?.click();
                                    }}
                                    title={t.attachUpdatePhoto}
                                    aria-label={`${t.attachUpdatePhoto} update`}
                                    className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded cursor-pointer"
                                  >
                                    <ImageIcon className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingUpdateId(upd.id);
                                      setEditUpdateContent(updText);
                                      setEditUpdateTimestamp(upd.timestamp);
                                      setEditUpdateAuthor(upd.author);
                                    }}
                                    aria-label={`${t.edit} update`}
                                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded cursor-pointer"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onDeleteUpdate(task.id, upd.id)}
                                    aria-label={`${t.delete} update`}
                                    className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              {collapsedUpdates[upd.id] ? (
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">
                                  {updText}
                                </p>
                              ) : (
                                <>
                                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                    {updText}
                                  </p>
                                  {/* Photos attached to this Task Update */}
                                  {renderSectionPhotoGrid(
                                    upd.photos,
                                    'update',
                                    upd.id,
                                    (photoId) =>
                                      onDeletePhotoFromUpdate(task.id, upd.id, photoId)
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </section>

          {/* SECTION 4: PHOTOS & FILES (INDIGO OUTLINED CARD) */}
          <section
            aria-labelledby="attachments-heading"
            className="rounded-xl border border-indigo-200/90 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-slate-900/60 p-3.5 sm:p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <button
                type="button"
                onClick={() => setIsAttachmentsCollapsed((prev) => !prev)}
                className="flex items-center gap-2 text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                aria-label={isAttachmentsCollapsed ? t.expandSection : t.collapseSection}
              >
                {isAttachmentsCollapsed ? (
                  <ChevronRight className="w-4 h-4 rtl:rotate-180 text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                )}
                <h2 id="attachments-heading">
                  {t.attachmentsSectionTitle} ({task.attachments.length})
                </h2>
              </button>

              <div className="flex flex-wrap items-center gap-1.5">
                {!isAttachmentsCollapsed && task.attachments.length > 0 && (
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-indigo-200/70 dark:border-slate-700 p-0.5 rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => setAttachmentFilter('all')}
                      className={`px-2 py-1 rounded-md font-medium transition cursor-pointer ${
                        attachmentFilter === 'all'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    >
                      {t.filterAll}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttachmentFilter('photo')}
                      className={`px-2 py-1 rounded-md font-medium transition cursor-pointer ${
                        attachmentFilter === 'photo'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    >
                      {t.filterPhotosOnly}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttachmentFilter('file')}
                      className={`px-2 py-1 rounded-md font-medium transition cursor-pointer ${
                        attachmentFilter === 'file'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    >
                      {t.filterFilesOnly}
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  data-testid="section-add-attachment-btn"
                  onClick={() => setActiveAddModal('attachment')}
                  className="h-8 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.uploadPhotoButton}</span>
                </button>
              </div>
            </div>

            {!isAttachmentsCollapsed && (
              <>
                {task.attachments.length === 0 ? (
                  <div className="py-5 px-4 text-center border border-dashed border-indigo-200 dark:border-indigo-900/60 bg-white/60 dark:bg-slate-900/40 rounded-xl text-xs text-slate-500 flex flex-col items-center gap-2">
                    <span>{t.noAttachmentsYet}</span>
                    <button
                      type="button"
                      onClick={() => setActiveAddModal('attachment')}
                      className="h-8 px-3 rounded-lg border border-indigo-300 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {t.uploadPhotoButton} / {t.attachFileButton}
                      </span>
                    </button>
                  </div>
                ) : displayedAttachments.length === 0 ? (
                  <div className="py-5 px-4 text-center border border-dashed border-indigo-200 dark:border-indigo-900/60 rounded-xl text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                    <span>{t.noMatchingTasks}</span>
                    <button
                      type="button"
                      onClick={() => setAttachmentFilter('all')}
                      className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded font-medium cursor-pointer"
                    >
                      {t.resetFilters}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {displayedAttachments.map((att) => {
                      const attCaption = resolveLocalizedText(
                        att.caption || '',
                        att.localizedCaption,
                        lang
                      );
                      const attTargetRef: PhotoTargetRef = {
                        section: 'attachment',
                        photoId: att.id,
                      };
                      return (
                        <div
                          key={att.id}
                          className="border border-indigo-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 flex flex-col justify-between transition-colors"
                        >
                          {att.type === 'photo' ? (
                            <div className="relative h-36 bg-slate-100 dark:bg-slate-800 overflow-hidden group">
                              <img
                                src={att.url}
                                alt={attCaption || att.name}
                                referrerPolicy="no-referrer"
                                onClick={() =>
                                  setPreviewPhoto({ photo: att, target: attTargetRef })
                                }
                                className="w-full h-full object-cover cursor-pointer"
                              />
                              {att.annotatedAt && (
                                <span className="absolute top-2 start-2 px-2 py-0.5 bg-blue-600/90 text-white text-[10px] font-semibold rounded">
                                  {t.annotatedBadge}
                                </span>
                              )}
                              <div className="absolute bottom-2 end-2 flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAnnotatingState({ photo: att, target: attTargetRef })
                                  }
                                  aria-label={`${t.annotatePhoto} ${att.name}`}
                                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold rounded-md inline-flex items-center gap-1 shadow-xs cursor-pointer"
                                >
                                  <PenTool className="w-3 h-3" />
                                  <span>{t.annotatePhoto}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewPhoto({ photo: att, target: attTargetRef })
                                  }
                                  className="px-2.5 py-1 bg-black/75 text-white text-[11px] font-medium rounded-md cursor-pointer"
                                >
                                  {t.inspectPhoto}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              onClick={() => setPreviewFile(att)}
                              className="p-3.5 bg-indigo-50/40 dark:bg-slate-800/50 hover:bg-indigo-100/50 dark:hover:bg-slate-800 flex items-center justify-between gap-3 border-b border-indigo-100 dark:border-slate-800 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="w-9 h-9 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                                    {att.name}
                                  </div>
                                  <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                                    {formatFileSize(att.sizeBytes)}
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                data-testid={`preview-file-btn-${att.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewFile(att);
                                }}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold rounded-md inline-flex items-center gap-1 shrink-0 cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>{t.previewFileButton}</span>
                              </button>
                            </div>
                          )}

                          <div className="p-3">
                            {editingAttId === att.id ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={editAttName}
                                  onChange={(e) => setEditAttName(e.target.value)}
                                  className="w-full h-8 px-2 text-xs rounded border border-indigo-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                                />
                                <input
                                  type="text"
                                  value={editAttCaption}
                                  onChange={(e) => setEditAttCaption(e.target.value)}
                                  placeholder={t.attachmentCaptionPlaceholder}
                                  className="w-full h-8 px-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                                />
                                <div className="flex justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveAttachmentEdit(att.id)}
                                    className="h-7 px-2.5 bg-indigo-600 text-white text-[11px] rounded"
                                  >
                                    {t.saveChanges}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingAttId(null)}
                                    className="h-7 px-2 text-[11px] text-slate-500"
                                  >
                                    {t.cancel}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                                    {att.name}
                                  </div>
                                  {attCaption && (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                      {attCaption}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-0.5 shrink-0">
                                  {att.type === 'photo' ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setAnnotatingState({
                                          photo: att,
                                          target: attTargetRef,
                                        })
                                      }
                                      title={t.annotatePhoto}
                                      aria-label={`${t.annotatePhoto} ${att.name}`}
                                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded cursor-pointer"
                                    >
                                      <PenTool className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setPreviewFile(att)}
                                      title={t.previewFileButton}
                                      aria-label={`${t.previewFileButton} ${att.name}`}
                                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded cursor-pointer"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingAttId(att.id);
                                      setEditAttName(att.name);
                                      setEditAttCaption(attCaption);
                                    }}
                                    aria-label={`${t.edit} ${att.name}`}
                                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded cursor-pointer"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <a
                                    href={att.url}
                                    download={att.name}
                                    aria-label={`${t.download} ${att.name}`}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => onDeleteAttachment(task.id, att.id)}
                                    aria-label={`${t.delete} ${att.name}`}
                                    className="p-1.5 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      {/* POPUP MODAL 1: ADD TO-DO WINDOW */}
      {activeAddModal === 'todo' && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="add-todo-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setActiveAddModal(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3.5 bg-blue-50/80 dark:bg-blue-950/50 border-b border-blue-200 dark:border-blue-900 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Plus className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t.addTodoButton}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveAddModal(null)}
                aria-label={t.cancel}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleTodoSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.todoChecklistTitle}
                </label>
                <input
                  type="text"
                  value={newTodoTitle}
                  onChange={(e) => setNewTodoTitle(e.target.value)}
                  placeholder={t.todoInputPlaceholder}
                  aria-label={t.todoInputPlaceholder}
                  autoFocus
                  className="w-full h-10 px-3.5 text-sm rounded-xl border border-blue-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>

              <input
                ref={newTodoPhotoInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  readImageFilesAsPayloads(e.target.files, (items) => {
                    setStagedTodoPhotos((prev) => [...prev, ...items]);
                  });
                  e.target.value = '';
                }}
                className="hidden"
              />

              {stagedTodoPhotos.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {stagedTodoPhotos.map((sp, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300"
                    >
                      <img
                        src={sp.url}
                        alt={sp.name}
                        className="w-6 h-6 rounded object-cover"
                      />
                      <span className="max-w-[140px] truncate">{sp.name}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setStagedTodoPhotos((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="p-0.5 hover:text-rose-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => newTodoPhotoInputRef.current?.click()}
                  aria-label={t.attachTodoPhoto}
                  className="h-9 px-3 rounded-lg border border-blue-200 dark:border-slate-700 bg-blue-50/50 dark:bg-slate-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100/70 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 shrink-0" />
                  <span>{t.attachTodoPhoto}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveAddModal(null)}
                    className="h-9 px-3 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="h-9 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t.addTodoButton}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP MODAL 2: ADD TASK UPDATE WINDOW */}
      {activeAddModal === 'update' && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="add-update-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setActiveAddModal(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3.5 bg-emerald-50/80 dark:bg-emerald-950/50 border-b border-emerald-200 dark:border-emerald-900 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t.postUpdateButton}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveAddModal(null)}
                aria-label={t.cancel}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="p-4 space-y-3.5">
              <div>
                <textarea
                  rows={3}
                  value={updateContent}
                  onChange={(e) => setUpdateContent(e.target.value)}
                  placeholder={t.updateInputPlaceholder}
                  aria-label={t.updateInputPlaceholder}
                  autoFocus
                  className="w-full p-3 text-sm rounded-xl border border-emerald-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t.updateDateTimeLabel}
                  </label>
                  <input
                    type="datetime-local"
                    value={updateTimestamp}
                    onChange={(e) => setUpdateTimestamp(e.target.value)}
                    aria-label={t.updateDateTimeLabel}
                    className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t.updateAuthorLabel}
                  </label>
                  <input
                    type="text"
                    value={updateAuthor}
                    onChange={(e) => setUpdateAuthor(e.target.value)}
                    aria-label={t.updateAuthorLabel}
                    className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <input
                ref={newUpdatePhotoInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  readImageFilesAsPayloads(e.target.files, (items) => {
                    setStagedUpdatePhotos((prev) => [...prev, ...items]);
                  });
                  e.target.value = '';
                }}
                className="hidden"
              />

              {stagedUpdatePhotos.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {stagedUpdatePhotos.map((sp, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300"
                    >
                      <img
                        src={sp.url}
                        alt={sp.name}
                        className="w-6 h-6 rounded object-cover"
                      />
                      <span className="max-w-[150px] truncate">{sp.name}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setStagedUpdatePhotos((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                        className="p-0.5 hover:text-rose-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => newUpdatePhotoInputRef.current?.click()}
                  className="h-9 px-3 rounded-lg border border-emerald-200 dark:border-slate-700 bg-emerald-50/50 dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/70 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{t.attachUpdatePhoto}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveAddModal(null)}
                    className="h-9 px-3 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="h-9 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{t.postUpdateButton}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP MODAL 3: ADD PHOTOS & FILES WINDOW */}
      {activeAddModal === 'attachment' && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="add-attachment-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setActiveAddModal(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-indigo-300 dark:border-indigo-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3.5 bg-indigo-50/80 dark:bg-indigo-950/50 border-b border-indigo-200 dark:border-indigo-900 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Upload className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t.attachmentsSectionTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveAddModal(null)}
                aria-label={t.cancel}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  {t.attachmentCaptionPlaceholder}
                </label>
                <input
                  type="text"
                  value={attachmentCaption}
                  onChange={(e) => setAttachmentCaption(e.target.value)}
                  placeholder={t.attachmentCaptionPlaceholder}
                  aria-label={t.attachmentCaptionPlaceholder}
                  autoFocus
                  className="w-full h-10 px-3 text-xs rounded-xl border border-indigo-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>

              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFileUpload(e, 'photo')}
                className="hidden"
              />
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => handleFileUpload(e, 'file')}
                className="hidden"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="h-11 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>{t.uploadPhotoButton}</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-11 px-4 bg-indigo-50 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>{t.attachFileButton}</span>
                </button>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveAddModal(null)}
                  className="h-8 px-3 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Lightbox Modal with Direct Annotate Button */}
      {previewPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="max-w-3xl w-full bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                {previewPhoto.photo.name}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const current = previewPhoto;
                    setPreviewPhoto(null);
                    setAnnotatingState(current);
                  }}
                  className="h-8 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>{t.annotatePhoto}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPhoto(null)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="bg-slate-950 flex items-center justify-center max-h-[70vh] overflow-hidden">
              <img
                src={previewPhoto.photo.url}
                alt={previewPhoto.photo.name}
                referrerPolicy="no-referrer"
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Uploaded File Preview Modal */}
      {previewFile && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="file-preview-modal"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="max-w-3xl w-full max-h-[90dvh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {previewFile.name}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                    {formatFileSize(previewFile.sizeBytes)} · {previewFile.mimeType || 'application/octet-stream'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewFile.url}
                  download={previewFile.name}
                  className="h-8 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t.download}</span>
                </a>
                <button
                  type="button"
                  data-testid="close-file-preview-btn"
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-50 dark:bg-slate-950">
              {(() => {
                const kind = resolveFilePreviewKind(previewFile);
                const decodedText =
                  kind === 'text' ? decodeDataUrlTextPreview(previewFile.url) : null;

                if (kind === 'pdf' && previewFile.url && previewFile.url !== '#') {
                  return (
                    <iframe
                      src={previewFile.url}
                      title={previewFile.name}
                      className="w-full h-[65vh] rounded-xl border border-slate-200 dark:border-slate-800 bg-white"
                    />
                  );
                }

                if (kind === 'image' && previewFile.url && previewFile.url !== '#') {
                  return (
                    <div className="flex items-center justify-center bg-slate-900 rounded-xl p-3">
                      <img
                        src={previewFile.url}
                        alt={previewFile.name}
                        className="max-h-[65vh] w-auto object-contain rounded-lg"
                      />
                    </div>
                  );
                }

                if (kind === 'audio' && previewFile.url && previewFile.url !== '#') {
                  return (
                    <div className="py-10 flex flex-col items-center justify-center gap-4">
                      <audio src={previewFile.url} controls className="w-full max-w-md" />
                    </div>
                  );
                }

                if (kind === 'video' && previewFile.url && previewFile.url !== '#') {
                  return (
                    <div className="flex items-center justify-center bg-slate-900 rounded-xl p-3">
                      <video
                        src={previewFile.url}
                        controls
                        className="max-h-[65vh] w-auto rounded-lg"
                      />
                    </div>
                  );
                }

                if (decodedText !== null) {
                  return (
                    <pre
                      data-testid="file-preview-text-content"
                      className="w-full max-h-[60vh] overflow-auto p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words leading-relaxed"
                    >
                      {decodedText}
                    </pre>
                  );
                }

                return (
                  <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {previewFile.name}
                      </div>
                      {previewFile.caption && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {resolveLocalizedText(
                            previewFile.caption,
                            previewFile.localizedCaption,
                            lang
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800">
                        {formatFileSize(previewFile.sizeBytes)}
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800">
                        {previewFile.mimeType || 'application/octet-stream'}
                      </span>
                      {previewFile.addedAt && (
                        <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800">
                          {formatDateTimeStamp(previewFile.addedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Photo Annotation Studio Modal */}
      <PhotoAnnotationModal
        photo={annotatingState?.photo || null}
        lang={lang}
        t={t}
        onClose={() => setAnnotatingState(null)}
        onSaveAnnotation={(annotatedDataUrl, updatedCaption) => {
          if (annotatingState) {
            onAnnotatePhoto(
              task.id,
              annotatingState.target,
              annotatedDataUrl,
              updatedCaption
            );
          }
          setAnnotatingState(null);
        }}
      />
    </div>
  );
};
