"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Image as ImageIcon,
  Plus,
  Search,
  Lock,
  Globe,
  Download,
  Share2,
  Trash2,
  Edit,
  Heart,
  Eye,
  Check,
  Calendar,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { GalleryPhotoManager } from "@/components/ui/GalleryPhotoManager";
import { formatDate } from "@/lib/utils";
import type { Gallery, GalleryImage, Client, EventType } from "@/types";

export default function GalleriesPage() {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // Gallery Photo Manager
  const [managingPhotosId, setManagingPhotosId] = useState<string | null>(null);


  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGallery, setEditingGallery] = useState<Gallery | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    clientId: "",
    description: "",
    coverImage: "",
    eventType: "wedding" as EventType,
    shootDate: new Date().toISOString().split("T")[0],
    isPublic: true,
    isPasswordProtected: false,
    accessPassword: "",
    downloadEnabled: true,
  });

  const fetchGalleries = async () => {
    setLoading(true);
    try {
      const [gRes, cRes] = await Promise.all([
        fetch("/api/galleries").then((r) => r.json()),
        fetch("/api/clients").then((r) => r.json()),
      ]);
      setGalleries(gRes.galleries || []);
      setClients(cRes.clients || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGalleries();
  }, []);

  const handleOpenAdd = () => {
    setEditingGallery(null);
    setFormData({
      title: "",
      clientId: clients[0]?.id || "",
      description: "Exclusive curated preview gallery for clients.",
      coverImage: "",
      eventType: "wedding",
      shootDate: new Date().toISOString().split("T")[0],
      isPublic: true,
      isPasswordProtected: false,
      accessPassword: "",
      downloadEnabled: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (gal: Gallery, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingGallery(gal);
    setFormData({
      title: gal.title,
      clientId: gal.clientId || "",
      description: gal.description || "",
      coverImage: gal.coverImage || "",
      eventType: gal.eventType || "wedding",
      shootDate: gal.shootDate || "",
      isPublic: gal.isPublic,
      isPasswordProtected: gal.isPasswordProtected,
      accessPassword: gal.accessPassword || "",
      downloadEnabled: gal.downloadEnabled ?? true,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this gallery?")) return;
    try {
      const res = await fetch(`/api/galleries/${id}`, { method: "DELETE" });
      if (res.ok) {
        setGalleries((prev) => prev.filter((g) => g.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyLink = (gal: Gallery, e: React.MouseEvent) => {
    e.stopPropagation();
    const link = `${window.location.origin}/gallery/${gal.shareUrlToken}/view`;
    navigator.clipboard.writeText(link);
    setCopiedId(gal.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      alert("Please enter a gallery title.");
      return;
    }

    try {
      const client = clients.find((c) => c.id === formData.clientId);
      const payload = {
        ...formData,
        clientName: client?.name || "",
      };

      if (editingGallery) {
        const res = await fetch(`/api/galleries/${editingGallery.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          fetchGalleries();
          setModalOpen(false);
        }
      } else {
        const res = await fetch("/api/galleries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            images: formData.coverImage
              ? [
                  {
                    id: `img_${Date.now()}_1`,
                    url: formData.coverImage,
                    caption: "Cover Photo",
                    isFavorite: true,
                    order: 1,
                    createdAt: new Date().toISOString(),
                  },
                ]
              : [],
          }),
        });
        if (res.ok) {
          fetchGalleries();
          setModalOpen(false);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredGalleries = galleries.filter((g) =>
    g.title.toLowerCase().includes(search.toLowerCase()) ||
    (g.clientName && g.clientName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ImageIcon className="h-7 w-7 text-primary" />
            <span>Project Galleries & Delivery</span>
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Deliver online photo albums, password-protected portals, and favorite selections to clients.
          </p>
        </div>

        <Button size="sm" onClick={handleOpenAdd} className="gap-1.5 text-xs shadow-sm">
          <Plus className="h-4 w-4" />
          <span>New Album / Gallery</span>
        </Button>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search albums by title or client name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card shadow-sm"
          />
        </div>
      </div>

      {/* Galleries Grid */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 rounded-xl border bg-card/40 animate-pulse" />
          ))}
        </div>
      ) : filteredGalleries.length === 0 ? (
        <Card className="py-16 text-center">
          <CardContent className="space-y-3">
            <ImageIcon className="h-10 w-10 text-muted-foreground mx-auto" />
            <h3 className="text-base font-semibold text-foreground">No galleries created</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Create an online delivery gallery for your client's photoshoot.
            </p>
            <Button size="sm" onClick={handleOpenAdd} className="mt-2">
              <Plus className="h-4 w-4 mr-1.5" />
              Create Gallery
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGalleries.map((gal) => (
            <Card
              key={gal.id}
              className="overflow-hidden hover:border-primary/50 transition-all duration-200 flex flex-col justify-between group shadow-sm"
            >
              {/* Cover Image & Badges */}
              <div className="relative h-48 w-full bg-secondary overflow-hidden">
                {gal.coverImage ? (
                  <img
                    src={gal.coverImage}
                    alt={gal.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground bg-primary/5">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <Badge variant="outline" className="bg-black/60 text-white border-white/20 text-[10px] capitalize">
                    {gal.eventType}
                  </Badge>
                  {gal.isPasswordProtected ? (
                    <Badge variant="warning" className="gap-1 text-[10px]">
                      <Lock className="h-3 w-3" />
                      <span>Password Protected</span>
                    </Badge>
                  ) : (
                    <Badge variant="success" className="gap-1 text-[10px]">
                      <Globe className="h-3 w-3" />
                      <span>Public</span>
                    </Badge>
                  )}
                </div>

                <div className="absolute bottom-3 left-4 right-4">
                  <div className="text-xs font-semibold text-emerald-400">
                    {gal.images?.length || 0} Photographs
                  </div>
                  <div className="text-base font-bold text-white truncate">
                    {gal.title}
                  </div>
                </div>
              </div>

              <CardContent className="space-y-3 p-4 flex-1">
                {gal.clientName && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-primary" />
                    <span>Client: {gal.clientName}</span>
                  </div>
                )}

                {gal.shootDate && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <span>Shoot Date: {formatDate(gal.shootDate)}</span>
                  </div>
                )}

                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {gal.description || "Digital deliverables ready for selection."}
                </p>
              </CardContent>

              {/* Action buttons footer */}
              <div className="p-4 pt-0 border-t flex items-center justify-between text-xs mt-2">
                <Link
                  href={`/gallery/${gal.shareUrlToken}/view`}
                  target="_blank"
                  className="flex items-center gap-1 text-primary hover:underline font-medium"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Client View</span>
                </Link>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => handleCopyLink(gal, e)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
                    title="Copy Share Link"
                  >
                    {copiedId === gal.id ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Share2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={(e) => handleOpenEdit(gal, e)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
                    title="Edit Gallery"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(gal.id, e)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Delete Gallery"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Gallery Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogHeader>
          <DialogTitle>{editingGallery ? "Edit Gallery Album" : "Create Client Gallery"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Gallery Title *</label>
              <Input
                required
                placeholder="e.g. Tanvir & Farhana — Royal Wedding Highlights"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Assign Client</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background/50 px-3 text-sm"
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              >
                <option value="">No client assigned</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Event Type</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background/50 px-3 text-sm capitalize"
                value={formData.eventType}
                onChange={(e) => setFormData({ ...formData, eventType: e.target.value as EventType })}
              >
                {["wedding", "portrait", "fashion", "product", "birthday", "corporate", "cinematography"].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Cover Image</label>
              <ImageUploader
                currentImageUrl={formData.coverImage}
                onUploadComplete={(url) => setFormData({ ...formData, coverImage: url })}
                onRemove={() => setFormData({ ...formData, coverImage: "" })}
                label="Upload Cover Image"
                folder="galleries/covers"
                aspectRatio="aspect-video"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Shoot Date</label>
              <Input
                type="date"
                value={formData.shootDate}
                onChange={(e) => setFormData({ ...formData, shootDate: e.target.value })}
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Description</label>
              <Textarea
                placeholder="Brief description or message for client"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            {/* Privacy Controls */}
            <div className="space-y-2 sm:col-span-2 border-t pt-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pwdProtect"
                  checked={formData.isPasswordProtected}
                  onChange={(e) => setFormData({ ...formData, isPasswordProtected: e.target.checked })}
                  className="rounded border-input text-primary focus:ring-primary"
                />
                <label htmlFor="pwdProtect" className="text-xs font-semibold text-foreground cursor-pointer">
                  Protect with Client Password
                </label>
              </div>

              {formData.isPasswordProtected && (
                <div className="space-y-1 pt-1">
                  <label className="text-xs font-semibold text-muted-foreground">Access Password *</label>
                  <Input
                    type="password"
                    required
                    placeholder="Enter private client passcode"
                    value={formData.accessPassword}
                    onChange={(e) => setFormData({ ...formData, accessPassword: e.target.value })}
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingGallery ? "Save Changes" : "Create Gallery"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
