import { FolderItem, ProjectGroupItem, TaskItem } from '../types/task';

export const SEED_FOLDERS: FolderItem[] = [
  {
    id: 'fld-1',
    name: 'Product & Engineering',
    localizedName: {
      en: 'Product & Engineering',
      ar: 'المنتج والهندسة',
      he: 'מוצר והנדסה',
    },
    createdAt: '2026-11-05T08:00:00.000Z',
  },
  {
    id: 'fld-2',
    name: 'Operations & Field QA',
    localizedName: {
      en: 'Operations & Field QA',
      ar: 'العمليات وفحص الجودة',
      he: 'תפעול ובקרת איכות',
    },
    createdAt: '2026-11-06T08:00:00.000Z',
  },
];

export const SEED_PROJECTS: ProjectGroupItem[] = [
  {
    id: 'prj-1',
    folderId: 'fld-1',
    name: 'Flutter Cross-Platform App',
    description: 'Responsive mobile & desktop UI with offline local storage sync.',
    localizedName: {
      en: 'Flutter Cross-Platform App',
      ar: 'تطبيق Flutter متعدد المنصات',
      he: 'אפליקציית Flutter חוצת פלטפורמות',
    },
    localizedDescription: {
      en: 'Responsive mobile & desktop UI with offline local storage sync.',
      ar: 'واجهة متجاوبة للهاتف وسطح المكتب مع مزامنة التخزين المحلي بدون إنترنت.',
      he: 'ממשק רספונסיבי למובייל ולמחשב עם סנכרון אחסון מקומי ללא אינטרנט.',
    },
    createdAt: '2026-11-05T08:30:00.000Z',
  },
  {
    id: 'prj-2',
    folderId: 'fld-1',
    name: 'Analytics & Reporting',
    description: 'Project completion metrics and real-time progress bar visualizations.',
    localizedName: {
      en: 'Analytics & Reporting',
      ar: 'التحليلات والتقارير',
      he: 'אנליטיקה ודוחות',
    },
    localizedDescription: {
      en: 'Project completion metrics and real-time progress bar visualizations.',
      ar: 'مقاييس إنجاز المشاريع وعرض أشرطة التقدم الفورية.',
      he: 'מדדי השלמת פרויקטים ותצוגת מדי התקדמות בזמן אמת.',
    },
    createdAt: '2026-11-05T09:00:00.000Z',
  },
  {
    id: 'prj-3',
    folderId: 'fld-2',
    name: 'Hardware Enclosure Rev C',
    description: 'Anodized CNC sensor housing inspection and tolerance verification.',
    localizedName: {
      en: 'Hardware Enclosure Rev C',
      ar: 'تصنيع الغلاف المعدني Rev C',
      he: 'מארז חומרה גרסה C',
    },
    localizedDescription: {
      en: 'Anodized CNC sensor housing inspection and tolerance verification.',
      ar: 'فحص غلاف المستشعر المصنع بالـ CNC والتحقق من الأبعاد الدقيقة.',
      he: 'בדיקת מארז חיישן מאלומיניום ואימות מידות מדויקות.',
    },
    createdAt: '2026-11-06T09:00:00.000Z',
  },
];

export const SEED_TASKS: TaskItem[] = [
  {
    id: 'tsk-101',
    folderId: 'fld-1',
    projectId: 'prj-1',
    title: 'Cross-Platform Adaptive Shell & Offline Local Sync',
    localizedTitle: {
      en: 'Cross-Platform Adaptive Shell & Offline Local Sync',
      ar: 'واجهة متجاوبة ومزامنة التخزين المحلي بدون إنترنت',
      he: 'מעטפת רספונסיבית וסנכרון אחסון מקומי אופליין',
    },
    description:
      'Build the focused sidebar hierarchy (Folders > Projects > Tasks) with automatic local storage persistence and multilingual RTL support.',
    localizedDescription: {
      en: 'Build the focused sidebar hierarchy (Folders > Projects > Tasks) with automatic local storage persistence and multilingual RTL support.',
      ar: 'بناء القائمة الجانبية المنظمة (مجلدات > مشاريع > مهام) مع الحفظ التلقائي المحلي ودعم اللغات العربية والعبرية والإنجليزية.',
      he: 'בניית היררכיית תפריט צד ממוקדת (תיקיות > פרויקטים > משימות) עם שמירה מקומית אוטומטית ותמיכה מלאה ב-RTL.',
    },
    project: 'Flutter Cross-Platform App',
    priority: 'critical',
    status: 'in_progress',
    dueDate: '2026-11-14',
    manualProgress: 75,
    todos: [
      {
        id: 'td-101-1',
        title: 'Implement local storage serializer with offline sync',
        localizedTitle: {
          en: 'Implement local storage serializer with offline sync',
          ar: 'تفعيل حفظ البيانات محلياً بدون الحاجة للإنترنت',
          he: 'מימוש שמירת נתונים מקומית בסנכרון אופליין',
        },
        completed: true,
        createdAt: '2026-11-07T09:00:00.000Z',
        photos: [
          {
            id: 'td-photo-101-1',
            name: 'todo_wireframe_check.jpg',
            type: 'photo',
            mimeType: 'image/jpeg',
            sizeBytes: 428500,
            url: './assets/images/task_photo_wireframe_board_1794335934785.jpg',
            addedAt: '2026-11-07T09:15:00.000Z',
            caption: 'Verified offline storage schema diagram',
            localizedCaption: {
              en: 'Verified offline storage schema diagram',
              ar: 'مخطط هيكل التخزين المحلي المعتمد',
              he: 'תרשים סכימת אחסון מקומי מאומת',
            },
          },
        ],
      },
      {
        id: 'td-101-2',
        title: 'Create Folder and Project hierarchy in the side navigation list',
        localizedTitle: {
          en: 'Create Folder and Project hierarchy in the side navigation list',
          ar: 'إنشاء هيكل المجلدات والمشاريع في القائمة الجانبية',
          he: 'יצירת היררכיית תיקיות ופרויקטים ברשימת הצד',
        },
        completed: true,
        createdAt: '2026-11-07T11:30:00.000Z',
      },
      {
        id: 'td-101-3',
        title: 'Add full edit and delete controls for every item',
        localizedTitle: {
          en: 'Add full edit and delete controls for every item',
          ar: 'إضافة إمكانية التعديل والحذف لأي عنصر في التطبيق',
          he: 'הוספת אפשרות עריכה ומחיקה לכל פריט באפליקציה',
        },
        completed: true,
        createdAt: '2026-11-08T15:20:00.000Z',
      },
      {
        id: 'td-101-4',
        title: 'Verify Arabic, Hebrew, and English translations',
        localizedTitle: {
          en: 'Verify Arabic, Hebrew, and English translations',
          ar: 'التحقق من الترجمة الكاملة للعربية والعبرية والإنجليزية',
          he: 'אימות תרגום מלא לעברית, ערבית ואנגלית',
        },
        completed: false,
        createdAt: '2026-11-09T10:00:00.000Z',
        subTodos: [
          {
            id: 'sub-101-4-1',
            todoId: 'td-101-4',
            title: 'Verify RTL layouts and flip direction',
            localizedTitle: {
              en: 'Verify RTL layouts and flip direction',
              ar: 'التحقق من تخطيط RTL واتجاه الواجهة',
              he: 'אימות פריסות RTL וכיוון הממשק',
            },
            completed: true,
            createdAt: '2026-11-09T10:15:00.000Z',
          },
          {
            id: 'sub-101-4-2',
            todoId: 'td-101-4',
            title: 'Check dictionary keys consistency across all 3 languages',
            localizedTitle: {
              en: 'Check dictionary keys consistency across all 3 languages',
              ar: 'فحص تطابق مفاتيح القاموس عبر اللغات الثلاث',
              he: 'בדיקת התאמת מפתחות המילון בכל שלוש השפות',
            },
            completed: false,
            createdAt: '2026-11-09T10:30:00.000Z',
          },
        ],
      },
    ],
    updates: [
      {
        id: 'upd-101-2',
        content:
          'Completed offline storage sync test with photo and document attachments. Instant load time verified.',
        localizedContent: {
          en: 'Completed offline storage sync test with photo and document attachments. Instant load time verified.',
          ar: 'تم الانتهاء من اختبار المزامنة المحلية مع الصور والملفات المرفقة بنجاح.',
          he: 'הושלמה בדיקת סנכרון אחסון מקומי עם תמונות וקבצים מצורפים.',
        },
        timestamp: '2026-11-10T09:45',
        author: 'Saleh Hmdan',
        milestoneTag: 'Verified',
        photos: [
          {
            id: 'upd-photo-101-2',
            name: 'update_sensor_bench_test.jpg',
            type: 'photo',
            mimeType: 'image/jpeg',
            sizeBytes: 589200,
            url: './assets/images/task_photo_hardware_prototype_1794335934786.jpg',
            addedAt: '2026-11-10T09:45:00.000Z',
            caption: 'Bench test verification snapshot attached to update log',
            localizedCaption: {
              en: 'Bench test verification snapshot attached to update log',
              ar: 'صورة توثيق الاختبار المرفقة مع التحديث الزمني',
              he: 'תמונת אימות בדיקת מעבדה מצורפת לעדכון',
            },
          },
        ],
      },
      {
        id: 'upd-101-1',
        content:
          'Simplified main workspace so selecting any item in the side list displays only that item cleanly.',
        localizedContent: {
          en: 'Simplified main workspace so selecting any item in the side list displays only that item cleanly.',
          ar: 'تم تبسيط الواجهة الرئيسية بحيث يعرض القسم الرئيسي فقط العنصر المختار من القائمة الجانبية.',
          he: 'פושט מסך העבודה הראשי כך שבחירת פריט מהצד מציגה רק אותו בצורה נקייה.',
        },
        timestamp: '2026-11-09T16:20',
        author: 'Elena Rostova',
      },
    ],
    attachments: [
      {
        id: 'att-101-1',
        name: 'studio_wireframe_board.jpg',
        type: 'photo',
        mimeType: 'image/jpeg',
        sizeBytes: 428500,
        url: './assets/images/task_photo_wireframe_board_1794335934785.jpg',
        addedAt: '2026-11-09T16:25:00.000Z',
        caption: 'Adaptive desktop & mobile wireframe layout study',
        localizedCaption: {
          en: 'Adaptive desktop & mobile wireframe layout study',
          ar: 'مخطط تصميم الواجهة المتجاوبة للهاتف وسطح المكتب',
          he: 'תרשים תכנון ממשק רספונסיבי למובייל ולמחשב',
        },
      },
      {
        id: 'att-101-2',
        name: 'offline_sync_protocol_v2.md',
        type: 'file',
        mimeType: 'text/markdown',
        sizeBytes: 18432,
        url:
          'data:text/markdown;charset=utf-8,' +
          encodeURIComponent(
            '# Offline Sync Protocol v2.4\n\n- Storage Key: `kinetix_workspace_v2`\n- Attachment Store: Base64 + Local Blobs\n'
          ),
        addedAt: '2026-11-08T14:10:00.000Z',
        caption: 'Technical specification for local-first storage sync',
        localizedCaption: {
          en: 'Technical specification for local-first storage sync',
          ar: 'المواصفات الفنية لمزامنة التخزين المحلي',
          he: 'מפרט טכני לסנכרון אחסון מקומי',
        },
      },
    ],
    createdAt: '2026-11-07T08:30:00.000Z',
    updatedAt: '2026-11-10T09:45:00.000Z',
  },
  {
    id: 'tsk-102',
    folderId: 'fld-1',
    projectId: 'prj-1',
    title: 'Field Photo Compression & Attachment Upload Pipeline',
    localizedTitle: {
      en: 'Field Photo Compression & Attachment Upload Pipeline',
      ar: 'ضغط الصور المرفقة وتحسين رفع الملفات محلياً',
      he: 'דחיסת תמונות שטח ומנגנון צירוף קבצים',
    },
    description:
      'Support attaching photos and files to every task with caption editing and instant preview.',
    localizedDescription: {
      en: 'Support attaching photos and files to every task with caption editing and instant preview.',
      ar: 'دعم إرفاق الصور والملفات في كل مهمة مع إمكانية تعديل الوصف والمعاينة الفورية.',
      he: 'תמיכה בצירוף תמונות וקבצים לכל משימה עם עריכת כיתוב ותצוגה מקדימה.',
    },
    project: 'Flutter Cross-Platform App',
    priority: 'medium',
    status: 'in_progress',
    dueDate: '2026-11-18',
    manualProgress: 50,
    todos: [
      {
        id: 'td-102-1',
        title: 'Add photo and file upload buttons to task view',
        localizedTitle: {
          en: 'Add photo and file upload buttons to task view',
          ar: 'إضافة أزرار رفع الصور والملفات داخل صفحة المهمة',
          he: 'הוספת כפתורי העלאת תמונות וקבצים לתצוגת המשימה',
        },
        completed: true,
        createdAt: '2026-11-08T10:00:00.000Z',
      },
      {
        id: 'td-102-2',
        title: 'Enable inline editing and deletion for attached files',
        localizedTitle: {
          en: 'Enable inline editing and deletion for attached files',
          ar: 'تمكين التعديل والحذف المباشر للمرفقات',
          he: 'אפשר עריכה ומחיקה ישירה לקבצים מצורפים',
        },
        completed: false,
        createdAt: '2026-11-08T12:00:00.000Z',
      },
    ],
    updates: [
      {
        id: 'upd-102-1',
        content: 'Added lightbox modal preview and inline caption editor for task photos.',
        localizedContent: {
          en: 'Added lightbox modal preview and inline caption editor for task photos.',
          ar: 'تمت إضافة نافذة معاينة الصور مع تعديل العنوان والوصف.',
          he: 'נוספה תצוגה מקדימה לתמונות ועריכת כיתוב ישירה.',
        },
        timestamp: '2026-11-08T16:45',
        author: 'Elena Rostova',
      },
    ],
    attachments: [],
    createdAt: '2026-11-08T09:00:00.000Z',
    updatedAt: '2026-11-08T16:45:00.000Z',
  },
  {
    id: 'tsk-103',
    folderId: 'fld-1',
    projectId: 'prj-2',
    title: 'Project Completion Metrics & Progress Visualization',
    localizedTitle: {
      en: 'Project Completion Metrics & Progress Visualization',
      ar: 'لوحة مقاييس إنجاز المشروع وعرض نسب التقدم',
      he: 'מדדי השלמת פרויקטים ותצוגת התקדמות',
    },
    description:
      'Calculate overall project completion percentages from task progress bars and subtask checklists.',
    localizedDescription: {
      en: 'Calculate overall project completion percentages from task progress bars and subtask checklists.',
      ar: 'حساب نسب الإنجاز الكلية للمشاريع من أشرطة تقدم المهام وقوائم المهام الفرعية.',
      he: 'חישוב אחוזי השלמה כוללים ממדי התקדמות המשימות ורשימות המטלות.',
    },
    project: 'Analytics & Reporting',
    priority: 'high',
    status: 'completed',
    dueDate: '2026-11-10',
    manualProgress: 100,
    todos: [
      {
        id: 'td-103-1',
        title: 'Aggregate overall task completion percentage',
        localizedTitle: {
          en: 'Aggregate overall task completion percentage',
          ar: 'حساب إجمالي نسبة إتمام المهام',
          he: 'שקלול אחוז השלמת המשימות הכולל',
        },
        completed: true,
        createdAt: '2026-11-05T10:00:00.000Z',
      },
      {
        id: 'td-103-2',
        title: 'Display per-project progress bars in Dashboard',
        localizedTitle: {
          en: 'Display per-project progress bars in Dashboard',
          ar: 'عرض أشرطة التقدم لكل مشروع في لوحة الإنجاز',
          he: 'הצגת מדי התקדמות לכל פרויקט בלוח הבקרה',
        },
        completed: true,
        createdAt: '2026-11-06T15:00:00.000Z',
      },
    ],
    updates: [
      {
        id: 'upd-103-1',
        content: 'Dashboard metrics now dynamically reflect all folder and project changes.',
        localizedContent: {
          en: 'Dashboard metrics now dynamically reflect all folder and project changes.',
          ar: 'تعكس لوحة المقاييس الآن جميع التغييرات في المجلدات والمشاريع فوراً.',
          he: 'מדדי לוח הבקרה משקפים כעת באופן דינמי את כל השינויים בתיקיות ובפרויקטים.',
        },
        timestamp: '2026-11-09T19:00',
        author: 'Saleh Hmdan',
      },
    ],
    attachments: [],
    createdAt: '2026-11-05T09:00:00.000Z',
    updatedAt: '2026-11-09T19:00:00.000Z',
  },
  {
    id: 'tsk-104',
    folderId: 'fld-2',
    projectId: 'prj-3',
    title: 'Hardware Sensor Enclosure CAD & Tolerance Check',
    localizedTitle: {
      en: 'Hardware Sensor Enclosure CAD & Tolerance Check',
      ar: 'فحص أبعاد غلاف المستشعر ومطابقة التصميم الهندسي',
      he: 'בדיקת מידות ותאימות הנדסית למארז החיישן',
    },
    description:
      'Complete CNC anodized aluminum enclosure tolerance checks and USB-C cutout verification.',
    localizedDescription: {
      en: 'Complete CNC anodized aluminum enclosure tolerance checks and USB-C cutout verification.',
      ar: 'إتمام فحوصات الدقة لغلاف الألومنيوم المؤكسد والتحقق من منفذ USB-C.',
      he: 'השלמת בדיקות דיוק למארז האלומיניום ואימות פתח חיבור USB-C.',
    },
    project: 'Hardware Enclosure Rev C',
    priority: 'high',
    status: 'in_progress',
    dueDate: '2026-11-12',
    manualProgress: 67,
    todos: [
      {
        id: 'td-104-1',
        title: 'Measure CNC milled enclosure walls with digital calipers (70.15mm)',
        localizedTitle: {
          en: 'Measure CNC milled enclosure walls with digital calipers (70.15mm)',
          ar: 'قياس جدران الغلاف المعدني بالفرجار الرقمي (70.15 ملم)',
          he: 'מדידת דפנות המארז באמצעות קליבר דיגיטלי (70.15 מ״מ)',
        },
        completed: true,
        createdAt: '2026-11-06T10:00:00.000Z',
      },
      {
        id: 'td-104-2',
        title: 'Test antenna connector torque and gasket seal',
        localizedTitle: {
          en: 'Test antenna connector torque and gasket seal',
          ar: 'اختبار إحكام موصل الهوائي ومانع التسرب',
          he: 'בדיקת מומנט חיבור האנטנה ואטימת האטם',
        },
        completed: true,
        createdAt: '2026-11-07T14:00:00.000Z',
      },
      {
        id: 'td-104-3',
        title: 'Export final STEP & DXF manufacturing package',
        localizedTitle: {
          en: 'Export final STEP & DXF manufacturing package',
          ar: 'تصدير ملفات التصنيع النهائية بصيغة STEP و DXF',
          he: 'ייצוא חבילת ייצור סופית בפורמט STEP ו-DXF',
        },
        completed: false,
        createdAt: '2026-11-09T09:15:00.000Z',
      },
    ],
    updates: [
      {
        id: 'upd-104-1',
        content: 'Digital caliper inspection confirmed 70.15mm outer width across all prototype units.',
        localizedContent: {
          en: 'Digital caliper inspection confirmed 70.15mm outer width across all prototype units.',
          ar: 'أكد الفحص بالفرجار الرقمي مطابقة العرض الخارجي 70.15 ملم لجميع الوحدات.',
          he: 'בדיקת קליבר דיגיטלי אימתה רוחב חיצוני של 70.15 מ״מ בכל יחידות האב-טיפוס.',
        },
        timestamp: '2026-11-10T08:15',
        author: 'Marcus Vance',
      },
    ],
    attachments: [
      {
        id: 'att-104-1',
        name: 'sensorflow_sf210_prototype.jpg',
        type: 'photo',
        mimeType: 'image/jpeg',
        sizeBytes: 589200,
        url: './assets/images/task_photo_hardware_prototype_1794335934786.jpg',
        addedAt: '2026-11-10T08:15:00.000Z',
        caption: 'Anodized SF-210 IoT sensor prototype with caliper verification',
        localizedCaption: {
          en: 'Anodized SF-210 IoT sensor prototype with caliper verification',
          ar: 'نموذج مستشعر SF-210 مع التحقق من القياس بالفرجار الرقمي',
          he: 'אב-טיפוס חיישן SF-210 עם אימות מדידה בקליבר דיגיטלי',
        },
      },
    ],
    createdAt: '2026-11-06T09:00:00.000Z',
    updatedAt: '2026-11-10T08:15:00.000Z',
  },
];
