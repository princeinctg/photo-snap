"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  Filter,
  Clock,
  MapPin,
  Camera,
  User,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronRight,
  List,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useTheme } from "@/components/layout/ThemeProvider";
import type { Booking, Client, PhotographyPackage, BookingStatus, EventType } from "@/types";

export default function BookingsPage() {
  const { currency, currencySymbol } = useTheme();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [packages, setPackages] = useState<PhotographyPackage[]>([]);
  const [loading, setLoading] = useState(true);

  // View state: 'list' | 'calendar'
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Calendar navigation state
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    clientId: "",
    packageId: "",
    title: "",
    eventType: "wedding" as EventType,
    shootDate: new Date().toISOString().split("T")[0],
    startTime: "15:00",
    endTime: "22:00",
    venue: "",
    locationAddress: "",
    assignedPhotographer: "",
    notes: "",
    totalPrice: 0,
    advancePayment: 0,
    status: "confirmed" as BookingStatus,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bRes, cRes, pRes] = await Promise.all([
        fetch("/api/bookings").then((r) => r.json()),
        fetch("/api/clients").then((r) => r.json()),
        fetch("/api/packages").then((r) => r.json()),
      ]);
      setBookings(bRes.bookings || []);
      setClients(cRes.clients || []);
      setPackages(pRes.packages || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // When package changes, auto-populate price
  const handlePackageChange = (pkgId: string) => {
    const selectedPkg = packages.find((p) => p.id === pkgId);
    setFormData((prev) => ({
      ...prev,
      packageId: pkgId,
      totalPrice: selectedPkg ? selectedPkg.price : prev.totalPrice,
      title: prev.title || (selectedPkg ? `${selectedPkg.name} Shoot` : prev.title),
    }));
  };

  const handleOpenAdd = () => {
    setEditingBooking(null);
    setConflictWarning(null);
    setFormData({
      clientId: clients[0]?.id || "",
      packageId: packages[0]?.id || "",
      title: "",
      eventType: "wedding",
      shootDate: new Date().toISOString().split("T")[0],
      startTime: "15:00",
      endTime: "22:00",
      venue: "",
      locationAddress: "",
      assignedPhotographer: "Principal Photographer",
      notes: "",
      totalPrice: packages[0]?.price || 35000,
      advancePayment: 15000,
      status: "confirmed",
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (booking: Booking, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBooking(booking);
    setConflictWarning(null);
    setFormData({
      clientId: booking.clientId,
      packageId: booking.packageId || "",
      title: booking.title,
      eventType: booking.eventType,
      shootDate: booking.shootDate,
      startTime: booking.startTime,
      endTime: booking.endTime || "",
      venue: booking.venue,
      locationAddress: booking.locationAddress || "",
      assignedPhotographer: booking.assignedPhotographer || "",
      notes: booking.notes || "",
      totalPrice: booking.totalPrice,
      advancePayment: booking.advancePayment,
      status: booking.status,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this booking?")) return;
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
      if (res.ok) {
        setBookings((prev) => prev.filter((b) => b.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.clientId || !formData.shootDate || !formData.venue) {
      alert("Please fill in Title, Client, Shoot Date, and Venue.");
      return;
    }

    try {
      const payload = {
        ...formData,
        packageName: packages.find((p) => p.id === formData.packageId)?.name || "",
        clientName: clients.find((c) => c.id === formData.clientId)?.name || "",
      };

      if (editingBooking) {
        const res = await fetch(`/api/bookings/${editingBooking.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          fetchData();
          setModalOpen(false);
        }
      } else {
        const res = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (res.ok) {
          if (result.hasConflict) {
            setConflictWarning(
              `Notice: Another booking is scheduled on ${formData.shootDate} with the same photographer (${formData.assignedPhotographer}). Booking saved, but please verify photographer schedule!`
            );
          } else {
            fetchData();
            setModalOpen(false);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter Bookings
  const filteredBookings = bookings.filter((b) => {
    const q = search.toLowerCase();
    const matchesSearch =
      b.title.toLowerCase().includes(q) ||
      (b.clientName && b.clientName.toLowerCase().includes(q)) ||
      (b.venue && b.venue.toLowerCase().includes(q)) ||
      (b.assignedPhotographer && b.assignedPhotographer.toLowerCase().includes(q));

    if (!matchesSearch) return false;
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    return true;
  });

  // Calendar Calculations
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentMonthDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonthDate(new Date(year, month + 1, 1));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarIcon className="h-7 w-7 text-primary" />
            <span>Bookings & Calendar</span>
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Manage your photoshoot schedule, photographer assignments, and scheduling conflicts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center bg-card border rounded-lg p-1">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
                viewMode === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="h-4 w-4" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
                viewMode === "calendar"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CalendarIcon className="h-4 w-4" />
              <span>Calendar</span>
            </button>
          </div>

          <Button size="sm" onClick={handleOpenAdd} className="gap-1.5 text-xs shadow-sm">
            <Plus className="h-4 w-4" />
            <span>Schedule Shoot</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bookings by title, client, venue, or photographer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card shadow-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-card border rounded-lg p-1 self-stretch sm:self-auto overflow-x-auto">
          {["all", "confirmed", "in_progress", "completed", "inquiry"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                statusFilter === st
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {st.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* LIST VIEW */}
      {viewMode === "list" && (
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 rounded-xl border bg-card/40 animate-pulse" />
              ))}
            </div>
          ) : filteredBookings.length === 0 ? (
            <Card className="py-16 text-center">
              <CardContent className="space-y-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                  <CalendarIcon className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground">No bookings found</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Schedule your first photoshoot or wedding event.
                </p>
                <Button size="sm" onClick={handleOpenAdd} className="mt-2">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Schedule Shoot
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredBookings.map((b) => {
              const hasDue = b.remainingBalance > 0;
              return (
                <Card
                  key={b.id}
                  className="hover:border-primary/40 transition-colors p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="flex flex-col items-center justify-center h-14 w-14 rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0 shadow-sm">
                      <span className="text-[11px] font-bold uppercase">{formatDate(b.shootDate, "MMM")}</span>
                      <span className="text-xl font-black leading-tight">{formatDate(b.shootDate, "dd")}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-foreground">{b.title}</span>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {b.eventType}
                        </Badge>
                        <Badge
                          variant={
                            b.status === "completed"
                              ? "success"
                              : b.status === "confirmed"
                              ? "info"
                              : "warning"
                          }
                          className="text-[10px] uppercase"
                        >
                          {b.status?.replace(/_/g, " ")}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 text-foreground font-medium">
                          <User className="h-3.5 w-3.5 text-primary" />
                          <span>{b.clientName || "Client"}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{b.startTime} - {b.endTime || "End"}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{b.venue}</span>
                        </span>
                        {b.assignedPhotographer && (
                          <span className="flex items-center gap-1">
                            <Camera className="h-3.5 w-3.5" />
                            <span>{b.assignedPhotographer}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Financial & Action Buttons */}
                  <div className="flex items-center justify-between md:justify-end gap-4 pt-2 md:pt-0 border-t md:border-t-0">
                    <div className="text-left md:text-right">
                      <div className="text-sm font-bold text-foreground">
                        {formatCurrency(b.totalPrice, currency, currencySymbol)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Adv: {formatCurrency(b.advancePayment, currency, currencySymbol)} •{" "}
                        <span className={hasDue ? "text-amber-400 font-semibold" : "text-emerald-400"}>
                          Due: {formatCurrency(b.remainingBalance, currency, currencySymbol)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Link href={`/invoices/new?bookingId=${b.id}&clientId=${b.clientId}&price=${b.totalPrice}&title=${encodeURIComponent(b.title)}`}>
                        <Button size="sm" variant="outline" className="h-8 gap-1 text-xs">
                          <Receipt className="h-3.5 w-3.5 text-primary" />
                          <span className="hidden sm:inline">Invoice</span>
                        </Button>
                      </Link>
                      <button
                        onClick={(e) => handleOpenEdit(b, e)}
                        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        title="Edit Booking"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(b.id, e)}
                        className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete Booking"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* CALENDAR VIEW */}
      {viewMode === "calendar" && (
        <Card className="p-4 md:p-6">
          {/* Calendar Month Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-foreground">
              {currentMonthDate.toLocaleString("default", { month: "long", year: "numeric" })}
            </h2>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={prevMonth} className="h-8 w-8 p-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonthDate(new Date())}
                className="h-8 text-xs"
              >
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={nextMonth} className="h-8 w-8 p-0">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-muted-foreground uppercase pb-2 border-b">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Calendar Grid Days */}
          <div className="grid grid-cols-7 gap-2 pt-2">
            {/* Empty slots before first day */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[100px] rounded-lg bg-card/20 p-2 border border-transparent" />
            ))}

            {/* Days in current month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${(month + 1).toString().padStart(2, "0")}-${dayNum.toString().padStart(2, "0")}`;
              const dayBookings = bookings.filter((b) => b.shootDate === dateStr);
              const isToday =
                new Date().toISOString().split("T")[0] === dateStr;

              return (
                <div
                  key={`day-${dayNum}`}
                  className={`min-h-[100px] rounded-lg border p-1.5 flex flex-col justify-between transition-colors ${
                    isToday ? "border-primary bg-primary/5" : "bg-card/50 hover:bg-secondary/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold h-6 w-6 rounded-full flex items-center justify-center ${
                        isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {dayNum}
                    </span>
                    {dayBookings.length > 0 && (
                      <span className="text-[10px] font-bold text-primary">
                        {dayBookings.length} {dayBookings.length === 1 ? "shoot" : "shoots"}
                      </span>
                    )}
                  </div>

                  {/* Booking pills inside date cell */}
                  <div className="space-y-1 mt-1 overflow-y-auto max-h-20">
                    {dayBookings.map((b) => (
                      <div
                        key={b.id}
                        onClick={(e) => handleOpenEdit(b, e)}
                        className="p-1 rounded text-[10px] font-medium bg-primary/10 border border-primary/20 text-primary truncate cursor-pointer hover:bg-primary/20"
                        title={`${b.title} (${b.startTime}) at ${b.venue}`}
                      >
                        {b.startTime} {b.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Schedule / Edit Shoot Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogHeader>
          <DialogTitle>{editingBooking ? "Edit Booking" : "Schedule New Photoshoot"}</DialogTitle>
        </DialogHeader>

        {conflictWarning && (
          <div className="p-3 mb-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{conflictWarning}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Shoot Title *</label>
              <Input
                required
                placeholder="e.g. Tanvir & Farhana Royal Wedding Reception"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Client *</label>
              <select
                required
                className="w-full h-9 rounded-md border border-input bg-background/50 px-3 text-sm"
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              >
                <option value="">Select Client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Package Template</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background/50 px-3 text-sm"
                value={formData.packageId}
                onChange={(e) => handlePackageChange(e.target.value)}
              >
                <option value="">Select Package</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - {formatCurrency(p.price, currency, currencySymbol)}
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
                {["wedding", "portrait", "product", "fashion", "birthday", "corporate", "cinematography", "custom"].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Status</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background/50 px-3 text-sm capitalize"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as BookingStatus })}
              >
                {["inquiry", "confirmed", "in_progress", "completed", "cancelled"].map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Shoot Date *</label>
              <Input
                type="date"
                required
                value={formData.shootDate}
                onChange={(e) => setFormData({ ...formData, shootDate: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Time (Start - End)</label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Venue & Location *</label>
              <Input
                required
                placeholder="e.g. Radisson Blu Grand Ballroom / PhotoSnap Studio A"
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Assigned Photographer(s)</label>
              <Input
                placeholder="e.g. Kabir Hossain & Cinematography Crew"
                value={formData.assignedPhotographer}
                onChange={(e) => setFormData({ ...formData, assignedPhotographer: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Total Price ({currencySymbol})</label>
              <Input
                type="number"
                min="0"
                value={formData.totalPrice}
                onChange={(e) => setFormData({ ...formData, totalPrice: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Advance Payment ({currencySymbol})</label>
              <Input
                type="number"
                min="0"
                value={formData.advancePayment}
                onChange={(e) => setFormData({ ...formData, advancePayment: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Shoot Notes</label>
              <Textarea
                placeholder="Specific camera gear required, drone aerial shots, lighting preferences..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingBooking ? "Save Changes" : "Confirm Booking"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
