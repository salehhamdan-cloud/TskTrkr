import { LanguageCode, LocalizedText, TaskPriority, TaskStatus } from '../types/task';

export interface TranslationDictionary {
  appName: string;
  sidebarTitle: string;
  dashboardNav: string;
  settingsNav: string;
  foldersHeader: string;
  addFolder: string;
  folderNamePlaceholder: string;
  editFolder: string;
  deleteFolder: string;
  addProject: string;
  projectNamePlaceholder: string;
  projectDescPlaceholder: string;
  editProject: string;
  deleteProject: string;
  addTask: string;
  newTaskButton: string;
  editTask: string;
  deleteTask: string;
  saveChanges: string;
  cancel: string;
  create: string;
  edit: string;
  delete: string;
  backToFolder: string;
  backToProject: string;
  projectsInFolder: string;
  tasksInProject: string;
  noProjectsYet: string;
  noTasksYet: string;
  progressLabel: string;
  manualProgressLabel: string;
  autoSyncedFromTodos: string;
  manualProgressHint: string;
  statusLabel: string;
  priorityLabel: string;
  dueDateLabel: string;
  statusTodo: string;
  statusInProgress: string;
  statusReview: string;
  statusCompleted: string;
  priorityLow: string;
  priorityMedium: string;
  priorityHigh: string;
  priorityCritical: string;
  todoChecklistTitle: string;
  todoInputPlaceholder: string;
  addTodoButton: string;
  noTodosYet: string;
  editTodoPrompt: string;
  filterAll: string;
  filterActive: string;
  filterCompleted: string;
  updatesSectionTitle: string;
  updateInputPlaceholder: string;
  updateDateTimeLabel: string;
  updateAuthorLabel: string;
  postUpdateButton: string;
  noUpdatesYet: string;
  attachmentsSectionTitle: string;
  attachmentCaptionPlaceholder: string;
  uploadPhotoButton: string;
  attachFileButton: string;
  noAttachmentsYet: string;
  inspectPhoto: string;
  download: string;
  dashboardTitle: string;
  dashboardSubtitle: string;
  overallCompletion: string;
  tasksCompletedCount: string;
  subtasksDoneTitle: string;
  checklistRatio: string;
  activeTasksTitle: string;
  updatesAndMediaTitle: string;
  projectBreakdownTitle: string;
  taskOverviewTitle: string;
  recentUpdatesTitle: string;
  offlineSyncBadge: string;
  darkTheme: string;
  lightTheme: string;
  languageLabel: string;
  taskTitleLabel: string;
  taskDescLabel: string;
  itemsCount: string;
  updatesCount: string;
  photosCount: string;
  filesCount: string;
  openMenu: string;
  closeMenu: string;
  globalSearchPlaceholder: string;
  noSearchResults: string;
  folderTypeLabel: string;
  projectTypeLabel: string;
  taskTypeLabel: string;
  exportPdfButton: string;
  settingsTitle: string;
  settingsSubtitle: string;
  languageSectionTitle: string;
  languageSectionDesc: string;
  appearanceSectionTitle: string;
  backupRestoreTitle: string;
  backupRestoreDesc: string;
  exportBackupButton: string;
  restoreBackupButton: string;
  resetDefaultDataButton: string;
  backupRestoredSuccess: string;
  backupRestoreError: string;
  storageFootprintLabel: string;
  totalEntitiesLabel: string;
  annotatePhoto: string;
  annotatedBadge: string;
  annotationStudioTitle: string;
  toolPen: string;
  toolArrow: string;
  toolRect: string;
  toolText: string;
  annotationTextPlaceholder: string;
  undoAction: string;
  clearAnnotations: string;
  saveAnnotatedPhoto: string;
  attachTodoPhoto: string;
  attachUpdatePhoto: string;
  addSubTodo: string;
  subTodoInputPlaceholder: string;
  subTodosTitle: string;
  editSubTodoPrompt: string;
  deleteSubTodo: string;
  appSubtitle: string;
  collapseSection: string;
  expandSection: string;
  collapseAll: string;
  expandAll: string;
  sortBy: string;
  filterBy: string;
  filterStatus: string;
  filterPriority: string;
  filterDate: string;
  filterAllDates: string;
  filterOverdue: string;
  filterDueToday: string;
  filterUpcoming: string;
  filterSearchPlaceholder: string;
  resetFilters: string;
  sortDefault: string;
  sortDueDateAsc: string;
  sortDueDateDesc: string;
  sortPriorityHigh: string;
  sortPriorityLow: string;
  sortProgressDesc: string;
  sortProgressAsc: string;
  sortTitleAsc: string;
  sortTitleDesc: string;
  sortNewest: string;
  sortOldest: string;
  filterWithPhotosOnly: string;
  activeFiltersCount: string;
  noMatchingTasks: string;
  sortProjectsBy: string;
  sortByName: string;
  sortByProgress: string;
  sortByTaskCount: string;
  filterPhotosOnly: string;
  filterFilesOnly: string;
  filterAllProjects: string;
  filterActiveProjects: string;
  filterCompletedProjects: string;
  installAppTitle: string;
  installAppDesc: string;
  installAppButton: string;
  installOnIOSButton: string;
  installedBadge: string;
  iosInstallModalTitle: string;
  iosInstallStep1: string;
  iosInstallStep2: string;
  privatePublishTitle: string;
  privatePublishDesc: string;
  privateStep1Title: string;
  privateStep1Desc: string;
  privateStep2Title: string;
  privateStep2Desc: string;
  privateStep3Title: string;
  privateStep3Desc: string;
  navDashboard: string;
  navWorkspace: string;
  navNewTask: string;
  navSettings: string;
  lockScreenTitle: string;
  lockScreenSubtitle: string;
  passwordPlaceholder: string;
  unlockButton: string;
  invalidPasswordError: string;
  lockAppButton: string;
  passwordSectionTitle: string;
  passwordSectionDesc: string;
  currentPasswordLabel: string;
  newPasswordLabel: string;
  confirmPasswordLabel: string;
  updatePasswordButton: string;
  passwordUpdatedSuccess: string;
  passwordMismatchError: string;
  ghPagesTitle: string;
  ghPagesDesc: string;
  ghPagesReadyBadge: string;
  ghPagesStep1Title: string;
  ghPagesStep1Desc: string;
  ghPagesStep2Title: string;
  ghPagesStep2Desc: string;
  ghPagesStep3Title: string;
  ghPagesStep3Desc: string;
  // Confirm Delete Modal
  confirmDeleteTitle: string;
  confirmDeleteMoveToTrashDesc: string;
  confirmDeletePermanentDesc: string;
  confirmDeleteButton: string;
  confirmMoveToTrashButton: string;
  confirmEmptyTrashTitle: string;
  confirmEmptyTrashDesc: string;
  confirmResetDemoTitle: string;
  confirmResetDemoDesc: string;
  // Trash Section
  trashNav: string;
  trashTitle: string;
  trashSubtitle: string;
  trashEmptyState: string;
  restoreItemButton: string;
  deletePermanentlyButton: string;
  emptyTrashButton: string;
  deletedAtLabel: string;
  trashFilterAll: string;
  trashFilterFoldersProjects: string;
  trashFilterTasks: string;
  trashFilterTodos: string;
  trashFilterUpdatesMedia: string;
  itemRestoredToast: string;
  itemMovedToTrashToast: string;
  todoTypeLabel: string;
  subTodoTypeLabel: string;
  updateTypeLabel: string;
  attachmentTypeLabel: string;
  // Notification Center & Due Reminders
  notificationsNav: string;
  notificationsTitle: string;
  notificationsSubtitle: string;
  noNotificationsYet: string;
  markAllReadButton: string;
  clearNotificationsButton: string;
  checkRemindersNowButton: string;
  enableBrowserNotifications: string;
  browserNotificationsEnabled: string;
  notifFilterAll: string;
  notifFilterReminders: string;
  notifFilterUpdates: string;
  notifFilterUnread: string;
  overdueReminderTitle: string;
  dueTodayReminderTitle: string;
  dueTomorrowReminderTitle: string;
  dueTimeLabel: string;
  notifCreatedLabel: string;
  notifUpdatedLabel: string;
  notifCompletedLabel: string;
  notifMovedToTrashLabel: string;
  notifRestoredLabel: string;
  // Local Folder Auto-Overwrite Sync
  localFolderSyncTitle: string;
  localFolderSyncDesc: string;
  chooseSaveFolderButton: string;
  changeSaveFolderButton: string;
  overwriteSaveNowButton: string;
  loadFromFolderButton: string;
  disconnectFolderButton: string;
  connectedFolderLabel: string;
  overwrittenFileLabel: string;
  lastOverwrittenLabel: string;
  overwriteCountLabel: string;
  autoOverwriteActiveBadge: string;
  folderNameInputPlaceholder: string;
  localFolderConnectedSuccess: string;
  localFolderOverwrittenSuccess: string;
  folderPickerModalTitle: string;
  folderPickerModalSubtitle: string;
  folderPickerDeviceFoldersHeading: string;
  folderPickerCreateNewLabel: string;
  folderPickerNewFolderPlaceholder: string;
  folderPickerSelectButton: string;
  folderPickerOpenNativeFilesButton: string;
  folderPickerShareToFilesButton: string;
  folderPickerBrowseFolderButton: string;
  folderPickerPickIphoneFilesButton: string;
  scanningFolderLabel: string;
  folderBackupDetectedBadge: string;
  noBackupInFolderNote: string;
  confirmLoadBackupTitle: string;
  confirmLoadBackupWarning: string;
  backupFileDetailsLabel: string;
  backupDataSummaryLabel: string;
  currentDataSummaryLabel: string;
  confirmDeleteOldAndLoadButton: string;
  noBackupFoundNoJsonError: string;
  previewFileButton: string;
  filePreviewModalTitle: string;
  // Move Tasks & Groups
  moveTaskButton: string;
  moveGroupButton: string;
  moveTaskModalTitle: string;
  moveGroupModalTitle: string;
  moveSelectDestinationGroup: string;
  moveSelectDestinationFolder: string;
  currentLocationBadge: string;
  tasksWillMoveNote: string;
  confirmMoveButton: string;
  notifMovedLabel: string;
  // Google Drive Cloud Folder Backup
  googleDriveBackupTitle: string;
  googleDriveBackupDesc: string;
  signInWithGoogleButton: string;
  signOutGoogleButton: string;
  signedInAsLabel: string;
  chooseDriveFolderButton: string;
  driveFolderModalTitle: string;
  driveFolderModalSubtitle: string;
  myDriveRootLabel: string;
  driveSearchPlaceholder: string;
  createDriveFolderPlaceholder: string;
  backupToDriveNowButton: string;
  loadFromDriveButton: string;
  driveConnectedBadge: string;
  confirmDriveUploadTitle: string;
  confirmDriveUploadOverwriteDesc: string;
  confirmDriveUploadCreateDesc: string;
  confirmDriveUploadButton: string;
  driveBackupSavedSuccess: string;
  driveAuthExpiredError: string;
  driveNoFoldersFound: string;
}

export const TRANSLATIONS: Record<LanguageCode, TranslationDictionary> = {
  en: {
    appName: 'Task Tracker',
    appSubtitle: 'Offline Project & Task Manager',
    sidebarTitle: 'Workspace Navigation',
    dashboardNav: 'Completion Dashboard',
    settingsNav: 'Settings & Backup',
    foldersHeader: 'Folders & Projects',
    addFolder: 'Add Folder',
    folderNamePlaceholder: 'Folder name...',
    editFolder: 'Edit Folder',
    deleteFolder: 'Delete Folder',
    addProject: 'Add Project / Group',
    projectNamePlaceholder: 'Project or group name...',
    projectDescPlaceholder: 'Short project description...',
    editProject: 'Edit Project',
    deleteProject: 'Delete Project',
    addTask: 'Add Task',
    newTaskButton: 'New Task',
    editTask: 'Edit Task',
    deleteTask: 'Delete Task',
    saveChanges: 'Save',
    cancel: 'Cancel',
    create: 'Create',
    edit: 'Edit',
    delete: 'Delete',
    backToFolder: 'Back to Folder',
    backToProject: 'Back to Project',
    projectsInFolder: 'Projects & Groups in this Folder',
    tasksInProject: 'Tasks in this Project',
    noProjectsYet: 'No projects in this folder yet. Add a project above to organize your tasks.',
    noTasksYet: 'No tasks in this project yet. Add your first task above.',
    progressLabel: 'Completion Progress',
    manualProgressLabel: 'Manual Progress Override',
    autoSyncedFromTodos: 'Automatically calculated from completed to-do checklist items',
    manualProgressHint: 'Adjust slider or add to-do items below for automatic progress',
    statusLabel: 'Status',
    priorityLabel: 'Priority',
    dueDateLabel: 'Due Date',
    statusTodo: 'To Do',
    statusInProgress: 'In Progress',
    statusReview: 'In Review',
    statusCompleted: 'Completed',
    priorityLow: 'Low',
    priorityMedium: 'Medium',
    priorityHigh: 'High',
    priorityCritical: 'Critical',
    todoChecklistTitle: 'To-Do Checklist',
    todoInputPlaceholder: 'Add a new to-do item...',
    addTodoButton: 'Add Item',
    noTodosYet: 'No to-do items yet. Add steps above to track progress.',
    editTodoPrompt: 'Edit to-do item',
    filterAll: 'All',
    filterActive: 'Remaining',
    filterCompleted: 'Completed',
    updatesSectionTitle: 'Task Updates & Date/Time Log',
    updateInputPlaceholder: 'Write a task update or status note...',
    updateDateTimeLabel: 'Date & Time',
    updateAuthorLabel: 'Author',
    postUpdateButton: 'Add Update',
    noUpdatesYet: 'No updates recorded yet.',
    attachmentsSectionTitle: 'Photos & Files',
    attachmentCaptionPlaceholder: 'Caption or file note (optional)...',
    uploadPhotoButton: 'Add Photo',
    attachFileButton: 'Add File',
    noAttachmentsYet: 'No photos or files attached yet.',
    inspectPhoto: 'View Photo',
    download: 'Download',
    dashboardTitle: 'Project Completion Dashboard',
    dashboardSubtitle: 'Overview of all folders, projects, task progress bars, and activity logs',
    overallCompletion: 'Overall Completion',
    tasksCompletedCount: 'tasks completed',
    subtasksDoneTitle: 'To-Do Items Completed',
    checklistRatio: 'checklist completion rate',
    activeTasksTitle: 'Active Tasks',
    updatesAndMediaTitle: 'Updates & Files',
    projectBreakdownTitle: 'Completion by Project / Group',
    taskOverviewTitle: 'All Tasks Progress',
    recentUpdatesTitle: 'Recent Timestamped Updates',
    offlineSyncBadge: 'Saved Offline Locally',
    darkTheme: 'Dark',
    lightTheme: 'Light',
    languageLabel: 'Language',
    taskTitleLabel: 'Task Title',
    taskDescLabel: 'Task Description',
    itemsCount: 'to-dos',
    updatesCount: 'updates',
    photosCount: 'photos',
    filesCount: 'files',
    openMenu: 'Open navigation sidebar',
    closeMenu: 'Close navigation sidebar',
    globalSearchPlaceholder: 'Search folders, projects, tasks, or tags...',
    noSearchResults: 'No matching folders, projects, or tasks found.',
    folderTypeLabel: 'Folder',
    projectTypeLabel: 'Project',
    taskTypeLabel: 'Task',
    exportPdfButton: 'Export PDF',
    settingsTitle: 'Workspace Settings & Backup',
    settingsSubtitle: 'Configure interface language, appearance, and full offline data backup & restore',
    languageSectionTitle: 'Interface Language',
    languageSectionDesc: 'Select your preferred language. Arabic and Hebrew automatically enable Right-to-Left (RTL) layout.',
    appearanceSectionTitle: 'Theme & Appearance',
    backupRestoreTitle: 'Full App Backup & Restore',
    backupRestoreDesc: 'Export all folders, projects, tasks, checklists, updates, and attached files to a local JSON backup file, or restore from an existing backup.',
    exportBackupButton: 'Download Full Backup (.json)',
    restoreBackupButton: 'Restore from Backup File',
    resetDefaultDataButton: 'Reset Workspace to Default Demo Data',
    backupRestoredSuccess: 'Workspace backup restored and synced to local storage.',
    backupRestoreError: 'Invalid backup file format. Please select a valid Masar JSON backup.',
    storageFootprintLabel: 'Local Storage Footprint',
    totalEntitiesLabel: 'Stored Workspace Items',
    annotatePhoto: 'Annotate',
    annotatedBadge: 'Annotated',
    annotationStudioTitle: 'Photo Annotation Studio',
    toolPen: 'Freehand Pen',
    toolArrow: 'Arrow',
    toolRect: 'Highlight Box',
    toolText: 'Text Callout',
    annotationTextPlaceholder: 'Type label text, then click on photo...',
    undoAction: 'Undo',
    clearAnnotations: 'Clear',
    saveAnnotatedPhoto: 'Save Annotated Photo',
    attachTodoPhoto: 'Add Photo',
    attachUpdatePhoto: 'Attach Photo',
    addSubTodo: 'Add Sub-task',
    subTodoInputPlaceholder: 'Add a sub-task...',
    subTodosTitle: 'Sub-tasks',
    editSubTodoPrompt: 'Edit sub-task',
    deleteSubTodo: 'Delete sub-task',
    collapseSection: 'Collapse section',
    expandSection: 'Expand section',
    collapseAll: 'Collapse all',
    expandAll: 'Expand all',
    sortBy: 'Sort by',
    filterBy: 'Filter by',
    filterStatus: 'Status',
    filterPriority: 'Priority',
    filterDate: 'Due date',
    filterAllDates: 'All dates',
    filterOverdue: 'Overdue',
    filterDueToday: 'Due today',
    filterUpcoming: 'Upcoming',
    filterSearchPlaceholder: 'Filter tasks in project...',
    resetFilters: 'Reset filters',
    sortDefault: 'Default order',
    sortDueDateAsc: 'Due date (Earliest)',
    sortDueDateDesc: 'Due date (Latest)',
    sortPriorityHigh: 'Priority (Highest)',
    sortPriorityLow: 'Priority (Lowest)',
    sortProgressDesc: 'Progress (Highest)',
    sortProgressAsc: 'Progress (Lowest)',
    sortTitleAsc: 'Title (A-Z)',
    sortTitleDesc: 'Title (Z-A)',
    sortNewest: 'Newest first',
    sortOldest: 'Oldest first',
    filterWithPhotosOnly: 'With photos only',
    activeFiltersCount: 'Active filters',
    noMatchingTasks: 'No tasks match the selected filters.',
    sortProjectsBy: 'Sort projects',
    sortByName: 'Name (A-Z)',
    sortByProgress: 'Progress (%)',
    sortByTaskCount: 'Task count',
    filterPhotosOnly: 'Photos only',
    filterFilesOnly: 'Files only',
    filterAllProjects: 'All projects',
    filterActiveProjects: 'Active',
    filterCompletedProjects: 'Completed',
    installAppTitle: 'Install App (Mobile, Tablet & PC)',
    installAppDesc: 'Install Task Tracker as a standalone offline app on your smartphone, tablet, or desktop computer.',
    installAppButton: 'Install App',
    installOnIOSButton: 'Install on iPhone / iPad',
    installedBadge: 'Installed as Standalone App',
    iosInstallModalTitle: 'Install on iPhone or iPad',
    iosInstallStep1: '1. Tap the Share button in the Safari browser toolbar.',
    iosInstallStep2: '2. Scroll down and tap "Add to Home Screen".',
    privatePublishTitle: 'Private Personal Use & Publishing Guide',
    privatePublishDesc: 'All tasks, photos, and backups are stored 100% locally on your own device browser—no other visitor can ever see your personal data.',
    privateStep1Title: '1. Install Directly on Your Phone, Tablet & PC (Recommended)',
    privateStep1Desc: 'Open your private app URL in Chrome, Edge, or Safari and click "Install App" or "Add to Home Screen". It runs offline as a private native-like app on your device.',
    privateStep2Title: '2. Private Cloud Run / Google Cloud IAM Lock',
    privateStep2Desc: 'When deploying to Google Cloud Run from AI Studio, disable "Allow unauthenticated invocations" and grant the Cloud Run Invoker role only to your Google email.',
    privateStep3Title: '3. Sync Across Your Personal Devices via JSON Backup',
    privateStep3Desc: 'Use Export Backup (.json) and Restore Backup above to privately move your workspace between your PC, tablet, and phone without exposing data on public servers.',
    navDashboard: 'Dashboard',
    navWorkspace: 'Projects',
    navNewTask: 'New Task',
    navSettings: 'Settings',
    lockScreenTitle: 'Private Workspace Locked',
    lockScreenSubtitle: 'Enter your app password to access your private projects and tasks.',
    passwordPlaceholder: 'Enter password...',
    unlockButton: 'Unlock Workspace',
    invalidPasswordError: 'Incorrect password. Please try again.',
    lockAppButton: 'Lock App',
    passwordSectionTitle: 'App Password & Entry Lock',
    passwordSectionDesc: 'Protect access to the app from any link or device. You can update your password anytime below.',
    currentPasswordLabel: 'Current Password',
    newPasswordLabel: 'New Password',
    confirmPasswordLabel: 'Confirm New Password',
    updatePasswordButton: 'Update Password',
    passwordUpdatedSuccess: 'App password updated successfully.',
    passwordMismatchError: 'Current password is incorrect or new passwords do not match.',
    ghPagesTitle: 'GitHub Pages Publishing & Automatic Sync',
    ghPagesDesc: 'Configured with relative asset paths (./), SPA 404 fallback, .nojekyll, and an automated GitHub Actions workflow (.github/workflows/deploy-pages.yml).',
    ghPagesReadyBadge: 'GitHub Actions Auto-Deploy Ready',
    ghPagesStep1Title: '1. Push / Sync from AI Studio to GitHub',
    ghPagesStep1Desc: 'Click the GitHub icon in the top bar of AI Studio to export or push your latest changes to your GitHub repository (main branch).',
    ghPagesStep2Title: '2. Enable GitHub Actions Pages (One-Time Setup)',
    ghPagesStep2Desc: 'In your GitHub repository, open Settings → Pages, and under "Build and deployment -> Source", select "GitHub Actions".',
    ghPagesStep3Title: '3. Automatic Rebuild on Every Push',
    ghPagesStep3Desc: 'Every time you push changes from AI Studio to GitHub, the deploy-pages.yml workflow automatically runs tests, builds, and updates your live GitHub Pages URL.',
    confirmDeleteTitle: 'Confirm Deletion',
    confirmDeleteMoveToTrashDesc: 'Are you sure you want to delete this item? It will be moved to Trash where you can restore it anytime or delete it permanently.',
    confirmDeletePermanentDesc: 'Are you sure you want to permanently delete this item? This action cannot be undone.',
    confirmDeleteButton: 'Delete Permanently',
    confirmMoveToTrashButton: 'Move to Trash',
    confirmEmptyTrashTitle: 'Empty Trash Permanently?',
    confirmEmptyTrashDesc: 'All items currently in the Trash will be permanently deleted and cannot be recovered.',
    confirmResetDemoTitle: 'Reset Workspace to Default Demo Data?',
    confirmResetDemoDesc: 'This will replace your current workspace with the default sample folders, projects, and tasks.',
    trashNav: 'Trash',
    trashTitle: 'Trash & Deleted Items',
    trashSubtitle: 'Restore deleted folders, projects, tasks, to-dos, sub-tasks, updates, or attachments, or delete them permanently to free storage.',
    trashEmptyState: 'Trash is empty. Deleted items will appear here for safe recovery.',
    restoreItemButton: 'Restore',
    deletePermanentlyButton: 'Delete Forever',
    emptyTrashButton: 'Empty Trash',
    deletedAtLabel: 'Deleted',
    trashFilterAll: 'All Items',
    trashFilterFoldersProjects: 'Folders & Projects',
    trashFilterTasks: 'Tasks',
    trashFilterTodos: 'To-Dos & Sub-tasks',
    trashFilterUpdatesMedia: 'Updates & Files',
    itemRestoredToast: 'Item restored from Trash',
    itemMovedToTrashToast: 'Moved to Trash',
    todoTypeLabel: 'To-Do',
    subTodoTypeLabel: 'Sub-task',
    updateTypeLabel: 'Update',
    attachmentTypeLabel: 'Attachment',
    notificationsNav: 'Notifications',
    notificationsTitle: 'Notifications, Updates & Due Reminders',
    notificationsSubtitle: 'Live activity feed for all workspace changes, task updates, and automatic reminders for tasks with a due date or time.',
    noNotificationsYet: 'No notifications or reminders matching this filter.',
    markAllReadButton: 'Mark all read',
    clearNotificationsButton: 'Clear all',
    checkRemindersNowButton: 'Scan Due Tasks',
    enableBrowserNotifications: 'Enable Browser Alerts',
    browserNotificationsEnabled: 'Browser Alerts Active',
    notifFilterAll: 'All',
    notifFilterReminders: 'Due Reminders',
    notifFilterUpdates: 'Updates & Changes',
    notifFilterUnread: 'Unread',
    overdueReminderTitle: 'Overdue Task Reminder',
    dueTodayReminderTitle: 'Task Due Today Reminder',
    dueTomorrowReminderTitle: 'Upcoming Task Due Tomorrow',
    dueTimeLabel: 'Reminder Time',
    notifCreatedLabel: 'Created',
    notifUpdatedLabel: 'Updated',
    notifCompletedLabel: 'Completed',
    notifMovedToTrashLabel: 'Moved to Trash',
    notifRestoredLabel: 'Restored from Trash',
    localFolderSyncTitle: 'Local Folder Auto-Save (Single-File Overwrite)',
    localFolderSyncDesc: 'Choose a local folder on your device. Every time you make changes, the app overwrites the exact same file (masar_workspace_autosave.json) in-place without creating duplicate files, saving storage space.',
    chooseSaveFolderButton: 'Choose Local Save Folder',
    changeSaveFolderButton: 'Change Folder',
    overwriteSaveNowButton: 'Overwrite Save File Now',
    loadFromFolderButton: 'Load from Saved File',
    disconnectFolderButton: 'Disconnect Folder',
    connectedFolderLabel: 'Target Save Folder',
    overwrittenFileLabel: 'Single Overwritten File',
    lastOverwrittenLabel: 'Last Overwritten',
    overwriteCountLabel: 'In-Place Overwrites',
    autoOverwriteActiveBadge: 'Single-File Auto-Overwrite Active',
    folderNameInputPlaceholder: 'Local folder name (e.g. Documents/TaskTracker)...',
    localFolderConnectedSuccess: 'Local save folder connected! All changes will overwrite masar_workspace_autosave.json in-place.',
    localFolderOverwrittenSuccess: 'Overwrote masar_workspace_autosave.json in-place with latest changes (no duplicate files created).',
    folderPickerModalTitle: 'Select Device Save Folder',
    folderPickerModalSubtitle: 'Choose a folder on your phone, tablet, or computer where masar_workspace_autosave.json will be overwritten automatically.',
    folderPickerDeviceFoldersHeading: 'Device & Storage Folders',
    folderPickerCreateNewLabel: 'Or Create a New Folder',
    folderPickerNewFolderPlaceholder: 'New folder name (e.g. PhoneStorage/MyTasks)...',
    folderPickerSelectButton: 'Use Selected Folder & Auto-Overwrite',
    folderPickerOpenNativeFilesButton: 'Open Phone Files App',
    folderPickerShareToFilesButton: 'Save to Phone Folder (Files App)',
    folderPickerBrowseFolderButton: 'Select Folder (iPhone / Device)',
    folderPickerPickIphoneFilesButton: 'Pick from iPhone Files / iCloud',
    scanningFolderLabel: 'Scanning folder for backup file...',
    folderBackupDetectedBadge: 'Backup File Detected',
    noBackupInFolderNote: 'No backup file in this folder yet — ready for auto-save.',
    confirmLoadBackupTitle: 'Backup File Found in Folder',
    confirmLoadBackupWarning: 'Loading this backup will permanently delete all current old data in the app (folders, projects, tasks, trash, and notifications) and replace it with the data from this backup.',
    backupFileDetailsLabel: 'Detected Backup File',
    backupDataSummaryLabel: 'New Data from Backup',
    currentDataSummaryLabel: 'Old Data to Be Deleted',
    confirmDeleteOldAndLoadButton: 'Confirm: Delete Old Data & Load Backup',
    noBackupFoundNoJsonError: 'No valid Task Tracker JSON backup file was found in the selected files.',
    previewFileButton: 'Preview',
    filePreviewModalTitle: 'File Preview',
    moveTaskButton: 'Move Task',
    moveGroupButton: 'Move Group',
    moveTaskModalTitle: 'Move Task to Another Group',
    moveGroupModalTitle: 'Move Group to Another Folder',
    moveSelectDestinationGroup: 'Select Destination Project / Group',
    moveSelectDestinationFolder: 'Select Destination Folder',
    currentLocationBadge: 'Current',
    tasksWillMoveNote: 'All {count} task(s) inside this group will move with it automatically.',
    confirmMoveButton: 'Move Here',
    notifMovedLabel: 'Moved',
    googleDriveBackupTitle: 'Google Drive Folder Backup (Phone & PC)',
    googleDriveBackupDesc: 'Back up and sync masar_workspace_autosave.json directly to any Google Drive folder on your phone or PC, overwriting the single backup file to save storage.',
    signInWithGoogleButton: 'Sign in with Google',
    signOutGoogleButton: 'Sign Out',
    signedInAsLabel: 'Google Account',
    chooseDriveFolderButton: 'Choose Google Drive Folder',
    driveFolderModalTitle: 'Browse Google Drive Folders',
    driveFolderModalSubtitle: 'Open or create any folder in your Google Drive. Selected folders are scanned automatically for existing backups.',
    myDriveRootLabel: 'My Drive',
    driveSearchPlaceholder: 'Search Google Drive folders...',
    createDriveFolderPlaceholder: 'New Drive folder name...',
    backupToDriveNowButton: 'Back Up to Google Drive',
    loadFromDriveButton: 'Scan & Load from Drive',
    driveConnectedBadge: 'Google Drive Linked',
    confirmDriveUploadTitle: 'Confirm Google Drive Backup Upload',
    confirmDriveUploadOverwriteDesc: 'An existing backup file was found in this Google Drive folder. Confirm to overwrite masar_workspace_autosave.json with your current workspace.',
    confirmDriveUploadCreateDesc: 'Confirm creating and uploading masar_workspace_autosave.json inside the selected Google Drive folder.',
    confirmDriveUploadButton: 'Confirm Upload to Drive',
    driveBackupSavedSuccess: 'Workspace backup saved to your Google Drive folder successfully.',
    driveAuthExpiredError: 'Google Drive session expired. Please sign in with Google again.',
    driveNoFoldersFound: 'No subfolders found in this Google Drive location.',
  },
  ar: {
    appName: 'متتبع المهام',
    appSubtitle: 'إدارة متكاملة للمشاريع والمهام بدون إنترنت',
    sidebarTitle: 'قائمة مساحة العمل',
    dashboardNav: 'لوحة الإنجاز العام',
    settingsNav: 'الإعدادات والنسخ الاحتياطي',
    foldersHeader: 'المجلدات والمشاريع',
    addFolder: 'إضافة مجلد',
    folderNamePlaceholder: 'اسم المجلد...',
    editFolder: 'تعديل المجلد',
    deleteFolder: 'حذف المجلد',
    addProject: 'إضافة مشروع / مجموعة',
    projectNamePlaceholder: 'اسم المشروع أو المجموعة...',
    projectDescPlaceholder: 'وصف مختصر للمشروع...',
    editProject: 'تعديل المشروع',
    deleteProject: 'حذف المشروع',
    addTask: 'إضافة مهمة',
    newTaskButton: 'مهمة جديدة',
    editTask: 'تعديل المهمة',
    deleteTask: 'حذف المهمة',
    saveChanges: 'حفظ',
    cancel: 'إلغاء',
    create: 'إنشاء',
    edit: 'تعديل',
    delete: 'حذف',
    backToFolder: 'العودة إلى المجلد',
    backToProject: 'العودة إلى المشروع',
    projectsInFolder: 'المشاريع والمجموعات في هذا المجلد',
    tasksInProject: 'المهام في هذا المشروع',
    noProjectsYet: 'لا توجد مشاريع في هذا المجلد بعد. أضف مشروعاً لتنظيم مهامك.',
    noTasksYet: 'لا توجد مهام في هذا المشروع بعد. أضف مهمتك الأولى أعلاه.',
    progressLabel: 'نسبة إنجاز المهمة',
    manualProgressLabel: 'تحديد نسبة الإنجاز يدوياً',
    autoSyncedFromTodos: 'تُحسب تلقائياً من عناصر قائمة المهام الفرعية المنجزة',
    manualProgressHint: 'حرك المؤشر أو أضف عناصر مهام فرعية لحساب التقدم تلقائياً',
    statusLabel: 'الحالة',
    priorityLabel: 'الأولوية',
    dueDateLabel: 'تاريخ الاستحقاق',
    statusTodo: 'قيد الانتظار',
    statusInProgress: 'قيد التنفيذ',
    statusReview: 'قيد المراجعة',
    statusCompleted: 'مكتملة',
    priorityLow: 'منخفضة',
    priorityMedium: 'متوسطة',
    priorityHigh: 'عالية',
    priorityCritical: 'حرجة',
    todoChecklistTitle: 'قائمة المهام الفرعية (To-Do)',
    todoInputPlaceholder: 'أضف عنصراً جديداً للقائمة...',
    addTodoButton: 'إضافة عنصر',
    noTodosYet: 'لا توجد عناصر فرعية بعد. أضف خطوات أعلاه لتتبع الإنجاز.',
    editTodoPrompt: 'تعديل العنصر',
    filterAll: 'الكل',
    filterActive: 'المتبقية',
    filterCompleted: 'المنجزة',
    updatesSectionTitle: 'تحديثات المهمة مع التاريخ والوقت',
    updateInputPlaceholder: 'اكتب تحديثاً أو ملاحظة حول سير العمل...',
    updateDateTimeLabel: 'التاريخ والوقت',
    updateAuthorLabel: 'الكاتب',
    postUpdateButton: 'إضافة تحديث',
    noUpdatesYet: 'لا توجد تحديثات مسجلة بعد.',
    attachmentsSectionTitle: 'الصور والملفات المرفقة',
    attachmentCaptionPlaceholder: 'وصف الصورة أو الملف (اختياري)...',
    uploadPhotoButton: 'إرفاق صورة',
    attachFileButton: 'إرفاق ملف',
    noAttachmentsYet: 'لا توجد صور أو ملفات مرفقة بعد.',
    inspectPhoto: 'عرض الصورة',
    download: 'تنزيل',
    dashboardTitle: 'لوحة مقاييس إنجاز المشاريع',
    dashboardSubtitle: 'نظرة شاملة على تقدم المجلدات والمشاريع والمهام والتحديثات الزمنية',
    overallCompletion: 'نسبة الإنجاز الكلية',
    tasksCompletedCount: 'مهام مكتملة',
    subtasksDoneTitle: 'العناصر الفرعية المنجزة',
    checklistRatio: 'معدل إتمام قوائم المهام',
    activeTasksTitle: 'المهام النشطة',
    updatesAndMediaTitle: 'التحديثات والملفات',
    projectBreakdownTitle: 'نسبة الإنجاز حسب المشروع / المجموعة',
    taskOverviewTitle: 'تقدم جميع المهام',
    recentUpdatesTitle: 'أحدث التحديثات المؤرخة',
    offlineSyncBadge: 'محفوظ محلياً بدون إنترنت',
    darkTheme: 'الوضع الداكن',
    lightTheme: 'الوضع الفاتح',
    languageLabel: 'اللغة',
    taskTitleLabel: 'عنوان المهمة',
    taskDescLabel: 'وصف المهمة',
    itemsCount: 'عناصر',
    updatesCount: 'تحديثات',
    photosCount: 'صور',
    filesCount: 'ملفات',
    openMenu: 'فتح القائمة الجانبية',
    closeMenu: 'إغلاق القائمة الجانبية',
    globalSearchPlaceholder: 'ابحث في المجلدات أو المشاريع أو المهام أو الوسوم...',
    noSearchResults: 'لم يتم العثور على مجلدات أو مشاريع أو مهام مطابقة.',
    folderTypeLabel: 'مجلد',
    projectTypeLabel: 'مشروع',
    taskTypeLabel: 'مهمة',
    exportPdfButton: 'تصدير PDF',
    settingsTitle: 'إعدادات التطبيق والنسخ الاحتياطي',
    settingsSubtitle: 'تحكم في لغة التطبيق والمظهر والنسخ الاحتياطي والاستعادة لجميع البيانات',
    languageSectionTitle: 'لغة التطبيق',
    languageSectionDesc: 'اختر لغة الواجهة المفضلة لديك. تدعم العربية والعبرية التخطيط من اليمين إلى اليسار (RTL) بالكامل.',
    appearanceSectionTitle: 'المظهر والألوان',
    backupRestoreTitle: 'النسخ الاحتياطي والاستعادة لكامل التطبيق',
    backupRestoreDesc: 'قم بتصدير جميع المجلدات والمشاريع والمهام وقوائم المهام الفرعية والتحديثات والملفات إلى ملف JSON محلي، أو استعد بياناتك من نسخة سابقة.',
    exportBackupButton: 'تنزيل نسخة احتياطية كاملة (.json)',
    restoreBackupButton: 'استعادة من ملف نسخ احتياطي',
    resetDefaultDataButton: 'إعادة ضبط البيانات للوضع الافتراضي',
    backupRestoredSuccess: 'تمت استعادة النسخة الاحتياطية وحفظها محلياً بنجاح.',
    backupRestoreError: 'ملف النسخة الاحتياطية غير صالح. يرجى اختيار ملف JSON صحيح.',
    storageFootprintLabel: 'حجم التخزين المحلي',
    totalEntitiesLabel: 'إجمالي العناصر المحفوظة',
    annotatePhoto: 'رسم وتعليق',
    annotatedBadge: 'مُعلّمة',
    annotationStudioTitle: 'أداة الرسم والتعليق على الصورة',
    toolPen: 'قلم حر',
    toolArrow: 'سهم',
    toolRect: 'مربع تحديد',
    toolText: 'نص توضيحي',
    annotationTextPlaceholder: 'اكتب النص ثم انقر على الصورة لوضعه...',
    undoAction: 'تراجع',
    clearAnnotations: 'مسح الكل',
    saveAnnotatedPhoto: 'حفظ الصورة مع التعليقات',
    attachTodoPhoto: 'إرفاق صورة',
    attachUpdatePhoto: 'إرفاق صورة',
    addSubTodo: 'إضافة مهمة فرعية',
    subTodoInputPlaceholder: 'أضف مهمة فرعية...',
    subTodosTitle: 'المهام الفرعية',
    editSubTodoPrompt: 'تعديل المهمة الفرعية',
    deleteSubTodo: 'حذف المهمة الفرعية',
    collapseSection: 'طي القسم',
    expandSection: 'توسيع القسم',
    collapseAll: 'طي الكل',
    expandAll: 'توسيع الكل',
    sortBy: 'ترتيب حسب',
    filterBy: 'تصفية حسب',
    filterStatus: 'الحالة',
    filterPriority: 'الأولوية',
    filterDate: 'تاريخ الاستحقاق',
    filterAllDates: 'جميع التواريخ',
    filterOverdue: 'متأخرة',
    filterDueToday: 'تستحق اليوم',
    filterUpcoming: 'قادمة',
    filterSearchPlaceholder: 'تصفية وبحث في مهام المشروع...',
    resetFilters: 'إعادة ضبط التصفية',
    sortDefault: 'الترتيب الافتراضي',
    sortDueDateAsc: 'تاريخ الاستحقاق (الأقرب)',
    sortDueDateDesc: 'تاريخ الاستحقاق (الأبعد)',
    sortPriorityHigh: 'الأولوية (الأعلى أولاً)',
    sortPriorityLow: 'الأولوية (الأقل أولاً)',
    sortProgressDesc: 'نسبة الإنجاز (الأعلى)',
    sortProgressAsc: 'نسبة الإنجاز (الأقل)',
    sortTitleAsc: 'العنوان (أ - ي)',
    sortTitleDesc: 'العنوان (ي - أ)',
    sortNewest: 'الأحدث أولاً',
    sortOldest: 'الأقدم أولاً',
    filterWithPhotosOnly: 'مع صور فقط',
    activeFiltersCount: 'الفلاتر النشطة',
    noMatchingTasks: 'لا توجد مهام تطابق الفلاتر المحددة.',
    sortProjectsBy: 'ترتيب المشاريع',
    sortByName: 'الاسم (أ - ي)',
    sortByProgress: 'نسبة الإنجاز (%)',
    sortByTaskCount: 'عدد المهام',
    filterPhotosOnly: 'الصور فقط',
    filterFilesOnly: 'الملفات فقط',
    filterAllProjects: 'جميع المشاريع',
    filterActiveProjects: 'نشطة',
    filterCompletedProjects: 'مكتملة',
    installAppTitle: 'تثبيت التطبيق (للجوال والتابلت والكمبيوتر)',
    installAppDesc: 'ثبّت متتبع المهام كتطبيق مستقل يعمل بدون إنترنت على هاتفك أو جهازك اللوحي أو الحاسوب.',
    installAppButton: 'تثبيت التطبيق',
    installOnIOSButton: 'التثبيت على iPhone / iPad',
    installedBadge: 'مثبّت كتطبيق مستقل',
    iosInstallModalTitle: 'التثبيت على iPhone أو iPad',
    iosInstallStep1: '1. اضغط على زر المشاركة (Share) في متصفح Safari.',
    iosInstallStep2: '2. مرر للأسفل واختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen).',
    privatePublishTitle: 'دليل النشر والاستخدام الشخصي الخاص (لك وحدك)',
    privatePublishDesc: 'جميع مهامك وصورك تُحفظ محلياً بنسبة 100% داخل جهازك فقط — لا يمكن لأي شخص آخر رؤية بياناتك.',
    privateStep1Title: '1. التثبيت المباشر على هاتفك والتابلت والكمبيوتر (موصى به)',
    privateStep1Desc: 'افتح رابط التطبيق في متصفح Chrome أو Edge أو Safari واضغط "تثبيت التطبيق" أو "إضافة للشاشة الرئيسية" ليعمل كتطبيق خاص بك بدون إنترنت.',
    privateStep2Title: '2. قفل الوصول عبر Google Cloud Run IAM',
    privateStep2Desc: 'عند النشر على Cloud Run، قم بإلغاء تفعيل الوصول العام (Unauthenticated) وامنح صلاحية Cloud Run Invoker لبريدك الإلكتروني فقط.',
    privateStep3Title: '3. نقل البيانات بين أجهزتك الخاصة عبر النسخ الاحتياطي',
    privateStep3Desc: 'استخدم زر تصدير واستعادة النسخة الاحتياطية (.json) أعلاه لنقل مهامك وصورك بأمان بين هاتفك والكمبيوتر.',
    navDashboard: 'لوحة الإنجاز',
    navWorkspace: 'المشاريع',
    navNewTask: 'مهمة جديدة',
    navSettings: 'الإعدادات',
    lockScreenTitle: 'مساحة العمل الخاصة مقفلة',
    lockScreenSubtitle: 'أدخل كلمة المرور للوصول إلى مشاريعك ومهامك الخاصة.',
    passwordPlaceholder: 'أدخل كلمة المرور...',
    unlockButton: 'فتح التطبيق',
    invalidPasswordError: 'كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى.',
    lockAppButton: 'قفل التطبيق',
    passwordSectionTitle: 'كلمة مرور التطبيق وقفل الدخول',
    passwordSectionDesc: 'حماية الدخول للتطبيق من أي رابط أو جهاز. يمكنك تحديث كلمة المرور الخاصة بك في أي وقت أدناه.',
    currentPasswordLabel: 'كلمة المرور الحالية',
    newPasswordLabel: 'كلمة المرور الجديدة',
    confirmPasswordLabel: 'تأكيد كلمة المرور الجديدة',
    updatePasswordButton: 'تحديث كلمة المرور',
    passwordUpdatedSuccess: 'تم تحديث كلمة مرور التطبيق بنجاح.',
    passwordMismatchError: 'كلمة المرور الحالية غير صحيحة أو كلمة المرور الجديدة غير متطابقة.',
    ghPagesTitle: 'النشر على GitHub Pages والمزامنة التلقائية',
    ghPagesDesc: 'التطبيق مهيأ بالكامل بمسارات نسبية (./) وملف 404.html وملف سير عمل تلقائي (.github/workflows/deploy-pages.yml).',
    ghPagesReadyBadge: 'جاهز للنشر التلقائي عبر GitHub Actions',
    ghPagesStep1Title: '1. ربط ومزامنة الكود من AI Studio إلى GitHub',
    ghPagesStep1Desc: 'اضغط على أيقونة GitHub في الشريط العلوي داخل AI Studio لرفع ومزامنة التعديلات مباشرة إلى مستودعك في GitHub (فرع main).',
    ghPagesStep2Title: '2. تفعيل GitHub Pages (مرة واحدة فقط)',
    ghPagesStep2Desc: 'في مستودعك على GitHub، افتح Settings ثم Pages، وتحت قسم Source اختر "GitHub Actions".',
    ghPagesStep3Title: '3. تحديث تلقائي عند كل دفع (Push)',
    ghPagesStep3Desc: 'في كل مرة تدفع فيها تعديلات جديدة من هنا إلى GitHub، سيقوم GitHub Actions تلقائياً ببناء التطبيق وتحديث موقعك على GitHub Pages.',
    confirmDeleteTitle: 'تأكيد الحذف',
    confirmDeleteMoveToTrashDesc: 'هل أنت متأكد من حذف هذا العنصر؟ سيتم نقله إلى سلة المحذوفات حيث يمكنك استعادته في أي وقت أو حذفه نهائياً.',
    confirmDeletePermanentDesc: 'هل أنت متأكد من الحذف النهائي لهذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.',
    confirmDeleteButton: 'حذف نهائياً',
    confirmMoveToTrashButton: 'نقل إلى سلة المحذوفات',
    confirmEmptyTrashTitle: 'إفراغ سلة المحذوفات نهائياً؟',
    confirmEmptyTrashDesc: 'سيتم حذف جميع العناصر الموجودة في سلة المحذوفات نهائياً ولا يمكن استعادتها.',
    confirmResetDemoTitle: 'إعادة ضبط مساحة العمل للبيانات الافتراضية؟',
    confirmResetDemoDesc: 'سيؤدي هذا إلى استبدال بياناتك الحالية بالمجلدات والمشاريع والمهام التجريبية الافتراضية.',
    trashNav: 'سلة المحذوفات',
    trashTitle: 'سلة المحذوفات والعناصر المحذوفة',
    trashSubtitle: 'استعد المجلدات أو المشاريع أو المهام أو المهام الفرعية أو التحديثات أو المرفقات المحذوفة، أو احذفها نهائياً لتوفير المساحة.',
    trashEmptyState: 'سلة المحذوفات فارغة. ستظهر العناصر المحذوفة هنا لاستعادتها بأمان.',
    restoreItemButton: 'استعادة',
    deletePermanentlyButton: 'حذف نهائي',
    emptyTrashButton: 'إفراغ السلة',
    deletedAtLabel: 'تاريخ الحذف',
    trashFilterAll: 'جميع العناصر',
    trashFilterFoldersProjects: 'المجلدات والمشاريع',
    trashFilterTasks: 'المهام',
    trashFilterTodos: 'المهام الفرعية',
    trashFilterUpdatesMedia: 'التحديثات والملفات',
    itemRestoredToast: 'تمت استعادة العنصر من سلة المحذوفات',
    itemMovedToTrashToast: 'تم النقل إلى سلة المحذوفات',
    todoTypeLabel: 'عنصر قائمة',
    subTodoTypeLabel: 'مهمة فرعية',
    updateTypeLabel: 'تحديث',
    attachmentTypeLabel: 'مرفق',
    notificationsNav: 'الإشعارات والتنبيهات',
    notificationsTitle: 'مركز الإشعارات والتحديثات وتذكيرات المواعيد',
    notificationsSubtitle: 'سجل تنبيهات فوري لجميع التغييرات والتحديثات وتذكيرات المهام التي لها تاريخ أو وقت استحقاق.',
    noNotificationsYet: 'لا توجد إشعارات أو تذكيرات تطابق هذا الفلتر.',
    markAllReadButton: 'تحديد الكل كمقروء',
    clearNotificationsButton: 'مسح الكل',
    checkRemindersNowButton: 'فحص مواعيد المهام',
    enableBrowserNotifications: 'تفعيل تنبيهات المتصفح',
    browserNotificationsEnabled: 'تنبيهات المتصفح مفعلة',
    notifFilterAll: 'الكل',
    notifFilterReminders: 'تذكيرات المواعيد',
    notifFilterUpdates: 'التحديثات والتغييرات',
    notifFilterUnread: 'غير مقروءة',
    overdueReminderTitle: 'تذكير: مهمة متأخرة عن موعدها',
    dueTodayReminderTitle: 'تذكير: مهمة تستحق اليوم',
    dueTomorrowReminderTitle: 'تذكير: مهمة تستحق غداً',
    dueTimeLabel: 'وقت التذكير',
    notifCreatedLabel: 'تمت الإضافة',
    notifUpdatedLabel: 'تم التحديث',
    notifCompletedLabel: 'تم الإنجاز',
    notifMovedToTrashLabel: 'نُقل إلى سلة المحذوفات',
    notifRestoredLabel: 'تمت الاستعادة من السلة',
    localFolderSyncTitle: 'حفظ تلقائي في مجلد محلي (الكتابة فوق الملف القديم لتوفير المساحة)',
    localFolderSyncDesc: 'اختر مجلداً محلياً على جهازك. عند أي تعديل سيقوم التطبيق بالكتابة فوق نفس الملف (masar_workspace_autosave.json) مباشرة دون تكرار الملفات لتوفير مساحة التخزين.',
    chooseSaveFolderButton: 'اختيار مجلد الحفظ المحلي',
    changeSaveFolderButton: 'تغيير المجلد',
    overwriteSaveNowButton: 'حفظ والكتابة فوق الملف الآن',
    loadFromFolderButton: 'استعادة من الملف المحفوظ',
    disconnectFolderButton: 'إلغاء ربط المجلد',
    connectedFolderLabel: 'مجلد الحفظ المحدد',
    overwrittenFileLabel: 'الملف الموحد المتجدد',
    lastOverwrittenLabel: 'آخر تحديث للملف',
    overwriteCountLabel: 'مرات الكتابة فوق الملف',
    autoOverwriteActiveBadge: 'الكتابة التلقائية فوق الملف القديم نشطة',
    folderNameInputPlaceholder: 'اسم مجلد الحفظ المحلي (مثال: Documents/TaskTracker)...',
    localFolderConnectedSuccess: 'تم ربط مجلد الحفظ المحلي! سيتم تحديث نفس الملف masar_workspace_autosave.json تلقائياً دون تكرار.',
    localFolderOverwrittenSuccess: 'تم حفظ التعديلات والكتابة فوق الملف القديم بنجاح دون استهلاك مساحة إضافية.',
    folderPickerModalTitle: 'اختيار مجلد الحفظ على الهاتف أو الجهاز',
    folderPickerModalSubtitle: 'اختر مجلداً من ذاكرة الهاتف أو الجهاز ليتم تحديث الملف masar_workspace_autosave.json داخله تلقائياً وبنفس الاسم دون تكرار.',
    folderPickerDeviceFoldersHeading: 'مجلدات الهاتف والجهاز المتاحة',
    folderPickerCreateNewLabel: 'أو إنشاء مجلد جديد على الجهاز',
    folderPickerNewFolderPlaceholder: 'اسم المجلد الجديد (مثال: PhoneStorage/MyTasks)...',
    folderPickerSelectButton: 'اعتماد هذا المجلد للحفظ التلقائي',
    folderPickerOpenNativeFilesButton: 'فتح مدير ملفات الهاتف',
    folderPickerShareToFilesButton: 'حفظ في مجلد بالهاتف (تطبيق الملفات)',
    folderPickerBrowseFolderButton: 'اختيار مجلد (iPhone / الجهاز)',
    folderPickerPickIphoneFilesButton: 'اختيار من ملفات iPhone / iCloud',
    scanningFolderLabel: 'جاري فحص المجلد للبحث عن نسخة احتياطية...',
    folderBackupDetectedBadge: 'تم العثور على ملف نسخة احتياطية',
    noBackupInFolderNote: 'لا توجد نسخة احتياطية في هذا المجلد بعد — جاهز للحفظ التلقائي.',
    confirmLoadBackupTitle: 'تم العثور على نسخة احتياطية في المجلد',
    confirmLoadBackupWarning: 'عند التأكيد، سيتم حذف جميع البيانات القديمة الحالية في التطبيق بالكامل (المجلدات والمشاريع والمهام وسلة المحذوفات والإشعارات) واستبدالها بالبيانات الجديدة من النسخة الاحتياطية.',
    backupFileDetailsLabel: 'ملف النسخة الاحتياطية المكتشف',
    backupDataSummaryLabel: 'البيانات الجديدة من النسخة الاحتياطية',
    currentDataSummaryLabel: 'البيانات القديمة التي سيتم حذفها',
    confirmDeleteOldAndLoadButton: 'تأكيد: حذف البيانات القديمة وتحميل النسخة',
    noBackupFoundNoJsonError: 'لم يتم العثور على ملف نسخة احتياطية JSON صالح في الملفات المختارة.',
    previewFileButton: 'معاينة الملف',
    filePreviewModalTitle: 'معاينة الملف المرفق',
    moveTaskButton: 'نقل المهمة',
    moveGroupButton: 'نقل المجموعة',
    moveTaskModalTitle: 'نقل المهمة إلى مجموعة أخرى',
    moveGroupModalTitle: 'نقل المجموعة / المشروع إلى مجلد آخر',
    moveSelectDestinationGroup: 'اختر المجموعة / المشروع الوجهة',
    moveSelectDestinationFolder: 'اختر المجلد الوجهة',
    currentLocationBadge: 'الحالي',
    tasksWillMoveNote: 'ستنتقل جميع المهام ({count}) داخل هذه المجموعة تلقائياً معها.',
    confirmMoveButton: 'نقل إلى هنا',
    notifMovedLabel: 'تم النقل',
    googleDriveBackupTitle: 'النسخ الاحتياطي إلى مجلد Google Drive (للهاتف والكمبيوتر)',
    googleDriveBackupDesc: 'احفظ ملف النسخة الاحتياطية masar_workspace_autosave.json مباشرة في أي مجلد على Google Drive من هاتفك أو الكمبيوتر مع الكتابة فوق نفس الملف لتوفير المساحة.',
    signInWithGoogleButton: 'تسجيل الدخول باستخدام Google',
    signOutGoogleButton: 'تسجيل الخروج',
    signedInAsLabel: 'حساب Google',
    chooseDriveFolderButton: 'اختيار مجلد في Google Drive',
    driveFolderModalTitle: 'تصفح مجلدات Google Drive',
    driveFolderModalSubtitle: 'افتح أو أنشئ أي مجلد في Google Drive. يتم فحص المجلد المختار تلقائياً للبحث عن نسخ احتياطية سابقة.',
    myDriveRootLabel: 'ملفاتي (My Drive)',
    driveSearchPlaceholder: 'ابحث في مجلدات Google Drive...',
    createDriveFolderPlaceholder: 'اسم مجلد جديد في Drive...',
    backupToDriveNowButton: 'نسخ احتياطي إلى Google Drive',
    loadFromDriveButton: 'فحص وتحميل من Drive',
    driveConnectedBadge: 'مربوط مع Google Drive',
    confirmDriveUploadTitle: 'تأكيد الرفع إلى Google Drive',
    confirmDriveUploadOverwriteDesc: 'يوجد ملف نسخة احتياطية بالفعل في مجلد Google Drive هذا. هل تؤكد الكتابة فوق masar_workspace_autosave.json بالبيانات الحالية؟',
    confirmDriveUploadCreateDesc: 'هل تؤكد إنشاء ورفع ملف masar_workspace_autosave.json داخل مجلد Google Drive المحدد؟',
    confirmDriveUploadButton: 'تأكيد الرفع إلى Drive',
    driveBackupSavedSuccess: 'تم حفظ النسخة الاحتياطية في مجلد Google Drive بنجاح.',
    driveAuthExpiredError: 'انتهت جلسة Google Drive. يرجى تسجيل الدخول بحساب Google مرة أخرى.',
    driveNoFoldersFound: 'لا توجد مجلدات فرعية في هذا الموقع داخل Google Drive.',
  },
  he: {
    appName: 'מעקב משימות Task Tracker',
    appSubtitle: 'ניהול פרויקטים ומשימות אופליין',
    sidebarTitle: 'ניווט סביבת עבודה',
    dashboardNav: 'לוח מדדי השלמה',
    settingsNav: 'הגדרות וגיבוי',
    foldersHeader: 'תיקיות ופרויקטים',
    addFolder: 'הוסף תיקייה',
    folderNamePlaceholder: 'שם התיקייה...',
    editFolder: 'ערוך תיקייה',
    deleteFolder: 'מחק תיקייה',
    addProject: 'הוסף פרויקט / קבוצה',
    projectNamePlaceholder: 'שם הפרויקט או הקבוצה...',
    projectDescPlaceholder: 'תיאור קצר של הפרויקט...',
    editProject: 'ערוך פרויקט',
    deleteProject: 'מחק פרויקט',
    addTask: 'הוסף משימה',
    newTaskButton: 'משימה חדשה',
    editTask: 'ערוך משימה',
    deleteTask: 'מחק משימה',
    saveChanges: 'שמור',
    cancel: 'ביטול',
    create: 'צור',
    edit: 'ערוך',
    delete: 'מחק',
    backToFolder: 'חזרה לתיקייה',
    backToProject: 'חזרה לפרויקט',
    projectsInFolder: 'פרויקטים וקבוצות בתיקייה זו',
    tasksInProject: 'משימות בפרויקט זה',
    noProjectsYet: 'אין עדיין פרויקטים בתיקייה זו. הוסף פרויקט למעלה כדי לארגן משימות.',
    noTasksYet: 'אין עדיין משימות בפרויקט זה. הוסף משימה ראשונה למעלה.',
    progressLabel: 'התקדמות השלמה',
    manualProgressLabel: 'אחוז התקדמות ידני',
    autoSyncedFromTodos: 'מחושב אוטומטית מפריטי רשימת המטלות שהושלמו',
    manualProgressHint: 'הזז את המחוון או הוסף תתי-משימות לחישוב אוטומטי',
    statusLabel: 'סטטוס',
    priorityLabel: 'עדיפות',
    dueDateLabel: 'תאריך יעד',
    statusTodo: 'לביצוע',
    statusInProgress: 'בתהליך',
    statusReview: 'בבדיקה',
    statusCompleted: 'הושלם',
    priorityLow: 'נמוכה',
    priorityMedium: 'בינונית',
    priorityHigh: 'גבוהה',
    priorityCritical: 'קריטית',
    todoChecklistTitle: 'רשימת מטלות (To-Do)',
    todoInputPlaceholder: 'הוסף פריט חדש לרשימה...',
    addTodoButton: 'הוסף פריט',
    noTodosYet: 'אין עדיין פריטי מטלות. הוסף שלבים למעלה למעקב התקדמות.',
    editTodoPrompt: 'ערוך פריט',
    filterAll: 'הכל',
    filterActive: 'נותרו',
    filterCompleted: 'הושלמו',
    updatesSectionTitle: 'עדכוני משימה (תאריך ושעה)',
    updateInputPlaceholder: 'כתוב עדכון התקדמות או הערת סטטוס...',
    updateDateTimeLabel: 'תאריך ושעה',
    updateAuthorLabel: 'מחבר',
    postUpdateButton: 'פרסם עדכון',
    noUpdatesYet: 'טרם נרשמו עדכונים.',
    attachmentsSectionTitle: 'תמונות וקבצים',
    attachmentCaptionPlaceholder: 'כיתוב לתמונה או לקובץ (אופציונלי)...',
    uploadPhotoButton: 'הוסף תמונה',
    attachFileButton: 'הוסף קובץ',
    noAttachmentsYet: 'אין עדיין תמונות או קבצים מצורפים.',
    inspectPhoto: 'הצג תמונה',
    download: 'הורד',
    dashboardTitle: 'לוח בקרה להשלמת פרויקטים',
    dashboardSubtitle: 'סקירה מלאה של תיקיות, פרויקטים, מדי התקדמות משימות ויומן פעילות',
    overallCompletion: 'השלמה כוללת',
    tasksCompletedCount: 'משימות הושלמו',
    subtasksDoneTitle: 'תתי-משימות שהושלמו',
    checklistRatio: 'שיעור השלמת רשימות מטלות',
    activeTasksTitle: 'משימות פעילות',
    updatesAndMediaTitle: 'עדכונים וקבצים',
    projectBreakdownTitle: 'התקדמות לפי פרויקט / קבוצה',
    taskOverviewTitle: 'התקדמות כל המשימות',
    recentUpdatesTitle: 'עדכונים אחרונים לפי תאריך ושעה',
    offlineSyncBadge: 'נשמר מקומית ללא אינטרנט',
    darkTheme: 'מצב כהה',
    lightTheme: 'מצב בהיר',
    languageLabel: 'שפה',
    taskTitleLabel: 'כותרת המשימה',
    taskDescLabel: 'תיאור המשימה',
    itemsCount: 'מטלות',
    updatesCount: 'עדכונים',
    photosCount: 'תמונות',
    filesCount: 'קבצים',
    openMenu: 'פתח תפריט צד',
    closeMenu: 'סגור תפריט צד',
    globalSearchPlaceholder: 'חפש תיקיות, פרויקטים, משימות או תגיות...',
    noSearchResults: 'לא נמצאו תיקיות, פרויקטים או משימות תואמים.',
    folderTypeLabel: 'תיקייה',
    projectTypeLabel: 'פרויקט',
    taskTypeLabel: 'משימה',
    exportPdfButton: 'ייצוא PDF',
    settingsTitle: 'הגדרות מערכת וגיבוי',
    settingsSubtitle: 'הגדר שפת ממשק, תצוגה וגיבוי ושחזור מלאים של כל נתוני האפליקציה',
    languageSectionTitle: 'שפת ממשק',
    languageSectionDesc: 'בחר את השפה המועדפת עליך. עברית וערבית מפעילות אוטומטית תצוגה מימין לשמאל (RTL).',
    appearanceSectionTitle: 'ערכת נושא ותצוגה',
    backupRestoreTitle: 'גיבוי ושחזור מלא של האפליקציה',
    backupRestoreDesc: 'ייצא את כל התיקיות, הפרויקטים, המשימות, רשימות המטלות, העדכונים והקבצים לקובץ גיבוי JSON, או שחזר מגיבוי קיים.',
    exportBackupButton: 'הורד גיבוי מלא (.json)',
    restoreBackupButton: 'שחזר מקובץ גיבוי',
    resetDefaultDataButton: 'אפס נתונים לברירת מחדל',
    backupRestoredSuccess: 'הגיבוי שוחזר ונשמר באחסון המקומי בהצלחה.',
    backupRestoreError: 'קובץ הגיבוי אינו תקין. נא לבחור קובץ JSON תקין.',
    storageFootprintLabel: 'נפח אחסון מקומי',
    totalEntitiesLabel: 'סה״כ פריטים שמורים',
    annotatePhoto: 'סמן על התמונה',
    annotatedBadge: 'מסומנת',
    annotationStudioTitle: 'עורך סימון והערות על תמונה',
    toolPen: 'עט חופשי',
    toolArrow: 'חץ',
    toolRect: 'תיבת הדגשה',
    toolText: 'טקסט הערה',
    annotationTextPlaceholder: 'הקלד טקסט ולחץ על התמונה למיקום...',
    undoAction: 'בטל',
    clearAnnotations: 'נקה הכל',
    saveAnnotatedPhoto: 'שמור תמונה מסומנת',
    attachTodoPhoto: 'צרף תמונה',
    attachUpdatePhoto: 'צרף תמונה',
    addSubTodo: 'הוסף תת-מטלה',
    subTodoInputPlaceholder: 'הוסף תת-מטלה...',
    subTodosTitle: 'תתי-מטלות',
    editSubTodoPrompt: 'ערוך תת-מטלה',
    deleteSubTodo: 'מחק תת-מטלה',
    collapseSection: 'כווץ חלק',
    expandSection: 'הרחב חלק',
    collapseAll: 'כווץ הכל',
    expandAll: 'הרחב הכל',
    sortBy: 'מיין לפי',
    filterBy: 'סנן לפי',
    filterStatus: 'סטטوس',
    filterPriority: 'עדיפות',
    filterDate: 'תאריך יעד',
    filterAllDates: 'כל התאריכים',
    filterOverdue: 'באיחור',
    filterDueToday: 'להיום',
    filterUpcoming: 'בקרוב',
    filterSearchPlaceholder: 'סינון משימות בפרויקט...',
    resetFilters: 'איפוס סינונים',
    sortDefault: 'סדר ברירת מחדל',
    sortDueDateAsc: 'תאריך יעד (המוקדם ביותר)',
    sortDueDateDesc: 'תאריך יעד (המאוחר ביותר)',
    sortPriorityHigh: 'עדיפות (הגבוהה ביותר)',
    sortPriorityLow: 'עדיפות (הנמוכה ביותר)',
    sortProgressDesc: 'התקדמות (הגבוהה ביותר)',
    sortProgressAsc: 'התקדמות (הנמוכה ביותר)',
    sortTitleAsc: 'כותרת (א-ת)',
    sortTitleDesc: 'כותרת (ת-א)',
    sortNewest: 'החדש ביותר',
    sortOldest: 'הישן ביותר',
    filterWithPhotosOnly: 'עם תמונות בלבד',
    activeFiltersCount: 'מסננים פעילים',
    noMatchingTasks: 'אין משימות התואמות למסננים שנבחרו.',
    sortProjectsBy: 'מיין פרויקטים',
    sortByName: 'שם (א-ת)',
    sortByProgress: 'התקדמות (%)',
    sortByTaskCount: 'כמות משימות',
    filterPhotosOnly: 'תמונות בלבד',
    filterFilesOnly: 'קבצים בלבד',
    filterAllProjects: 'כל הפרויקטים',
    filterActiveProjects: 'פעיל',
    filterCompletedProjects: 'הושלם',
    installAppTitle: 'התקנת האפליקציה (נייד, טאבלט ומחשב)',
    installAppDesc: 'התקן את Task Tracker כאפליקציה עצמאית הפועלת אופליין בטלפון, בטאבלט או במחשב.',
    installAppButton: 'התקן אפליקציה',
    installOnIOSButton: 'התקנה ב-iPhone / iPad',
    installedBadge: 'מותקן כאפליקציה עצמאית',
    iosInstallModalTitle: 'התקנה ב-iPhone או iPad',
    iosInstallStep1: '1. הקש על כפתור השיתוף (Share) בסרגל Safari.',
    iosInstallStep2: '2. גלול מטה והקש על "הוסף למסך הבית" (Add to Home Screen).',
    privatePublishTitle: 'מדריך לפרסום ושימוש אישי ופרטי (רק עבורך)',
    privatePublishDesc: 'כל המשימות, התמונות והגיבויים נשמרים 100% מקומית במכשיר שלך — אף גולש אחר לא יכול לראות את הנתונים שלך.',
    privateStep1Title: '1. התקנה ישירה בנייד, בטאבלט ובמחשב (מומלץ)',
    privateStep1Desc: 'פתח את קישור האפליקציה ב-Chrome, Edge או Safari ולחץ על "התקן אפליקציה" או "הוסף למסך הבית" לשימוש פרטי ואופליין.',
    privateStep2Title: '2. נעילת גישה פרטית ב-Google Cloud Run IAM',
    privateStep2Desc: 'בעת פריסה ל-Cloud Run, בטל גישה ציבורית והענק הרשאת Cloud Run Invoker לכתובת האימייל האישית שלך בלבד.',
    privateStep3Title: '3. סנכרון בין המכשירים האישיים שלך באמצעות קובץ גיבוי',
    privateStep3Desc: 'השתמש בייצוא ושחזור גיבוי (.json) למעלה כדי להעביר את סביבת העבודה בבטחה בין המחשב, הטאבלט והטלפון.',
    navDashboard: 'לוח בקרה',
    navWorkspace: 'פרויקטים',
    navNewTask: 'משימה חדשה',
    navSettings: 'הגדרות',
    lockScreenTitle: 'סביבת העבודה הפרטית נעולה',
    lockScreenSubtitle: 'הזן את סיסמת האפליקציה כדי לגשת לפרויקטים ולמשימות שלך.',
    passwordPlaceholder: 'הזן סיסמה...',
    unlockButton: 'פתח נעילה',
    invalidPasswordError: 'סיסמה שגויה. נסה שוב.',
    lockAppButton: 'נעל אפליקציה',
    passwordSectionTitle: 'סיסמת אפליקציה ונעילת כניסה',
    passwordSectionDesc: 'הגן על הגישה לאפליקציה מכל קישור או מכשיר. ניתן לעדכן את הסיסמה בכל עת למטה.',
    currentPasswordLabel: 'סיסמה נוכחית',
    newPasswordLabel: 'סיסמה חדשה',
    confirmPasswordLabel: 'אימות סיסמה חדשה',
    updatePasswordButton: 'עדכן סיסמה',
    passwordUpdatedSuccess: 'סיסמת האפליקציה עודכנה בהצלחה.',
    passwordMismatchError: 'הסיסמה הנוכחית שגויה או שהסיסמאות החדשות אינן תואמות.',
    ghPagesTitle: 'פרסום ב-GitHub Pages וסנכרון אוטומטי',
    ghPagesDesc: 'מוגדר עם נתיבים יחסיים (./), גיבוי 404.html ותהליך עבודה אוטומטי (.github/workflows/deploy-pages.yml).',
    ghPagesReadyBadge: 'מוכן לפריסה אוטומטית ב-GitHub Actions',
    ghPagesStep1Title: '1. דחיפה / סנכרון מ-AI Studio ל-GitHub',
    ghPagesStep1Desc: 'לחץ על סמל GitHub בסרגל העליון של AI Studio כדי לדחוף את השינויים האחרונים למאגר ה-GitHub שלך (ענף main).',
    ghPagesStep2Title: '2. הפעלת GitHub Pages (הגדרה חד-פעמית)',
    ghPagesStep2Desc: 'במאגר ה-GitHub שלך, עבור אל Settings → Pages, ותחת Source בחר ב-"GitHub Actions".',
    ghPagesStep3Title: '3. עדכון אוטומטי בכל Push',
    ghPagesStep3Desc: 'בכל פעם שתדחוף שינויים ל-GitHub, תהליך העבודה deploy-pages.yml יבנה ויעדכן אוטומטית את האתר החי שלך ב-GitHub Pages.',
    confirmDeleteTitle: 'אישור מחיקה',
    confirmDeleteMoveToTrashDesc: 'האם אתה בטוח שברצונך למחוק פריט זה? הוא יועבר לסל המיחזור ותוכל לשחזר אותו בכל עת או למחוק לצמיתות.',
    confirmDeletePermanentDesc: 'האם אתה בטוח שברצונך למחוק פריט זה לצמיתות? לא ניתן לבטל פעולה זו.',
    confirmDeleteButton: 'מחק לצמיתות',
    confirmMoveToTrashButton: 'העבר לסל המיחזור',
    confirmEmptyTrashTitle: 'לרוקן את סל המיחזור לצמיתות?',
    confirmEmptyTrashDesc: 'כל הפריטים בסל המיחזור יימחקו לצמיתות ולא ניתן יהיה לשחזרם.',
    confirmResetDemoTitle: 'לאפס סביבת עבודה לנתוני ברירת מחדל?',
    confirmResetDemoDesc: 'פעולה זו תחליף את הנתונים הנוכחיים בתיקיות, פרויקטים ומשימות לדוגמה.',
    trashNav: 'סל מיחזור',
    trashTitle: 'סל מיחזור ופריטים שנמחקו',
    trashSubtitle: 'שחזר תיקיות, פרויקטים, משימות, תתי-משימות, עדכונים או קבצים שנמחקו, או מחק אותם לצמיתות.',
    trashEmptyState: 'סל המיחזור ריק. פריטים שנמחקו יופיעו כאן לשחזור בטוח.',
    restoreItemButton: 'שחזר',
    deletePermanentlyButton: 'מחק לצמיתות',
    emptyTrashButton: 'רוקן סל מיחזור',
    deletedAtLabel: 'נמחק ב-',
    trashFilterAll: 'כל הפריטים',
    trashFilterFoldersProjects: 'תיקיות ופרויקטים',
    trashFilterTasks: 'משימות',
    trashFilterTodos: 'מטלות ותתי-משימות',
    trashFilterUpdatesMedia: 'עדכונים וקבצים',
    itemRestoredToast: 'הפריט שוחזר מסל המיחזור',
    itemMovedToTrashToast: 'הועבר לסל המיחזור',
    todoTypeLabel: 'מטלה',
    subTodoTypeLabel: 'תת-משימה',
    updateTypeLabel: 'עדכון',
    attachmentTypeLabel: 'קובץ מצורף',
    notificationsNav: 'התראות ותזכורות',
    notificationsTitle: 'מרכז התראות, עדכונים ותזכורות יעד',
    notificationsSubtitle: 'יומן פעילות חי לכל השינויים, עדכוני המשימות ותזכורות אוטומטיות למשימות עם תאריך או שעת יעד.',
    noNotificationsYet: 'אין התראות או תזכורות התואמות למסנן זה.',
    markAllReadButton: 'סמן הכל כנקרא',
    clearNotificationsButton: 'נקה הכל',
    checkRemindersNowButton: 'בדוק משימות קרובות',
    enableBrowserNotifications: 'הפעל התראות דפדפן',
    browserNotificationsEnabled: 'התראות דפדפן פעילות',
    notifFilterAll: 'הכל',
    notifFilterReminders: 'תזכורות יעד',
    notifFilterUpdates: 'עדכונים ושינויים',
    notifFilterUnread: 'לא נקראו',
    overdueReminderTitle: 'תזכורת: משימה באיחור',
    dueTodayReminderTitle: 'תזכורת: משימה להיום',
    dueTomorrowReminderTitle: 'תזכורת: משימה למחר',
    dueTimeLabel: 'שעת תזכורת',
    notifCreatedLabel: 'נוצר',
    notifUpdatedLabel: 'עודכן',
    notifCompletedLabel: 'הושלם',
    notifMovedToTrashLabel: 'הועבר לסל המיחזור',
    notifRestoredLabel: 'שוחזר מסל המיחזור',
    localFolderSyncTitle: 'שמירה אוטומטית בתיקייה מקומית (דריסת קובץ ישן לחיסכון במקום)',
    localFolderSyncDesc: 'בחר תיקייה מקומית במכשיר שלך. בכל שינוי האפליקציה דורסת את אותו הקובץ בדיוק (masar_workspace_autosave.json) ללא יצירת קבצים כפולים.',
    chooseSaveFolderButton: 'בחר תיקיית שמירה מקומית',
    changeSaveFolderButton: 'שנה תיקייה',
    overwriteSaveNowButton: 'שמור ודרוס קובץ כעת',
    loadFromFolderButton: 'טען מקובץ שמור',
    disconnectFolderButton: 'נתק תיקייה',
    connectedFolderLabel: 'תיקיית שמירה מחוברת',
    overwrittenFileLabel: 'קובץ יחיד מתעדכן',
    lastOverwrittenLabel: 'עדכון אחרון',
    overwriteCountLabel: 'שמירות חוזרות על הקובץ',
    autoOverwriteActiveBadge: 'דריסת קובץ אוטומטית פעילה',
    folderNameInputPlaceholder: 'שם תיקייה מקומית (למשל Documents/TaskTracker)...',
    localFolderConnectedSuccess: 'תיקיית השמירה המקומית חוברה! כל שינוי ידרוס את הקובץ masar_workspace_autosave.json.',
    localFolderOverwrittenSuccess: 'הקובץ masar_workspace_autosave.json עודכן ונדרס בהצלחה ללא כפילויות.',
    folderPickerModalTitle: 'בחירת תיקיית שמירה במכשיר / בנייד',
    folderPickerModalSubtitle: 'בחר תיקייה בטלפון, בטאבלט או במחשב שבה הקובץ masar_workspace_autosave.json יידרס ויתעדכן אוטומטית.',
    folderPickerDeviceFoldersHeading: 'תיקיות אחסון במכשיר',
    folderPickerCreateNewLabel: 'או צור תיקייה חדשה',
    folderPickerNewFolderPlaceholder: 'שם תיקייה חדשה (למשל PhoneStorage/MyTasks)...',
    folderPickerSelectButton: 'השתמש בתיקייה שנבחרה לשמירה אוטומטית',
    folderPickerOpenNativeFilesButton: 'פתח סייר קבצים של הטלפון',
    folderPickerShareToFilesButton: 'שמור בתיקייה בטלפון (אפליקציית הקבצים)',
    folderPickerBrowseFolderButton: 'בחר תיקייה (iPhone / מכשיר)',
    folderPickerPickIphoneFilesButton: 'בחר מקבצי iPhone / iCloud',
    scanningFolderLabel: 'סורק תיקייה לאיתור קובץ גיבוי...',
    folderBackupDetectedBadge: 'נמצא קובץ גיבוי',
    noBackupInFolderNote: 'אין עדיין קובץ גיבוי בתיקייה זו — מוכן לשמירה אוטומטית.',
    confirmLoadBackupTitle: 'נמצא קובץ גיבוי בתיקייה',
    confirmLoadBackupWarning: 'אישור פעולה זו ימחק את כל הנתונים הישנים הנוכחיים באפליקציה (תיקיות, פרויקטים, משימות, סל מיחזור והתראות) ויטען במקומם את הנתונים החדשים מהגיבוי.',
    backupFileDetailsLabel: 'קובץ גיבוי שאותר',
    backupDataSummaryLabel: 'נתונים חדשים מהגיבוי',
    currentDataSummaryLabel: 'נתונים ישנים שיימחקו',
    confirmDeleteOldAndLoadButton: 'אישור: מחק נתונים ישנים וטען גיבוי',
    noBackupFoundNoJsonError: 'לא נמצא קובץ גיבוי JSON תקין בקבצים שנבחרו.',
    previewFileButton: 'תצוגה מקדימה',
    filePreviewModalTitle: 'תצוגה מקדימה של קובץ',
    moveTaskButton: 'העבר משימה',
    moveGroupButton: 'העבר קבוצה',
    moveTaskModalTitle: 'העברת משימה לקבוצה אחרת',
    moveGroupModalTitle: 'העברת קבוצה / פרויקט לתיקייה אחרת',
    moveSelectDestinationGroup: 'בחר קבוצה / פרויקט יעד',
    moveSelectDestinationFolder: 'בחר תיקיית יעד',
    currentLocationBadge: 'נוכחי',
    tasksWillMoveNote: 'כל {count} המשימות בתוך קבוצה זו יעברו איתה אוטומטית.',
    confirmMoveButton: 'העבר לכאן',
    notifMovedLabel: 'הועבר',
    googleDriveBackupTitle: 'גיבוי לתיקיית Google Drive (טלפון ומחשב)',
    googleDriveBackupDesc: 'גבה וסנכרן את הקובץ masar_workspace_autosave.json ישירות לכל תיקייה ב-Google Drive מהטלפון או מהמחשב תוך דריסת הקובץ הקיים לחיסכון במקום.',
    signInWithGoogleButton: 'כניסה באמצעות Google',
    signOutGoogleButton: 'התנתק',
    signedInAsLabel: 'חשבון Google',
    chooseDriveFolderButton: 'בחר תיקייה ב-Google Drive',
    driveFolderModalTitle: 'דפדוף בתיקיות Google Drive',
    driveFolderModalSubtitle: 'פתח או צור כל תיקייה ב-Google Drive. תיקיות נבחרות נסרקות אוטומטית לאיתור גיבויים קיימים.',
    myDriveRootLabel: 'האחסון שלי (My Drive)',
    driveSearchPlaceholder: 'חפש תיקיות ב-Google Drive...',
    createDriveFolderPlaceholder: 'שם תיקייה חדשה ב-Drive...',
    backupToDriveNowButton: 'גבה אל Google Drive',
    loadFromDriveButton: 'סרוק וטען מ-Drive',
    driveConnectedBadge: 'מחובר ל-Google Drive',
    confirmDriveUploadTitle: 'אישור העלאת גיבוי ל-Google Drive',
    confirmDriveUploadOverwriteDesc: 'נמצא קובץ גיבוי קיים בתיקיית Google Drive זו. אשר כדי לדרוס את masar_workspace_autosave.json בנתונים הנוכחיים.',
    confirmDriveUploadCreateDesc: 'אשר יצירה והעלאה של masar_workspace_autosave.json בתוך תיקיית Google Drive שנבחרה.',
    confirmDriveUploadButton: 'אשר העלאה ל-Drive',
    driveBackupSavedSuccess: 'הגיבוי נשמר בהצלחה בתיקיית Google Drive שלך.',
    driveAuthExpiredError: 'החיבור ל-Google Drive פג תוקף. אנא התחבר שוב עם Google.',
    driveNoFoldersFound: 'לא נמצאו תיקיות משנה במיקום זה ב-Google Drive.',
  },
};

export function resolveLocalizedText(
  fallback: string,
  localized: LocalizedText | undefined,
  lang: LanguageCode
): string {
  if (localized && localized[lang]) {
    return localized[lang];
  }
  return fallback;
}

export function getStatusLabel(status: TaskStatus, t: TranslationDictionary): string {
  switch (status) {
    case 'todo':
      return t.statusTodo;
    case 'in_progress':
      return t.statusInProgress;
    case 'review':
      return t.statusReview;
    case 'completed':
      return t.statusCompleted;
  }
}

export function getPriorityLabel(priority: TaskPriority, t: TranslationDictionary): string {
  switch (priority) {
    case 'low':
      return t.priorityLow;
    case 'medium':
      return t.priorityMedium;
    case 'high':
      return t.priorityHigh;
    case 'critical':
      return t.priorityCritical;
  }
}
