import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  MoveUpRight,
  Pencil,
  RotateCcw,
  Square,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import { LanguageCode, TaskAttachment } from '../types/task';
import { resolveLocalizedText, TranslationDictionary } from '../i18n/translations';

export type AnnotationTool = 'pen' | 'arrow' | 'rect' | 'text';

interface Point {
  x: number;
  y: number;
}

interface AnnotationOperation {
  tool: AnnotationTool;
  color: string;
  strokeWidth: number;
  points: Point[];
  text?: string;
}

interface PhotoAnnotationModalProps {
  photo: TaskAttachment | null;
  lang: LanguageCode;
  t: TranslationDictionary;
  onClose: () => void;
  onSaveAnnotation: (annotatedDataUrl: string, updatedCaption: string) => void;
}

const COLORS = [
  { hex: '#EF4444', label: 'Red' },
  { hex: '#2563EB', label: 'Blue' },
  { hex: '#10B981', label: 'Green' },
  { hex: '#F59E0B', label: 'Amber' },
  { hex: '#FFFFFF', label: 'White' },
];

export const PhotoAnnotationModal: React.FC<PhotoAnnotationModalProps> = ({
  photo,
  lang,
  t,
  onClose,
  onSaveAnnotation,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);

  const [tool, setTool] = useState<AnnotationTool>('pen');
  const [color, setColor] = useState<string>('#EF4444');
  const [strokeWidth, setStrokeWidth] = useState<number>(5);
  const [textInput, setTextInput] = useState<string>('');
  const [captionDraft, setCaptionDraft] = useState<string>('');
  const [operations, setOperations] = useState<AnnotationOperation[]>([]);
  const [activeOp, setActiveOp] = useState<AnnotationOperation | null>(null);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({
    width: 900,
    height: 560,
  });

  useEffect(() => {
    if (!photo) return;
    setOperations([]);
    setActiveOp(null);
    setCaptionDraft(resolveLocalizedText(photo.caption || '', photo.localizedCaption, lang));

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      loadedImageRef.current = img;
      const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
      const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
      const maxW = Math.min(960, Math.max(320, vw - 32));
      const maxH = Math.min(620, Math.max(260, Math.round(vh * 0.52)));
      const natW = img.naturalWidth || 900;
      const natH = img.naturalHeight || 560;
      const scale = Math.min(maxW / natW, maxH / natH, 1);
      setCanvasSize({
        width: Math.max(300, Math.round(natW * scale)),
        height: Math.max(220, Math.round(natH * scale)),
      });
    };
    img.onerror = () => {
      loadedImageRef.current = null;
      setCanvasSize({ width: 640, height: 420 });
    };
    img.src = photo.url;
  }, [photo, lang]);

  const drawSingleOperation = (ctx: CanvasRenderingContext2D, op: AnnotationOperation) => {
    if (op.points.length === 0) return;
    ctx.save();
    ctx.strokeStyle = op.color;
    ctx.fillStyle = op.color;
    ctx.lineWidth = op.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (op.tool === 'pen') {
      ctx.beginPath();
      ctx.moveTo(op.points[0].x, op.points[0].y);
      for (let i = 1; i < op.points.length; i++) {
        ctx.lineTo(op.points[i].x, op.points[i].y);
      }
      if (op.points.length === 1) {
        ctx.arc(op.points[0].x, op.points[0].y, op.strokeWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.stroke();
      }
    } else if (op.tool === 'rect' && op.points.length >= 2) {
      const start = op.points[0];
      const end = op.points[op.points.length - 1];
      ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
    } else if (op.tool === 'arrow' && op.points.length >= 2) {
      const start = op.points[0];
      const end = op.points[op.points.length - 1];
      const headLen = Math.max(14, op.strokeWidth * 3.2);
      const angle = Math.atan2(end.y - start.y, end.x - start.x);

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(
        end.x - headLen * Math.cos(angle - Math.PI / 6),
        end.y - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        end.x - headLen * Math.cos(angle + Math.PI / 6),
        end.y - headLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
    } else if (op.tool === 'text' && op.text) {
      const pt = op.points[0];
      ctx.font = 'bold 18px "Plus Jakarta Sans", "IBM Plex Sans Arabic", "Heebo", sans-serif';
      const metrics = ctx.measureText(op.text);
      const padX = 10;
      const padY = 6;
      const boxW = metrics.width + padX * 2;
      const boxH = 30;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(pt.x, pt.y - boxH + padY, boxW, boxH);
      ctx.strokeStyle = op.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(pt.x, pt.y - boxH + padY, boxW, boxH);

      ctx.fillStyle = op.color === '#FFFFFF' ? '#FFFFFF' : op.color;
      ctx.textAlign = 'left';
      ctx.fillText(op.text, pt.x + padX, pt.y);
    }

    ctx.restore();
  };

  // Re-render canvas whenever operations, activeOp, or canvasSize changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background photo
    if (loadedImageRef.current) {
      ctx.drawImage(loadedImageRef.current, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    for (const op of operations) {
      drawSingleOperation(ctx, op);
    }
    if (activeOp) {
      drawSingleOperation(ctx, activeOp);
    }
  }, [operations, activeOp, canvasSize]);

  if (!photo) return null;

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getCanvasPoint(e);
    if (tool === 'text') {
      const label = textInput.trim() || '✓ Verified';
      setOperations((prev) => [
        ...prev,
        {
          tool: 'text',
          color,
          strokeWidth,
          points: [pt],
          text: label,
        },
      ]);
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    setActiveOp({
      tool,
      color,
      strokeWidth,
      points: [pt],
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeOp) return;
    const pt = getCanvasPoint(e);
    if (activeOp.tool === 'pen') {
      setActiveOp((prev) => (prev ? { ...prev, points: [...prev.points, pt] } : null));
    } else {
      setActiveOp((prev) => (prev ? { ...prev, points: [prev.points[0], pt] } : null));
    }
  };

  const handlePointerUp = () => {
    if (!activeOp) return;
    setOperations((prev) => [...prev, activeOp]);
    setActiveOp(null);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    onSaveAnnotation(dataUrl, captionDraft);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.annotationStudioTitle}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <div className="max-w-4xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh]">
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {t.annotationStudioTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {photo.name}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.cancel}
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Annotation Toolbar */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {/* Tool Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'pen', label: t.toolPen, icon: Pencil },
                { id: 'arrow', label: t.toolArrow, icon: MoveUpRight },
                { id: 'rect', label: t.toolRect, icon: Square },
                { id: 'text', label: t.toolText, icon: Type },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const active = tool === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTool(item.id)}
                  className={`h-8 px-3 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Colors & Stroke Width + Undo / Clear */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Color Swatches */}
            <div className="flex items-center gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  aria-label={c.label}
                  className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
                    color === c.hex
                      ? 'scale-115 ring-2 ring-blue-600 border-white'
                      : 'border-slate-300 dark:border-slate-700'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>

            {/* Stroke Width */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5">
              {[3, 5, 8].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setStrokeWidth(w)}
                  className={`px-2 py-1 text-[11px] font-mono rounded-md cursor-pointer ${
                    strokeWidth === w
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold'
                      : 'text-slate-500'
                  }`}
                >
                  {w}px
                </button>
              ))}
            </div>

            {/* Undo & Clear */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setOperations((prev) => prev.slice(0, -1))}
                disabled={operations.length === 0}
                className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t.undoAction}</span>
              </button>
              <button
                type="button"
                onClick={() => setOperations([])}
                disabled={operations.length === 0}
                className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.clearAnnotations}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Optional Text Callout Input when tool === 'text' */}
        {tool === 'text' && (
          <div className="px-5 py-2.5 bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-200/70 dark:border-blue-900/50 flex items-center gap-2">
            <Type className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={t.annotationTextPlaceholder}
              className="flex-1 h-8 px-3 text-xs rounded-lg border border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>
        )}

        {/* Interactive Canvas Viewport */}
        <div className="flex-1 min-h-0 bg-slate-950 flex items-center justify-center p-4 overflow-auto">
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="max-w-full max-h-[54vh] w-auto h-auto rounded-lg shadow-lg cursor-crosshair touch-none border border-slate-800"
          />
        </div>

        {/* Footer: Caption Edit + Save Annotated Photo */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
          <input
            type="text"
            value={captionDraft}
            onChange={(e) => setCaptionDraft(e.target.value)}
            placeholder={t.attachmentCaptionPlaceholder}
            aria-label={t.attachmentCaptionPlaceholder}
            className="flex-1 min-w-[220px] h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-3.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="h-9 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{t.saveAnnotatedPhoto}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
