"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload,
  X,
  Star,
  Loader2,
  AlertCircle,
  ImageIcon,
  CheckCircle,
  Eye,
  RefreshCw,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { GalleryImage } from "@/types";

interface GalleryPhotoManagerProps {
  galleryId: string;
  images: GalleryImage[];
  coverImageUrl?: string;
  clientId?: string;
  employeeId?: string;
  projectId?: string;
  onImagesChange: (images: GalleryImage[], newCoverUrl?: string) => void;
  readOnly?: boolean;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.webp,.gif";
const MAX_SIZE_MB = 10;

interface UploadQueueItem {
  id: string;
  file: File;
  previewUrl: string;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  errorMessage?: string;
}

export function GalleryPhotoManager({
  galleryId,
  images,
  coverImageUrl,
  clientId,
  employeeId,
  projectId,
  onImagesChange,
  readOnly = false,
}: GalleryPhotoManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state for gallery manager
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFavorite, setFilterFavorite] = useState(false);
  const [replacingImageId, setReplacingImageId] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryImage | null>(null);

  // Pagination for grid
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      queue.forEach((item) => {
        if (item.previewUrl.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, [queue]);

  // Upload item handler with progress and metadata persistence
  const processQueueItem = async (item: UploadQueueItem) => {
    try {
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: "uploading", progress: 20 } : q))
      );

      // Try secure Cloudinary direct signed upload first if available
      let uploadedData: {
        url: string;
        publicId?: string;
        thumbnailUrl?: string;
        fileName?: string;
        size?: number;
        format?: string;
      } | null = null;

      try {
        const sigRes = await fetch("/api/upload/signature", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folder: `galleries/${galleryId}` }),
        });
        const sigData = await sigRes.json();

        if (sigRes.ok && sigData.configured) {
          setQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, progress: 40 } : q))
          );
          // Direct client-to-Cloudinary upload with server signature
          const cldFormData = new FormData();
          cldFormData.append("file", item.file);
          cldFormData.append("api_key", sigData.apiKey);
          cldFormData.append("timestamp", String(sigData.timestamp));
          cldFormData.append("signature", sigData.signature);
          cldFormData.append("folder", sigData.folder);

          const cldRes = await fetch(
            `https://api.cloudinary.com/v1_1/${sigData.cloudName}/image/upload`,
            { method: "POST", body: cldFormData }
          );
          const cldResult = await cldRes.json();

          if (cldRes.ok && cldResult.secure_url) {
            uploadedData = {
              url: cldResult.secure_url,
              publicId: cldResult.public_id,
              thumbnailUrl: cldResult.secure_url.replace("/upload/", "/upload/c_fill,g_auto,w_400,h_400,q_auto,f_auto/"),
              fileName: item.file.name,
              size: item.file.size,
              format: cldResult.format || item.file.type.replace("image/", ""),
            };
          }
        }
      } catch (err) {
        console.warn("Direct Cloudinary signature upload error, trying proxy:", err);
      }

      // If direct signature was not used or fallback needed:
      if (!uploadedData) {
        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, progress: 50 } : q))
        );
        const fd = new FormData();
        fd.append("file", item.file);
        fd.append("folder", `galleries/${galleryId}`);

        const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
        const uploadResult = await uploadRes.json();

        if (!uploadRes.ok || !uploadResult.success) {
          throw new Error(uploadResult.error || "Upload failed");
        }
        uploadedData = uploadResult;
      }

      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, progress: 80 } : q))
      );

      // Save complete metadata to MongoDB Gallery
      const addRes = await fetch(`/api/galleries/${galleryId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: uploadedData?.url,
          publicId: uploadedData?.publicId || "",
          thumbnailUrl: uploadedData?.thumbnailUrl || uploadedData?.url,
          fileName: uploadedData?.fileName || item.file.name,
          size: uploadedData?.size || item.file.size,
          format: uploadedData?.format || item.file.type.replace("image/", ""),
          caption: item.file.name.replace(/\.[^.]+$/, ""),
          clientId: clientId || "",
          employeeId: employeeId || "",
          projectId: projectId || "",
        }),
      });
      const addData = await addRes.json();

      if (!addRes.ok || !addData.success) {
        throw new Error(addData.error || "Failed to save photo record");
      }

      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: "done", progress: 100 } : q))
      );

      onImagesChange(addData.gallery.images, addData.gallery.coverImage);
    } catch (err: any) {
      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? { ...q, status: "error", errorMessage: err.message || "Upload failed" }
            : q
        )
      );
    }
  };

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (!fileArray.length) return;

      setError(null);
      const newItems: UploadQueueItem[] = [];

      for (const file of fileArray) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          setError(`"${file.name}" is not a supported format (JPG, PNG, WebP, GIF only).`);
          continue;
        }
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
          setError(`"${file.name}" exceeds ${MAX_SIZE_MB} MB limit.`);
          continue;
        }

        const previewUrl = URL.createObjectURL(file);
        newItems.push({
          id: `queue_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          file,
          previewUrl,
          progress: 0,
          status: "pending",
        });
      }

      if (newItems.length > 0) {
        setQueue((prev) => [...prev, ...newItems]);
        for (const item of newItems) {
          await processQueueItem(item);
        }
      }
    },
    [galleryId, clientId, employeeId, projectId]
  );

  // Replace photo handler
  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replacingImageId) return;

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", `galleries/${galleryId}`);

      const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error || "Upload failed");
      }

      const updateRes = await fetch(`/api/galleries/${galleryId}/images`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageId: replacingImageId,
          url: uploadData.url,
          publicId: uploadData.publicId,
          thumbnailUrl: uploadData.thumbnailUrl || uploadData.url,
          fileName: file.name,
          size: file.size,
        }),
      });
      const updateData = await updateRes.json();

      if (updateRes.ok && updateData.success) {
        onImagesChange(updateData.gallery.images, updateData.gallery.coverImage);
      }
    } catch (err: any) {
      setError(err.message || "Failed to replace photo");
    } finally {
      setReplacingImageId(null);
      if (replaceInputRef.current) replaceInputRef.current.value = "";
    }
  };

  // Delete photo handler
  async function handleDelete(imageId: string) {
    if (!confirm("Remove this photo permanently from the gallery?")) return;

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

  // Set as cover
  async function handleSetCover(imageId: string) {
    try {
      const res = await fetch(`/api/galleries/${galleryId}/images`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId, isCover: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onImagesChange(data.gallery.images, data.gallery.coverImage);
      }
    } catch {
      setError("Failed to set cover image.");
    }
  }

  // Toggle favorite
  async function handleToggleFavorite(img: GalleryImage) {
    try {
      const res = await fetch(`/api/galleries/${galleryId}/images`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId: img.id, isFavorite: !img.isFavorite }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onImagesChange(data.gallery.images, data.gallery.coverImage);
      }
    } catch {
      setError("Failed to update favorite status.");
    }
  }

  // Filtering images
  const filteredImages = images.filter((img) => {
    const matchesSearch =
      !searchQuery ||
      (img.caption && img.caption.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (img.fileName && img.fileName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFav = !filterFavorite || img.isFavorite;
    return matchesSearch && matchesFav;
  });

  const totalPages = Math.max(1, Math.ceil(filteredImages.length / itemsPerPage));
  const paginatedImages = filteredImages.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-5">
      {!readOnly && (
        <>
          {/* Multi-image Drag & Drop Zone with Previews */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "relative border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all text-center",
              dragActive
                ? "border-primary bg-primary/5 scale-[1.01]"
                : "border-border bg-muted/20 hover:border-primary/60 hover:bg-muted/40"
            )}
          >
            <div className="flex flex-col items-center gap-2 py-2">
              <div className="p-3 rounded-full bg-primary/10 border border-primary/20 text-primary">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Upload Photos from Computer or Mobile
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select multiple JPG, PNG, WEBP, or GIF files at once
                </p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                  Automatic thumbnails, Cloudinary optimization & metadata linking
                </p>
              </div>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </div>

          {/* Hidden file input for Replace action */}
          <input
            ref={replaceInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            className="hidden"
            onChange={handleReplaceFile}
          />

          {/* Active Uploads Progress List */}
          {queue.length > 0 && (
            <div className="space-y-2 border rounded-xl p-3 bg-card/60">
              <div className="flex items-center justify-between text-xs font-semibold px-1">
                <span>Upload Queue ({queue.filter((q) => q.status === "done").length}/{queue.length})</span>
                {queue.every((q) => q.status === "done" || q.status === "error") && (
                  <button
                    onClick={() => setQueue([])}
                    className="text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Clear Queue
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2.5 p-2 rounded-lg border bg-background text-xs"
                  >
                    <img
                      src={item.previewUrl}
                      alt="preview"
                      className="h-10 w-10 rounded object-cover shrink-0 border"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{item.file.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full transition-all duration-300",
                              item.status === "error"
                                ? "bg-red-500"
                                : item.status === "done"
                                ? "bg-emerald-500"
                                : "bg-primary"
                            )}
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {item.status === "done" ? "Done" : `${item.progress}%`}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </>
      )}

      {/* Filter and Search Bar for Photos */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search photos by caption or filename..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-8 text-xs h-8 bg-card shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            size="sm"
            variant={filterFavorite ? "default" : "outline"}
            onClick={() => setFilterFavorite(!filterFavorite)}
            className="h-8 text-xs gap-1.5"
          >
            <Star className={cn("h-3.5 w-3.5", filterFavorite && "fill-yellow-400 text-yellow-400")} />
            <span>Favorites Only</span>
          </Button>

          <span className="text-xs text-muted-foreground ml-1">
            {filteredImages.length} photo{filteredImages.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Photo Grid with Replace, Delete, Cover & Thumbnail */}
      {filteredImages.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground border rounded-xl bg-card/40">
          <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">No photos match your filter</p>
          <p className="text-xs mt-1 opacity-70">Try adjusting your search query or upload new photos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {paginatedImages.map((img) => {
            const isCover = img.url === coverImageUrl;
            return (
              <div
                key={img.id}
                className="group relative aspect-square rounded-xl overflow-hidden bg-secondary border shadow-sm flex flex-col justify-between"
              >
                <img
                  src={img.thumbnailUrl || img.url}
                  alt={img.caption || "Gallery photo"}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />

                {/* Cover badge */}
                {isCover && (
                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary text-primary-foreground shadow">
                    Cover
                  </div>
                )}

                {/* Favorite badge */}
                {img.isFavorite && (
                  <div className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-yellow-400">
                    <Star className="h-3 w-3 fill-yellow-400" />
                  </div>
                )}

                {!readOnly && (
                  <>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors" />

                    {/* Action buttons overlay */}
                    <div className="absolute inset-0 flex flex-col justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleToggleFavorite(img)}
                          title={img.isFavorite ? "Unmark favorite" : "Mark as favorite"}
                          className="p-1 rounded-full bg-black/60 text-white hover:text-yellow-400"
                        >
                          <Star className={cn("h-3.5 w-3.5", img.isFavorite && "fill-yellow-400 text-yellow-400")} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(img.id)}
                          title="Delete photo"
                          className="p-1 rounded-full bg-red-600/80 text-white hover:bg-red-700"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="flex flex-col gap-1 items-center">
                        <span className="text-[10px] text-white/90 truncate max-w-[110px] text-center font-medium">
                          {img.caption || img.fileName || "Photo"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {!isCover && (
                            <button
                              type="button"
                              onClick={() => handleSetCover(img.id)}
                              className="px-2 py-0.5 text-[10px] font-medium rounded bg-white/90 text-black hover:bg-white"
                            >
                              Set Cover
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setReplacingImageId(img.id);
                              replaceInputRef.current?.click();
                            }}
                            className="p-1 rounded bg-white/80 text-black hover:bg-white"
                            title="Replace photo"
                          >
                            <RefreshCw className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedPhoto(img)}
                            className="p-1 rounded bg-white/80 text-black hover:bg-white"
                            title="Preview image"
                          >
                            <Eye className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs border-t">
          <span className="text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="h-7 px-2"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="h-7 px-2"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Lightbox / Zoom Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="fixed inset-0" onClick={() => setSelectedPhoto(null)} />
          <div className="relative z-50 max-w-4xl max-h-[85vh] flex flex-col items-center">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-primary transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.caption || "Preview"}
              className="max-h-[75vh] w-auto rounded-lg object-contain shadow-2xl"
            />
            <div className="mt-2 text-center text-xs text-white/80">
              {selectedPhoto.fileName && <span>{selectedPhoto.fileName}</span>}
              {selectedPhoto.size ? <span> · {(selectedPhoto.size / 1024).toFixed(1)} KB</span> : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
