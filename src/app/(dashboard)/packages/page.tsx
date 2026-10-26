"use client";

import React, { useState, useEffect } from "react";
import {
  Package as PackageIcon,
  Plus,
  Search,
  Clock,
  Image as ImageIcon,
  BookOpen,
  Check,
  Edit,
  Trash2,
  Copy,
  DollarSign,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/components/layout/ThemeProvider";
import type { PhotographyPackage } from "@/types";

export default function PackagesPage() {
  const { currency, currencySymbol } = useTheme();

  const [packages, setPackages] = useState<PhotographyPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PhotographyPackage | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 35000,
    coverImage: "",
    includedServices: ["Full Day Coverage", "100+ Edited Photos", "Online Private Gallery"],
    photographyHours: 8,
    editedPhotosCount: 100,
    albumOptions: "12x18 Leather Flush-Mount Album",
    deliveryTimeline: "21 Days",
    isActive: true,
  });

  const [serviceInput, setServiceInput] = useState("");

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/packages");
      if (res.ok) {
        const data = await res.json();
        setPackages(data.packages || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleOpenAdd = () => {
    setEditingPackage(null);
    setFormData({
      name: "",
      description: "",
      price: 35000,
      coverImage: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=80",
      includedServices: [
        "2 Senior Photographers",
        "8 Hours of Continuous Coverage",
        "120 Master retouched photos",
        "Exclusive Leather Photo Book",
      ],
      photographyHours: 8,
      editedPhotosCount: 120,
      albumOptions: "12x18 Leather Album",
      deliveryTimeline: "21 Days",
      isActive: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (pkg: PhotographyPackage, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description || "",
      price: pkg.price,
      coverImage: pkg.coverImage || "",
      includedServices: pkg.includedServices || [],
      photographyHours: pkg.photographyHours || 6,
      editedPhotosCount: pkg.editedPhotosCount || 100,
      albumOptions: pkg.albumOptions || "",
      deliveryTimeline: pkg.deliveryTimeline || "21 Days",
      isActive: pkg.isActive ?? true,
    });
    setModalOpen(true);
  };

  const handleDuplicate = async (pkg: PhotographyPackage, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const duplicate = {
        ...pkg,
        id: undefined,
        name: `${pkg.name} (Copy)`,
      };
      const res = await fetch("/api/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(duplicate),
      });
      if (res.ok) fetchPackages();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this package?")) return;
    try {
      const res = await fetch(`/api/packages/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPackages((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddService = () => {
    if (!serviceInput.trim()) return;
    setFormData({
      ...formData,
      includedServices: [...formData.includedServices, serviceInput.trim()],
    });
    setServiceInput("");
  };

  const handleRemoveService = (index: number) => {
    setFormData({
      ...formData,
      includedServices: formData.includedServices.filter((_, i) => i !== index),
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.price < 0) {
      alert("Please provide a package name and valid price.");
      return;
    }

    try {
      if (editingPackage) {
        const res = await fetch(`/api/packages/${editingPackage.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          fetchPackages();
          setModalOpen(false);
        }
      } else {
        const res = await fetch("/api/packages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          fetchPackages();
          setModalOpen(false);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredPackages = packages.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <PackageIcon className="h-7 w-7 text-primary" />
            <span>Photography Packages & Services</span>
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Configure unlimited wedding, portrait, and commercial packages with custom hours and deliverables.
          </p>
        </div>

        <Button size="sm" onClick={handleOpenAdd} className="gap-1.5 text-xs shadow-sm">
          <Plus className="h-4 w-4" />
          <span>New Package</span>
        </Button>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search packages by name or services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card shadow-sm"
          />
        </div>
      </div>

      {/* Packages Grid */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 rounded-xl border bg-card/40 animate-pulse" />
          ))}
        </div>
      ) : filteredPackages.length === 0 ? (
        <Card className="py-16 text-center">
          <CardContent className="space-y-3">
            <PackageIcon className="h-10 w-10 text-muted-foreground mx-auto" />
            <h3 className="text-base font-semibold text-foreground">No packages defined</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Create your studio's first photography combo package.
            </p>
            <Button size="sm" onClick={handleOpenAdd} className="mt-2">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Package
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPackages.map((pkg) => (
            <Card
              key={pkg.id}
              className="overflow-hidden hover:border-primary/50 transition-all duration-200 flex flex-col justify-between group shadow-sm"
            >
              {/* Cover Image & Price Banner */}
              <div className="relative h-44 w-full bg-secondary overflow-hidden">
                {pkg.coverImage ? (
                  <img
                    src={pkg.coverImage}
                    alt={pkg.name}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground bg-primary/5">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                  <div className="text-xl font-black text-white font-mono">
                    {formatCurrency(pkg.price, currency, currencySymbol)}
                  </div>
                  <Badge variant={pkg.isActive ? "success" : "secondary"} className="text-[10px]">
                    {pkg.isActive ? "Active" : "Archived"}
                  </Badge>
                </div>
              </div>

              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-foreground">{pkg.name}</CardTitle>
                <CardDescription className="text-xs line-clamp-2 mt-1">
                  {pkg.description || "Comprehensive photography session."}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 pt-0 flex-1">
                {/* Deliverables summary strip */}
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground border-y py-2.5">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span>{pkg.photographyHours} Hours Coverage</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-primary" />
                    <span>{pkg.editedPhotosCount}+ Edited Photos</span>
                  </div>
                </div>

                {/* Included Services Checklist */}
                <div className="space-y-1.5 text-xs text-muted-foreground pt-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                    Included Services:
                  </div>
                  {(pkg.includedServices || []).slice(0, 4).map((srv, idx) => (
                    <div key={idx} className="flex items-start gap-1.5">
                      <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="truncate">{srv}</span>
                    </div>
                  ))}
                  {pkg.includedServices && pkg.includedServices.length > 4 && (
                    <div className="text-[11px] text-primary font-medium pl-5">
                      +{pkg.includedServices.length - 4} more deliverables
                    </div>
                  )}
                </div>
              </CardContent>

              {/* Action buttons footer */}
              <div className="p-4 pt-0 border-t flex items-center justify-between text-xs mt-3">
                <span className="text-[11px] text-muted-foreground">Timeline: {pkg.deliveryTimeline}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => handleDuplicate(pkg, e)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
                    title="Duplicate Package"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleOpenEdit(pkg, e)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
                    title="Edit Package"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(pkg.id, e)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Delete Package"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Package Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogHeader>
          <DialogTitle>{editingPackage ? "Edit Photography Package" : "Create New Package"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Package Name *</label>
              <Input
                required
                placeholder="e.g. Grand Royal Wedding (Photo + Cinematic 4K)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Price ({currencySymbol}) *</label>
              <Input
                type="number"
                required
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Photography Hours</label>
              <Input
                type="number"
                min="1"
                value={formData.photographyHours}
                onChange={(e) => setFormData({ ...formData, photographyHours: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Master Edited Photos Count</label>
              <Input
                type="number"
                min="0"
                value={formData.editedPhotosCount}
                onChange={(e) => setFormData({ ...formData, editedPhotosCount: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Delivery Timeline</label>
              <Input
                placeholder="e.g. 21 Days"
                value={formData.deliveryTimeline}
                onChange={(e) => setFormData({ ...formData, deliveryTimeline: e.target.value })}
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Album Deliverable</label>
              <Input
                placeholder="e.g. 12x18 Flush-Mount Leatherette Box Album"
                value={formData.albumOptions}
                onChange={(e) => setFormData({ ...formData, albumOptions: e.target.value })}
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Cover Image URL</label>
              <Input
                placeholder="https://..."
                value={formData.coverImage}
                onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Description</label>
              <Textarea
                placeholder="Summary of this package coverage and crew details..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            {/* Included Services Multi-Add */}
            <div className="space-y-2 sm:col-span-2 border-t pt-3">
              <label className="text-xs font-semibold text-muted-foreground block">
                Included Deliverables / Services Checklist
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Drone 4K Aerial Coverage, 2 Senior Photographers..."
                  value={serviceInput}
                  onChange={(e) => setServiceInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddService();
                    }
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={handleAddService}>
                  Add
                </Button>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
                {formData.includedServices.map((srv, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 text-xs"
                  >
                    <span>{srv}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveService(idx)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingPackage ? "Save Package" : "Create Package"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
