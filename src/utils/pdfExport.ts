import {
  FolderItem,
  LanguageCode,
  ProjectGroupItem,
  TaskAttachment,
  TaskItem,
} from '../types/task';
import {
  getPriorityLabel,
  getStatusLabel,
  resolveLocalizedText,
  TranslationDictionary,
} from '../i18n/translations';
import {
  buildTasksCsvReport,
  calculateTaskProgress,
  formatDateTimeStamp,
  formatFileSize,
} from './taskLogic';

/**
 * Computes aspect-fit drawing coordinates (x, y, width, height) for rendering
 * a photo thumbnail inside a bounding box without distortion.
 */
export function computeThumbnailDrawRect(
  imgWidth: number,
  imgHeight: number,
  boxX: number,
  boxY: number,
  boxWidth: number,
  boxHeight: number
): { x: number; y: number; width: number; height: number } {
  if (imgWidth <= 0 || imgHeight <= 0 || boxWidth <= 0 || boxHeight <= 0) {
    return { x: boxX, y: boxY, width: Math.max(0, boxWidth), height: Math.max(0, boxHeight) };
  }
  const scale = Math.min(boxWidth / imgWidth, boxHeight / imgHeight);
  const drawWidth = Math.round(imgWidth * scale);
  const drawHeight = Math.round(imgHeight * scale);
  const offsetX = boxX + Math.round((boxWidth - drawWidth) / 2);
  const offsetY = boxY + Math.round((boxHeight - drawHeight) / 2);
  return { x: offsetX, y: offsetY, width: drawWidth, height: drawHeight };
}

/**
 * Wraps a raw JPEG byte array (Uint8Array) into a valid, standards-compliant
 * single-page ISO-32000 PDF 1.4 binary document (Uint8Array).
 */
export function buildPdfFromJpegBytes(
  jpegBytes: Uint8Array,
  pixelWidth: number,
  pixelHeight: number
): Uint8Array {
  const pageWidthPt = 595.28; // A4 width in points
  const pageHeightPt = Math.max(
    841.89,
    Math.round((pixelHeight / pixelWidth) * pageWidthPt)
  );

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0]; // 1-indexed object offsets
  let currentOffset = 0;

  const pushText = (str: string) => {
    const bytes = encoder.encode(str);
    chunks.push(bytes);
    currentOffset += bytes.byteLength;
  };

  const pushBinary = (bytes: Uint8Array) => {
    chunks.push(bytes);
    currentOffset += bytes.byteLength;
  };

  const startObj = (id: number) => {
    offsets[id] = currentOffset;
    pushText(`${id} 0 obj\n`);
  };

  const endObj = () => {
    pushText('endobj\n');
  };

  // PDF Header
  pushText('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

  // 1: Catalog
  startObj(1);
  pushText('<< /Type /Catalog /Pages 2 0 R >>\n');
  endObj();

  // 2: Pages
  startObj(2);
  pushText('<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n');
  endObj();

  // 3: Page
  startObj(3);
  pushText(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt.toFixed(2)} ${pageHeightPt.toFixed(
      2
    )}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\n`
  );
  endObj();

  // 4: Image XObject (DCTDecode JPEG)
  startObj(4);
  pushText(
    `<< /Type /XObject /Subtype /Image /Width ${pixelWidth} /Height ${pixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.byteLength} >>\nstream\n`
  );
  pushBinary(jpegBytes);
  pushText('\nendstream\n');
  endObj();

  // 5: Page Content Stream
  const contentStream = `q\n${pageWidthPt.toFixed(2)} 0 0 ${pageHeightPt.toFixed(
    2
  )} 0 0 cm\n/Im0 Do\nQ\n`;
  const contentBytes = encoder.encode(contentStream);
  startObj(5);
  pushText(`<< /Length ${contentBytes.byteLength} >>\nstream\n`);
  pushBinary(contentBytes);
  pushText('endstream\n');
  endObj();

  // Xref table
  const xrefOffset = currentOffset;
  pushText(`xref\n0 6\n0000000000 65535 f \n`);
  for (let i = 1; i <= 5; i++) {
    const padded = String(offsets[i]).padStart(10, '0');
    pushText(`${padded} 00000 n \n`);
  }

  // Trailer
  pushText(
    `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  );

  // Concatenate all chunks
  const totalBytes = chunks.reduce((acc, c) => acc + c.byteLength, 0);
  const result = new Uint8Array(totalBytes);
  let pos = 0;
  for (const chunk of chunks) {
    result.set(chunk, pos);
    pos += chunk.byteLength;
  }
  return result;
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] || '';
  const binaryStr = window.atob(base64);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

function triggerPdfDownload(pdfBytes: Uint8Array, filename: string) {
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export interface PdfPhotoThumbnailItem {
  id: string;
  url: string;
  name: string;
  sizeText: string;
  caption?: string;
}

interface ReportLine {
  text: string;
  size: number;
  weight: 'normal' | 'bold';
  color: string;
  indent?: number;
  progressBar?: number;
  dividerBefore?: boolean;
  photoPair?: PdfPhotoThumbnailItem[];
}

function loadImageElement(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!url || typeof Image === 'undefined') {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function preloadPhotoMap(
  lines: ReportLine[]
): Promise<Map<string, HTMLImageElement>> {
  const map = new Map<string, HTMLImageElement>();
  const items: PdfPhotoThumbnailItem[] = [];
  for (const line of lines) {
    if (line.photoPair) {
      items.push(...line.photoPair);
    }
  }
  await Promise.all(
    items.map(async (item) => {
      const loaded = await loadImageElement(item.url);
      if (loaded) {
        map.set(item.id, loaded);
      }
    })
  );
  return map;
}

/**
 * Groups an array of photo attachments into pairs of 2 so they render
 * as a clean 2-column thumbnail gallery in the exported PDF.
 */
function buildPhotoThumbnailLines(
  attachments: TaskAttachment[],
  lang: LanguageCode
): ReportLine[] {
  const photos = attachments.filter((a) => a.type === 'photo');
  const lines: ReportLine[] = [];

  for (let i = 0; i < photos.length; i += 2) {
    const slice = photos.slice(i, i + 2).map((att) => ({
      id: att.id,
      url: att.url,
      name: att.name,
      sizeText: formatFileSize(att.sizeBytes),
      caption: resolveLocalizedText(att.caption || '', att.localizedCaption, lang),
    }));
    lines.push({
      text: '',
      size: 0,
      weight: 'normal',
      color: '#0F172A',
      photoPair: slice,
    });
  }
  return lines;
}

async function renderReportToPdf(
  title: string,
  subtitle: string,
  progressPercent: number,
  lines: ReportLine[],
  lang: LanguageCode,
  filename: string
): Promise<void> {
  const isRtl = lang === 'ar' || lang === 'he';
  const width = 1240;

  // Preload all photo thumbnails before drawing onto canvas
  const imageMap = await preloadPhotoMap(lines);

  const THUMB_ROW_HEIGHT = 310;
  let dynamicHeight = 360;
  for (const line of lines) {
    if (line.dividerBefore) dynamicHeight += 46;
    if (line.photoPair && line.photoPair.length > 0) {
      dynamicHeight += THUMB_ROW_HEIGHT;
    } else {
      dynamicHeight += line.size + 22;
      if (line.progressBar !== undefined) dynamicHeight += 20;
    }
  }
  const estimatedHeight = Math.max(1754, dynamicHeight + 80);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = estimatedHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.direction = isRtl ? 'rtl' : 'ltr';
  ctx.textAlign = isRtl ? 'right' : 'left';

  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, estimatedHeight);

  // Top Header Accent Banner
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, width, 165);

  const marginX = 72;
  const startX = isRtl ? width - marginX : marginX;

  ctx.font = 'bold 34px "Plus Jakarta Sans", "IBM Plex Sans Arabic", "Heebo", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(title, startX, 76);

  ctx.font = '20px "DM Sans", "IBM Plex Sans Arabic", "Heebo", sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText(subtitle, startX, 116);

  // Overall Progress Bar Box
  let y = 215;
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(marginX, y - 34, width - marginX * 2, 76);
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.strokeRect(marginX, y - 34, width - marginX * 2, 76);

  ctx.font = 'bold 22px "Plus Jakarta Sans", "IBM Plex Sans Arabic", "Heebo", sans-serif';
  ctx.fillStyle = '#0F172A';
  ctx.fillText(`${progressPercent}%`, startX, y - 4);

  // Bar track
  const barWidth = width - marginX * 2 - 48;
  const barX = marginX + 24;
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(barX, y + 12, barWidth, 12);

  ctx.fillStyle = progressPercent === 100 ? '#059669' : '#2563EB';
  const fillW = Math.round((barWidth * progressPercent) / 100);
  ctx.fillRect(isRtl ? barX + barWidth - fillW : barX, y + 12, fillW, 12);

  y += 88;

  const contentWidth = width - marginX * 2;
  const colGap = 28;
  const cardWidth = Math.floor((contentWidth - colGap) / 2);
  const cardHeight = 284;
  const imageAreaHeight = 196;

  for (const line of lines) {
    if (line.dividerBefore) {
      y += 12;
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(marginX, y);
      ctx.lineTo(width - marginX, y);
      ctx.stroke();
      y += 32;
    }

    if (line.photoPair && line.photoPair.length > 0) {
      // Draw up to 2 photo thumbnail cards side-by-side
      line.photoPair.forEach((photo, idx) => {
        const cardX = isRtl
          ? width - marginX - cardWidth - idx * (cardWidth + colGap)
          : marginX + idx * (cardWidth + colGap);
        const cardY = y - 12;

        // Card background & border
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(cardX, cardY, cardWidth, cardHeight);
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);

        // Dark slate photo frame backdrop
        const framePadding = 10;
        const frameX = cardX + framePadding;
        const frameY = cardY + framePadding;
        const frameW = cardWidth - framePadding * 2;
        const frameH = imageAreaHeight;

        ctx.fillStyle = '#0F172A';
        ctx.fillRect(frameX, frameY, frameW, frameH);

        const loadedImg = imageMap.get(photo.id);
        if (loadedImg && loadedImg.naturalWidth > 0 && loadedImg.naturalHeight > 0) {
          const rect = computeThumbnailDrawRect(
            loadedImg.naturalWidth,
            loadedImg.naturalHeight,
            frameX,
            frameY,
            frameW,
            frameH
          );
          ctx.drawImage(loadedImg, rect.x, rect.y, rect.width, rect.height);
        } else {
          // Clean vector camera/photo thumbnail fallback if image could not be decoded
          ctx.fillStyle = '#1E293B';
          ctx.fillRect(frameX + 8, frameY + 8, frameW - 16, frameH - 16);
          ctx.fillStyle = '#64748B';
          ctx.font = 'bold 16px "DM Sans", sans-serif';
          const prevAlign = ctx.textAlign;
          ctx.textAlign = 'center';
          ctx.fillText('PHOTO THUMBNAIL', frameX + frameW / 2, frameY + frameH / 2 + 6);
          ctx.textAlign = prevAlign;
        }

        // Photo metadata footer inside the thumbnail card
        const textStartX = isRtl ? cardX + cardWidth - 14 : cardX + 14;
        const maxTextW = cardWidth - 28;

        ctx.font = 'bold 16px "DM Sans", "IBM Plex Sans Arabic", "Heebo", sans-serif';
        ctx.fillStyle = '#0F172A';
        ctx.fillText(
          `${photo.name} (${photo.sizeText})`,
          textStartX,
          cardY + imageAreaHeight + 34,
          maxTextW
        );

        if (photo.caption) {
          ctx.font = '14px "DM Sans", "IBM Plex Sans Arabic", "Heebo", sans-serif';
          ctx.fillStyle = '#475569';
          ctx.fillText(
            photo.caption,
            textStartX,
            cardY + imageAreaHeight + 60,
            maxTextW
          );
        }
      });

      y += THUMB_ROW_HEIGHT;
      continue;
    }

    const indentOffset = (line.indent || 0) * (isRtl ? -28 : 28);
    ctx.font = `${line.weight === 'bold' ? 'bold ' : ''}${line.size}px "DM Sans", "IBM Plex Sans Arabic", "Heebo", sans-serif`;
    ctx.fillStyle = line.color;
    ctx.fillText(line.text, startX + indentOffset, y, width - marginX * 2 - 40);
    y += line.size + 18;

    if (line.progressBar !== undefined) {
      const miniW = 360;
      const miniX = isRtl ? startX - miniW : startX;
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(miniX, y - 10, miniW, 8);
      ctx.fillStyle = line.progressBar === 100 ? '#059669' : '#2563EB';
      const miniFill = Math.round((miniW * line.progressBar) / 100);
      ctx.fillRect(
        isRtl ? miniX + miniW - miniFill : miniX,
        y - 10,
        miniFill,
        8
      );
      y += 18;
    }
  }

  const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const jpegBytes = dataUrlToUint8Array(jpegDataUrl);
  const pdfBytes = buildPdfFromJpegBytes(jpegBytes, width, estimatedHeight);
  triggerPdfDownload(pdfBytes, filename);
}

/**
 * Exports a single Task (including progress bar, nested to-do checklist,
 * timestamped updates, photo thumbnails, and file attachments) as a downloadable PDF file.
 */
export async function exportTaskToPdf(
  task: TaskItem,
  lang: LanguageCode,
  t: TranslationDictionary
): Promise<void> {
  const title = resolveLocalizedText(task.title, task.localizedTitle, lang);
  const desc = resolveLocalizedText(task.description, task.localizedDescription, lang);
  const prog = calculateTaskProgress(task);
  const doneTodos = task.todos.filter((td) => td.completed).length;

  const lines: ReportLine[] = [
    {
      text: `${t.statusLabel}: ${getStatusLabel(task.status, t)}   ·   ${t.priorityLabel}: ${getPriorityLabel(task.priority, t)}   ·   ${t.dueDateLabel}: ${task.dueDate}`,
      size: 18,
      weight: 'bold',
      color: '#334155',
    },
  ];

  if (desc) {
    lines.push({
      text: desc,
      size: 18,
      weight: 'normal',
      color: '#475569',
    });
  }

  // To-Do Checklist Section
  lines.push({
    text: `${t.todoChecklistTitle} (${doneTodos}/${task.todos.length})`,
    size: 22,
    weight: 'bold',
    color: '#0F172A',
    dividerBefore: true,
  });

  if (task.todos.length === 0) {
    lines.push({
      text: t.noTodosYet,
      size: 17,
      weight: 'normal',
      color: '#64748B',
      indent: 1,
    });
  } else {
    for (const todo of task.todos) {
      const todoTitle = resolveLocalizedText(todo.title, todo.localizedTitle, lang);
      lines.push({
        text: `${todo.completed ? '[✓]' : '[ ]'}  ${todoTitle}`,
        size: 18,
        weight: 'normal',
        color: todo.completed ? '#059669' : '#1E293B',
        indent: 1,
      });
      if (todo.subTodos && todo.subTodos.length > 0) {
        for (const sub of todo.subTodos) {
          const subTitle = resolveLocalizedText(sub.title, sub.localizedTitle, lang);
          lines.push({
            text: `    ${sub.completed ? '[✓]' : '[ ]'}  ${subTitle}`,
            size: 16,
            weight: 'normal',
            color: sub.completed ? '#059669' : '#475569',
            indent: 2,
          });
        }
      }
      if (todo.photos && todo.photos.length > 0) {
        lines.push(...buildPhotoThumbnailLines(todo.photos, lang));
      }
    }
  }

  // Updates Section
  lines.push({
    text: `${t.updatesSectionTitle} (${task.updates.length})`,
    size: 22,
    weight: 'bold',
    color: '#0F172A',
    dividerBefore: true,
  });

  if (task.updates.length === 0) {
    lines.push({
      text: t.noUpdatesYet,
      size: 17,
      weight: 'normal',
      color: '#64748B',
      indent: 1,
    });
  } else {
    for (const upd of task.updates) {
      const updText = resolveLocalizedText(upd.content, upd.localizedContent, lang);
      lines.push({
        text: `${formatDateTimeStamp(upd.timestamp)} · ${upd.author}`,
        size: 16,
        weight: 'bold',
        color: '#2563EB',
        indent: 1,
      });
      lines.push({
        text: updText,
        size: 17,
        weight: 'normal',
        color: '#334155',
        indent: 1,
      });
      if (upd.photos && upd.photos.length > 0) {
        lines.push(...buildPhotoThumbnailLines(upd.photos, lang));
      }
    }
  }

  // Attachments Section (Visual Photo Thumbnails + Document Files)
  lines.push({
    text: `${t.attachmentsSectionTitle} (${task.attachments.length})`,
    size: 22,
    weight: 'bold',
    color: '#0F172A',
    dividerBefore: true,
  });

  if (task.attachments.length === 0) {
    lines.push({
      text: t.noAttachmentsYet,
      size: 17,
      weight: 'normal',
      color: '#64748B',
      indent: 1,
    });
  } else {
    // 1. Add embedded Photo Thumbnail cards
    const photoThumbLines = buildPhotoThumbnailLines(task.attachments, lang);
    lines.push(...photoThumbLines);

    // 2. Add non-photo File attachments
    const nonPhotoFiles = task.attachments.filter((att) => att.type !== 'photo');
    for (const att of nonPhotoFiles) {
      const cap = resolveLocalizedText(att.caption || '', att.localizedCaption, lang);
      lines.push({
        text: `• [FILE] ${att.name} (${formatFileSize(att.sizeBytes)})${cap ? ` — ${cap}` : ''}`,
        size: 17,
        weight: 'normal',
        color: '#334155',
        indent: 1,
      });
    }
  }

  await renderReportToPdf(
    title,
    `${t.appName} · ${t.taskTypeLabel} #${task.id}`,
    prog,
    lines,
    lang,
    `task_${task.id}_report.pdf`
  );
}

/**
 * Exports a Project / Group and all of its tasks, progress bars, checklists,
 * and embedded task photo thumbnails as a downloadable PDF file.
 */
export async function exportProjectToPdf(
  project: ProjectGroupItem,
  tasks: TaskItem[],
  lang: LanguageCode,
  t: TranslationDictionary
): Promise<void> {
  const projTitle = resolveLocalizedText(project.name, project.localizedName, lang);
  const projDesc = resolveLocalizedText(
    project.description,
    project.localizedDescription,
    lang
  );
  const avgProgress =
    tasks.length > 0
      ? Math.round(
          tasks.reduce((acc, tsk) => acc + calculateTaskProgress(tsk), 0) /
            tasks.length
        )
      : 0;

  const lines: ReportLine[] = [];
  if (projDesc) {
    lines.push({
      text: projDesc,
      size: 19,
      weight: 'normal',
      color: '#475569',
    });
  }

  lines.push({
    text: `${t.tasksInProject} (${tasks.length})`,
    size: 24,
    weight: 'bold',
    color: '#0F172A',
    dividerBefore: true,
  });

  for (const task of tasks) {
    const taskTitle = resolveLocalizedText(task.title, task.localizedTitle, lang);
    const prog = calculateTaskProgress(task);
    const doneTodos = task.todos.filter((td) => td.completed).length;

    lines.push({
      text: `${taskTitle} — ${prog}% (${doneTodos}/${task.todos.length} ${t.itemsCount})`,
      size: 20,
      weight: 'bold',
      color: '#0F172A',
      progressBar: prog,
      dividerBefore: true,
    });

    lines.push({
      text: `${getStatusLabel(task.status, t)} · ${getPriorityLabel(task.priority, t)} · ${t.dueDateLabel}: ${task.dueDate}`,
      size: 16,
      weight: 'normal',
      color: '#64748B',
      indent: 1,
    });

    for (const todo of task.todos) {
      const todoTitle = resolveLocalizedText(todo.title, todo.localizedTitle, lang);
      lines.push({
        text: `${todo.completed ? '[✓]' : '[ ]'}  ${todoTitle}`,
        size: 17,
        weight: 'normal',
        color: todo.completed ? '#059669' : '#334155',
        indent: 1,
      });
    }

    // Collect all photos across To-Do items, Updates, and Attachments for this task
    const allTaskPhotos: TaskAttachment[] = [
      ...task.todos.flatMap((td) => td.photos || []),
      ...task.updates.flatMap((u) => u.photos || []),
      ...task.attachments.filter((a) => a.type === 'photo'),
    ];
    const photoThumbLines = buildPhotoThumbnailLines(allTaskPhotos, lang);
    lines.push(...photoThumbLines);

    const nonPhotoFiles = task.attachments.filter((att) => att.type !== 'photo');
    for (const att of nonPhotoFiles) {
      const cap = resolveLocalizedText(att.caption || '', att.localizedCaption, lang);
      lines.push({
        text: `• [FILE] ${att.name} (${formatFileSize(att.sizeBytes)})${cap ? ` — ${cap}` : ''}`,
        size: 16,
        weight: 'normal',
        color: '#475569',
        indent: 1,
      });
    }
  }

  await renderReportToPdf(
    projTitle,
    `${t.appName} · ${t.projectTypeLabel} (${tasks.length} tasks)`,
    avgProgress,
    lines,
    lang,
    `project_${project.id}_report.pdf`
  );
}

/**
 * Exports a full Folder (with all its Project Groups, Tasks, Progress Bars, To-Dos, Updates, and Photo Thumbnails)
 * into a single combined PDF report.
 */
export async function exportFolderToPdf(
  folder: FolderItem,
  projects: ProjectGroupItem[],
  tasks: TaskItem[],
  lang: LanguageCode,
  t: TranslationDictionary
): Promise<void> {
  const folderTitle = resolveLocalizedText(folder.name, folder.localizedName, lang);
  const avgProgress =
    tasks.length > 0
      ? Math.round(tasks.reduce((sum, tsk) => sum + calculateTaskProgress(tsk), 0) / tasks.length)
      : 0;

  const lines: ReportLine[] = [];

  lines.push({
    text: `${t.projectsInFolder} (${projects.length}) · ${tasks.length} ${t.taskTypeLabel}`,
    size: 22,
    weight: 'bold',
    color: '#0F172A',
    dividerBefore: true,
  });

  for (const proj of projects) {
    const projTitle = resolveLocalizedText(proj.name, proj.localizedName, lang);
    const projTasks = tasks.filter((tsk) => tsk.projectId === proj.id);
    const projAvg =
      projTasks.length > 0
        ? Math.round(
            projTasks.reduce((sum, tsk) => sum + calculateTaskProgress(tsk), 0) /
              projTasks.length
          )
        : 0;

    lines.push({
      text: `${projTitle} — ${projAvg}% (${projTasks.length} tasks)`,
      size: 21,
      weight: 'bold',
      color: '#1E293B',
      progressBar: projAvg,
      dividerBefore: true,
    });

    for (const task of projTasks) {
      const taskTitle = resolveLocalizedText(task.title, task.localizedTitle, lang);
      const prog = calculateTaskProgress(task);
      const doneTodos = task.todos.filter((td) => td.completed).length;

      lines.push({
        text: `• ${taskTitle} — ${prog}% (${doneTodos}/${task.todos.length} ${t.itemsCount})`,
        size: 18,
        weight: 'bold',
        color: '#0F172A',
        indent: 1,
      });

      lines.push({
        text: `${getStatusLabel(task.status, t)} · ${getPriorityLabel(task.priority, t)} · ${t.dueDateLabel}: ${task.dueDate}`,
        size: 15,
        weight: 'normal',
        color: '#64748B',
        indent: 1,
      });

      for (const todo of task.todos) {
        const todoTitle = resolveLocalizedText(todo.title, todo.localizedTitle, lang);
        lines.push({
          text: `${todo.completed ? '[✓]' : '[ ]'}  ${todoTitle}`,
          size: 15,
          weight: 'normal',
          color: todo.completed ? '#059669' : '#334155',
          indent: 2,
        });
      }

      for (const upd of task.updates.slice(0, 3)) {
        const updText = resolveLocalizedText(upd.content, upd.localizedContent, lang);
        lines.push({
          text: `[${formatDateTimeStamp(upd.timestamp)}] ${updText}`,
          size: 14,
          weight: 'normal',
          color: '#475569',
          indent: 2,
        });
      }

      const allTaskPhotos: TaskAttachment[] = [
        ...task.todos.flatMap((td) => td.photos || []),
        ...task.updates.flatMap((u) => u.photos || []),
        ...task.attachments.filter((a) => a.type === 'photo'),
      ];
      const photoThumbLines = buildPhotoThumbnailLines(allTaskPhotos, lang);
      lines.push(...photoThumbLines);
    }
  }

  await renderReportToPdf(
    folderTitle,
    `${t.appName} · ${t.folderTypeLabel} (${projects.length} groups · ${tasks.length} tasks)`,
    avgProgress,
    lines,
    lang,
    `folder_${folder.id}_report.pdf`
  );
}

/**
 * Triggers a browser download of an Excel-compatible UTF-8 BOM CSV spreadsheet.
 */
export function exportTasksToExcelCsv(
  tasks: TaskItem[],
  projects: ProjectGroupItem[],
  folders: FolderItem[],
  filename = 'task_tracker_report.csv'
): void {
  const csvContent = buildTasksCsvReport(tasks, projects, folders);
  // Prepend UTF-8 BOM so Microsoft Excel opens Arabic, Hebrew, and English characters cleanly
  const bomAndCsv = `\uFEFF${csvContent}`;
  const blob = new Blob([bomAndCsv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

