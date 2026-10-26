"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  Upload,
  X,
  Star,
  StarOff,
  Loader2,
  AlertCircle,
  ImageIcon,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GalleryImage } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface GalleryPhotoManagerProps {
  galleryId: string;
  images: GalleryImage[];
  coverImageUrl?: string;
  onImagesChange: (images: GalleryImage[], newCoverUrl?: string) => void;
  readOnly?: boolean;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.webp,.gif";
const MAX_SIZE_MB = 10;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function GalleryPhotoManager({
  galleryId,
  images,
  coverImageUrl,
  onImagesChange,
  readOnly = false,
}: GalleryPhotoManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // Upload a single file and add it to the gallery
  // --------------------------------------------------------------------------
  const uploadFile = useCallback(
    async (file: File): Promise<void> => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        throw new Error(`"${file.name}" is not a supported image type.`);
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        throw new Error(
          `"${file.name}" exceeds the ${MAX_SIZE_MB} MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB).`
        );
      }

      // 1. Upload to storage
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", `galleries/${galleryId}`);

      const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error ?? "Upload failed");
      }

      // 2. Add to gallery via API
      const addRes = await fetch(`/api/galleries/${galleryId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: uploadData.url, caption: file.name.replace(/\.[^.]+$/, "") }),
      });
      const addData = await addRes.json();

      if (!addRes.ok || !addData.success) {
        throw new Error(addData.error ?? "Failed to save image to gallery");
      }

      onImagesChange(addData.gallery.images, addData.gallery.coverImage);
    },
    [galleryId, onImagesChange]
  );

  // --------------------------------------------------------------------------
  // Handle multiple file selection
  // --------------------------------------------------------------------------
  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (!fileArray.length) return;

      setError(null);
      setUploading(true);
      setTotalCount(fileArray.length);
      setUploadCount(0);

      const errors: string[] = [];

      for (const file of fileArray) {
        try {
          await uploadFile(file);
          setUploadCount((c) => c + 1);
        } catch (err: unknown) {
          errors.push(err instanceof Error ? err.message : `Failed to upload ${file.name}`);
        }
      }

      setUploading(false);
      if (errors.length > 0) {
        setError(errors.join(" | "));
      }
    },
    [uploadFile]
  );

  // --------------------------------------------------------------------------
  // Delete a photo
  // --------------------------------------------------------------------------
  async function handleDelete(imageId: string) {
    if (!confirm("Remove this photo from the gallery?")) return;

    try {
      const res = await fetch(`/api/galleries/${galleryId}/images?imageId=${imageId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onImagesChange(data.gallery.images, data.gallery.coverImage);
      }
    } catch {
      setError("Failed to delete photo.");
    }
  }

  // --------------------------------------------------------------------------
  // Set as cover
  // --------------------------------------------------------------------------
  async function handleSetCover(imageId: string) {
    try {
      const res = await fetch(`/api/galleries/${galleryId}/images`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onImagesChange(data.gallery.images, data.gallery.coverImage);
      }
    } catch {
      setError("Failed to set cover image.");
    }
  }

  // --------------------------------------------------------------------------
  // Drag handlers
  // --------------------------------------------------------------------------
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(true);
  }
  function handleDragLeave() {
    setDragActive(false);
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  return (
    <div className="space-y-4">
      {!readOnly && (
        <>
          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !uploading && inputRef.current?.click()}
            className={cn(
              "relative border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all text-center",
              dragActive
                ? "border-primary bg-primary/5 scale-[1.01]"
                : "border-border bg-muted/20 hover:border-primary/60 hover:bg-muted/40",
              uploading && "pointer-events-none opacity-60"
            )}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2 py-2">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-sm font-medium">
                  Uploading {uploadCount}/{totalCount}…
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-2">
                <div className="p-3 rounded-full bg-muted border">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Upload Photos to Gallery
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Drag & drop or click — select multiple files at once
                  </p>
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                    JPEG · PNG · WebP · GIF · Max {MAX_SIZE_MB} MB each
                  </p>
                </div>
              </div>
            )}

            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </>
      )}

      {/* Photo grid */}
      {images.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No photos in this gallery yet.</p>
          {!readOnly && (
            <p className="text-xs mt-1 opacity-70">Upload photos using the drop zone above.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img) => {
            const isCover = img.url === coverImageUrl;
            return (
              <div key={img.id} className="group relative aspect-square rounded-lg overflow-hidden bg-muted border">
                <img
                  src={img.url}
                  alt={img.caption || "Gallery photo"}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Cover badge */}
                {isCover && (
                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary text-primary-foreground shadow">
                    Cover
                  </div>
                )}

                {!readOnly && (
                  <>
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors" />

                    {/* Action buttons */}
                    <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!isCover && (
                        <button
                          type="button"
                          onClick={() => handleSetCover(img.id)}
                          title="Set as cover"
                          className="p-1.5 rounded-full bg-white/90 text-yellow-600 hover:bg-white transition-colors shadow"
                        >
                          <Star className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(img.id)}
                        title="Remove photo"
                        className="p-1.5 rounded-full bg-red-500/90 text-white hover:bg-red-600 transition-colors shadow"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!readOnly && images.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {images.length} photo{images.length !== 1 ? "s" : ""} · Hover a photo to set as cover or remove.
        </p>
      )}
    </div>
  );
}
