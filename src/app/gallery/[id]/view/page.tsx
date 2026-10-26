"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Lock,
  Download,
  Heart,
  Share2,
  Camera,
  Check,
  Eye,
  X,
  Maximize2,
  Calendar,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { Gallery, GalleryImage } from "@/types";

export default function PublicGalleryViewPage() {
  const params = useParams();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(true);

  // Favorites tracking
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Lightbox / Image Zoom State
  const [activeImage, setActiveImage] = useState<GalleryImage | null>(null);

  const fetchGallery = async (pwd?: string) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const url = pwd
        ? `/api/galleries/${params.id}?password=${encodeURIComponent(pwd)}`
        : `/api/galleries/${params.id}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.locked) {
        setIsLocked(true);
        if (pwd) setErrorMsg("Incorrect password. Please try again.");
      } else if (data.gallery) {
        setGallery(data.gallery);
        setIsLocked(false);
        // Pre-populate favorites
        const favSet = new Set<string>();
        data.gallery.images?.forEach((img: any) => {
          if (img.isFavorite) favSet.add(img.id);
        });
        setFavorites(favSet);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchGallery();
    }
  }, [params.id]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGallery(passwordInput);
  };

  const toggleFavorite = (imgId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(favorites);
    if (next.has(imgId)) {
      next.delete(imgId);
    } else {
      next.add(imgId);
    }
    setFavorites(next);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground animate-pulse">
        Loading photography gallery...
      </div>
    );
  }

  // Password Unlock Gate
  if (isLocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full p-8 shadow-2xl border text-center space-y-6">
          <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Lock className="h-8 w-8" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-foreground">Private Client Gallery</h1>
            <p className="text-xs text-muted-foreground mt-1">
              This gallery is protected. Please enter the passcode provided by your photographer.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleUnlock} className="space-y-4">
            <Input
              type="password"
              required
              autoFocus
              placeholder="Enter Gallery Passcode"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="text-center font-mono text-base tracking-widest"
            />
            <Button type="submit" className="w-full">
              Unlock Gallery
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md w-full">
          <p className="text-foreground font-semibold">Gallery not found or link has expired.</p>
        </Card>
      </div>
    );
  }

  const images = gallery.images || [];

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Hero Cover Banner */}
      <div className="relative h-[45vh] md:h-[55vh] w-full overflow-hidden bg-secondary">
        {gallery.coverImage ? (
          <img
            src={gallery.coverImage}
            alt={gallery.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            <Camera className="h-16 w-16" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-black/40 to-transparent" />

        <div className="absolute bottom-8 left-4 right-4 max-w-6xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-black/60 text-white text-xs capitalize">
                {gallery.eventType}
              </Badge>
              {gallery.shootDate && (
                <span className="text-xs text-white/80 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formatDate(gallery.shootDate)}</span>
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-md">
              {gallery.title}
            </h1>
            {gallery.clientName && (
              <p className="text-sm font-medium text-emerald-400">
                Prepared exclusively for {gallery.clientName}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <div className="px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur text-xs font-semibold text-white border border-white/20">
              {images.length} High-Res Photos
            </div>
            {favorites.size > 0 && (
              <div className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5 fill-rose-500" />
                <span>{favorites.size} Selected</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Gallery Photo Grid */}
      <div className="max-w-6xl mx-auto px-4 mt-8">
        {gallery.description && (
          <p className="text-xs md:text-sm text-muted-foreground max-w-2xl leading-relaxed mb-6">
            {gallery.description}
          </p>
        )}

        {images.length === 0 ? (
          <Card className="py-16 text-center">
            <p className="text-muted-foreground text-xs">No photos uploaded to this album yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((img) => {
              const isFav = favorites.has(img.id);
              return (
                <div
                  key={img.id}
                  onClick={() => setActiveImage(img)}
                  className="group relative rounded-xl overflow-hidden bg-secondary aspect-[4/5] cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300"
                >
                  <img
                    src={img.url}
                    alt={img.caption || "Photo"}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                  {/* Top Heart Favorite Button */}
                  <button
                    onClick={(e) => toggleFavorite(img.id, e)}
                    className="absolute top-3 right-3 p-2 rounded-full bg-black/50 backdrop-blur text-white hover:scale-110 transition-transform"
                    title={isFav ? "Remove Favorite" : "Add to Favorites"}
                  >
                    <Heart
                      className={`h-4 w-4 ${isFav ? "fill-rose-500 text-rose-500" : "text-white"}`}
                    />
                  </button>

                  {/* Bottom Caption and Actions */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span className="text-xs truncate font-medium">
                      {img.caption || "View Fullscreen"}
                    </span>
                    <Maximize2 className="h-4 w-4 shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox / Zoom Dialog */}
      {activeImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => setActiveImage(null)} />
          <div className="relative z-50 max-w-5xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setActiveImage(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-primary transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={activeImage.url}
              alt="Fullscreen"
              className="max-h-[80vh] w-auto rounded-lg object-contain shadow-2xl"
            />
            {activeImage.caption && (
              <div className="mt-3 text-center text-sm text-white font-medium">
                {activeImage.caption}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
