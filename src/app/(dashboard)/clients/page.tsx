"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Search,
  Download,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Receipt,
  MoreVertical,
  Trash2,
  Edit,
  ExternalLink,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { formatCurrency, formatDate } from "@/lib/utils";
import { exportToCSV } from "@/lib/export-utils";
import { useTheme } from "@/components/layout/ThemeProvider";
import type { Client } from "@/types";

export default function ClientsPage() {
  const { currency, currencySymbol } = useTheme();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterBalance, setFilterBalance] = useState<"all" | "outstanding" | "settled">("all");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    avatar: "",
  });

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleOpenAdd = () => {
    setEditingClient(null);
    setFormData({
      name: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
      avatar: "",
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingClient(client);
    setFormData({
      name: client.name,
      phone: client.phone,
      email: client.email || "",
      address: client.address || "",
      notes: client.notes || "",
      avatar: client.avatar || "",
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this client?")) return;
    try {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
      if (res.ok) {
        setClients((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      alert("Name and phone are required.");
      return;
    }

    try {
      if (editingClient) {
        const res = await fetch(`/api/clients/${editingClient.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          fetchClients();
          setModalOpen(false);
        }
      } else {
        const res = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          fetchClients();
          setModalOpen(false);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportCSV = () => {
    const rows = clients.map((c) => ({
      ID: c.id,
      Name: c.name,
      Phone: c.phone,
      Email: c.email,
      Address: c.address,
      "Total Billed": c.totalBilled,
      "Total Paid": c.totalPaid,
      "Outstanding Balance": c.balance,
      Notes: c.notes,
      "Created At": c.createdAt,
    }));
    exportToCSV("photostudio_clients", rows);
  };

  // Filter clients
  const filteredClients = clients.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (filterBalance === "outstanding") return c.balance > 0;
    if (filterBalance === "settled") return c.balance === 0;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            <span>Client CRM</span>
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Manage your client profiles, bookings history, billing, and outstanding receivables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 shadow-sm text-xs">
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
          <Button size="sm" onClick={handleOpenAdd} className="gap-1.5 shadow-sm text-xs">
            <Plus className="h-4 w-4" />
            <span>New Client</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by client name, phone number, email, or venue location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card shadow-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-card border rounded-lg p-1 self-stretch sm:self-auto">
          <button
            onClick={() => setFilterBalance("all")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              filterBalance === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({clients.length})
          </button>
          <button
            onClick={() => setFilterBalance("outstanding")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              filterBalance === "outstanding" ? "bg-amber-500 text-black font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Due Balance
          </button>
          <button
            onClick={() => setFilterBalance("settled")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              filterBalance === "settled" ? "bg-emerald-500 text-black font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Settled (Paid)
          </button>
        </div>
      </div>

      {/* Clients Cards Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 rounded-xl border bg-card/40 animate-pulse" />
          ))}
        </div>
      ) : filteredClients.length === 0 ? (
        <Card className="py-16 text-center">
          <CardContent className="space-y-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No client records found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {search
                ? "No clients match your search criteria. Try a different query."
                : "Get started by adding your first client to the CRM."}
            </p>
            {!search && (
              <Button size="sm" onClick={handleOpenAdd} className="mt-2">
                <Plus className="h-4 w-4 mr-1.5" />
                Add Client
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => {
            const hasDue = client.balance > 0;
            return (
              <Card
                key={client.id}
                className="hover:border-primary/50 transition-all duration-200 group flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold flex items-center justify-center overflow-hidden shrink-0">
                        {client.avatar ? (
                          <img
                            src={client.avatar}
                            alt={client.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          client.name.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="truncate">
                        <Link
                          href={`/clients/${client.id}`}
                          className="font-bold text-sm text-foreground hover:text-primary transition-colors truncate block"
                        >
                          {client.name}
                        </Link>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span>{client.phone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleOpenEdit(client, e)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        title="Edit Client"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(client.id, e)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete Client"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  {client.email && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}

                  {client.address && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{client.address}</span>
                    </div>
                  )}

                  {/* Financial Status Strip */}
                  <div className="p-3 rounded-lg bg-background/60 border space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Total Billed:</span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(client.totalBilled, currency, currencySymbol)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Total Paid:</span>
                      <span className="font-semibold text-emerald-400">
                        {formatCurrency(client.totalPaid, currency, currencySymbol)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                      <span className="font-medium text-muted-foreground">Balance Due:</span>
                      <span
                        className={`font-bold font-mono ${
                          hasDue ? "text-amber-400" : "text-muted-foreground"
                        }`}
                      >
                        {formatCurrency(client.balance, currency, currencySymbol)}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/clients/${client.id}`}
                    className="flex items-center justify-between w-full py-2 px-3 rounded-lg bg-secondary/60 hover:bg-primary hover:text-primary-foreground text-xs font-medium transition-colors"
                  >
                    <span>View Activity & Shoots</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Client Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogHeader>
          <DialogTitle>{editingClient ? "Edit Client Profile" : "Add New Client"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">
                Client / Couple / Company Name *
              </label>
              <Input
                required
                placeholder="e.g. Tanvir & Farhana or Apex Tech Ltd"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">
                Phone Number *
              </label>
              <Input
                required
                placeholder="+880 1711-000000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="client@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">
                Address / City
              </label>
              <Input
                placeholder="e.g. House 14, Road 5, Dhanmondi, Dhaka"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">
                Profile Photo (Optional)
              </label>
              <ImageUploader
                currentImageUrl={formData.avatar}
                onUploadComplete={(url) => setFormData({ ...formData, avatar: url })}
                onRemove={() => setFormData({ ...formData, avatar: "" })}
                label="Upload Profile Photo"
                folder="clients/avatars"
                aspectRatio="aspect-square"
                circular
                compact
                className="mb-1"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">
                Client Notes & Shoot Preferences
              </label>
              <Textarea
                placeholder="Specific photography preferences, drone requests, wedding venue details..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingClient ? "Save Changes" : "Create Client"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
