"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { Upload, X, RefreshCw, ImageIcon, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ImageUploaderProps {
  /** Currently persisted image URL (from DB / settings). */
  currentImageUrl?: string | null;
  /** Called with the newly uploaded persistent URL on success. */
  onUploadComplete: (url: string) => void;
  /** Called when the user confirms removal of the image. */
  onRemove?: () => void;
  /** Label shown inside the drop-zone when empty. */
  label?: string;
  /** Cloudinary folder subfolder, e.g. "clients" | "packages" | "settings". */
  folder?: string;
  /** Desired display aspect ratio class (Tailwind). Defaults to "aspect-square". */
  aspectRatio?: string;
  /** Max file size in MB. Defaults to 10. */
  maxSizeMB?: number;
  /** Extra className for the root wrapper. */
  className?: string;
  /** Show a circular avatar crop instead of a rectangular zone. */
  circular?: boolean;
  /** If true, shows only a small compact icon button instead of the full drop zone. */
  compact?: boolean;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.webp,.gif";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ImageUploader({
  currentImageUrl,
  onUploadComplete,
  onRemove,
  label = "Upload Image",
  folder = "photo-studio-os",
  aspectRatio = "aspect-square",
  maxSizeMB = 10,
  className,
  circular = false,
  compact = false,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null); // local blob URL
  const [progress, setProgress] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  // Keep a stable preview from the persisted URL until a new upload replaces it
  const displayUrl = preview ?? currentImageUrl ?? null;

  // Revoke blob URL on unmount / replace
  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // --------------------------------------------------------------------------
  // File validation
  // --------------------------------------------------------------------------
  function validateFile(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.";
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File is too large (${humanSize(file.size)}). Maximum allowed: ${maxSizeMB} MB.`;
    }
    return null;
  }

  // --------------------------------------------------------------------------
  // Upload
  // --------------------------------------------------------------------------
  const doUpload = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setErrorMsg(validationError);
        setProgress("error");
        return;
      }

      // Show local preview immediately
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      setProgress("uploading");
      setErrorMsg(null);

      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", folder);

        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error ?? "Upload failed");
        }

        // Replace blob preview with persistent URL
        URL.revokeObjectURL(objectUrl);
        setPreview(null);
        setUploadedUrl(data.url);
        setProgress("done");
        onUploadComplete(data.url);

        // Clear "done" state after 3 s
        setTimeout(() => setProgress("idle"), 3000);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Upload failed. Please try again.";
        setErrorMsg(msg);
        setProgress("error");
        // Keep the local preview visible so the user sees what failed
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [folder, maxSizeMB, onUploadComplete, preview]
  );

  // --------------------------------------------------------------------------
  // Event handlers
  // --------------------------------------------------------------------------
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) doUpload(file);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) doUpload(file);
  }

  function handleRemove() {
    if (!confirm("Remove this image?")) return;
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(null);
    setUploadedUrl(null);
    setProgress("idle");
    setErrorMsg(null);
    onRemove?.();
  }

  // --------------------------------------------------------------------------
  // Compact mode — just a small button overlay (for tight card layouts)
  // --------------------------------------------------------------------------
  if (compact) {
    return (
      <div className={cn("relative inline-block group", className)}>
        {displayUrl ? (
          <img
            src={displayUrl}
            alt="Uploaded"
            className="h-16 w-16 rounded-full object-cover ring-2 ring-border"
          />
        ) : (
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center ring-2 ring-border">
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          </div>
        )}

        {/* Overlay on hover */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          title="Upload photo"
        >
          {progress === "uploading" ? (
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          ) : (
            <Upload className="h-5 w-5 text-white" />
          )}
        </button>

        {/* Remove button */}
        {displayUrl && onRemove && (
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remove"
          >
            <X className="h-3 w-3" />
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          className="hidden"
          onChange={handleFileChange}
        />

        {errorMsg && (
          <p className="absolute top-full mt-1 left-0 w-48 text-xs text-destructive bg-destructive/10 p-1.5 rounded shadow z-10">
            {errorMsg}
          </p>
        )}
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Full drop-zone mode
  // --------------------------------------------------------------------------
  return (
    <div className={cn("space-y-2", className)}>
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-xl overflow-hidden transition-all",
          circular ? "rounded-full" : "rounded-xl",
          aspectRatio,
          dragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border bg-muted/30 hover:border-primary/60 hover:bg-muted/50"
        )}
      >
        {/* Background image / preview */}
        {displayUrl && (
          <img
            src={displayUrl}
            alt="Preview"
            className={cn(
              "absolute inset-0 w-full h-full object-cover",
              circular ? "rounded-full" : ""
            )}
          />
        )}

        {/* Uploading overlay */}
        {progress === "uploading" && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 z-10">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
            <span className="text-xs text-white font-medium">Uploading…</span>
          </div>
        )}

        {/* Success flash */}
        {progress === "done" && (
          <div className="absolute inset-0 bg-emerald-500/60 flex flex-col items-center justify-center gap-2 z-10 animate-in fade-in">
            <CheckCircle className="h-8 w-8 text-white" />
            <span className="text-xs text-white font-semibold">Uploaded!</span>
          </div>
        )}

        {/* Empty state / placeholder */}
        {!displayUrl && progress !== "uploading" && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <div className="p-3 rounded-full bg-muted border">
              <Upload className="h-5 w-5" />
            </div>
            <div className="text-center px-4">
              <p className="text-xs font-semibold">{label}</p>
              <p className="text-[11px] mt-0.5 opacity-70">
                Drag & drop or click to browse
              </p>
              <p className="text-[10px] opacity-50 mt-0.5">
                JPEG · PNG · WebP · GIF · Max {maxSizeMB} MB
              </p>
            </div>
          </button>
        )}

        {/* Action buttons overlay (when image exists) */}
        {displayUrl && progress === "idle" && (
          <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 hover:opacity-100 group">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 text-xs font-semibold text-gray-800 shadow hover:bg-white transition-colors"
              title="Replace image"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Replace
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={handleRemove}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/90 text-xs font-semibold text-white shadow hover:bg-red-600 transition-colors"
                title="Remove image"
              >
                <X className="h-3.5 w-3.5" />
                Remove
              </button>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Error message */}
      {progress === "error" && errorMsg && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Action row below zone */}
      {displayUrl && progress === "idle" && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            className="gap-1.5 text-xs h-8"
          >
            <RefreshCw className="h-3 w-3" />
            Replace Image
          </Button>
          {onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="gap-1.5 text-xs h-8 text-destructive hover:bg-destructive/10"
            >
              <X className="h-3 w-3" />
              Remove
            </Button>
          )}
        </div>
      )}

      {!displayUrl && progress !== "uploading" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          className="gap-1.5 text-xs h-8 w-full"
        >
          <Upload className="h-3 w-3" />
          {label}
        </Button>
      )}
    </div>
  );
}
