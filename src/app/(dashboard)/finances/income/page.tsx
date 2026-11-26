"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Plus,
  Search,
  Download,
  Calendar,
  CreditCard,
  DollarSign,
  Trash2,
  Edit,
  Tag,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { exportToCSV } from "@/lib/export-utils";
import { useTheme } from "@/components/layout/ThemeProvider";
import type { Income, IncomeCategory, PaymentMethod } from "@/types";

export default function IncomePage() {
  const { currency, currencySymbol } = useTheme();

  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    amount: 0,
    category: "wedding_shoot" as IncomeCategory,
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "bank_transfer" as PaymentMethod,
    reference: "",
    notes: "",
  });

  const fetchIncome = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/finances/income");
      if (res.ok) {
        const data = await res.json();
        setIncomes(data.incomes || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncome();
  }, []);

  const handleOpenAdd = () => {
    setEditingIncome(null);
    setFormData({
      title: "",
      amount: 0,
      category: "wedding_shoot",
      date: new Date().toISOString().split("T")[0],
      paymentMethod: "bank_transfer",
      reference: "",
      notes: "",
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (inc: Income, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingIncome(inc);
    setFormData({
      title: inc.title,
      amount: inc.amount,
      category: inc.category,
      date: inc.date,
      paymentMethod: inc.paymentMethod,
      reference: inc.reference || "",
      notes: inc.notes || "",
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this income transaction?")) return;
    try {
      const res = await fetch(`/api/finances/income/${id}`, { method: "DELETE" });
      if (res.ok) {
        setIncomes((prev) => prev.filter((i) => i.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || formData.amount <= 0) {
      alert("Please provide a title and valid amount.");
      return;
    }

    try {
      if (editingIncome) {
        const res = await fetch(`/api/finances/income/${editingIncome.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          fetchIncome();
          setModalOpen(false);
        } else {
          const err = await res.json().catch(() => ({}));
          alert(err.error || "Failed to update income.");
        }
      } else {
        const res = await fetch("/api/finances/income", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          fetchIncome();
          setModalOpen(false);
        } else {
          const err = await res.json().catch(() => ({}));
          alert(err.error || "Failed to record income.");
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportCSV = () => {
    const rows = incomes.map((i) => ({
      ID: i.id,
      Title: i.title,
      Amount: i.amount,
      Category: i.category,
      Date: i.date,
      "Payment Method": i.paymentMethod,
      Reference: i.reference,
      Notes: i.notes,
    }));
    exportToCSV("photostudio_income", rows);
  };

  const totalIncome = incomes.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);

  const filteredIncomes = incomes.filter((i) => {
    const q = search.toLowerCase();
    const matchesSearch =
      i.title.toLowerCase().includes(q) ||
      (i.clientName && i.clientName.toLowerCase().includes(q)) ||
      (i.reference && i.reference.toLowerCase().includes(q));

    if (!matchesSearch) return false;
    if (categoryFilter !== "all" && i.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <TrendingUp className="h-7 w-7 text-emerald-500" />
            <span>Recognized Income (Cash In)</span>
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Cash actually received from invoice payments and direct photography services.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
          <Button size="sm" onClick={handleOpenAdd} className="gap-1.5 text-xs">
            <Plus className="h-4 w-4" />
            <span>Record Income</span>
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="border-l-4 border-l-emerald-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Total Recognized Cash Income
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-extrabold text-emerald-400">
            {formatCurrency(totalIncome, currency, currencySymbol)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Cash-basis accounting: Recorded only upon confirmed payment receipt.
          </p>
        </CardContent>
      </Card>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search income by title, client, or reference ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card shadow-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-card border rounded-lg p-1 self-stretch sm:self-auto overflow-x-auto">
          {["all", "wedding_shoot", "portrait_session", "commercial", "cinematography"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                categoryFilter === cat
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground border-b">
              <tr>
                <th className="py-3 px-4">Title / Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-muted-foreground animate-pulse">
                    Loading income records...
                  </td>
                </tr>
              ) : filteredIncomes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-muted-foreground">
                    No income transactions found.
                  </td>
                </tr>
              ) : (
                filteredIncomes.map((inc) => (
                  <tr key={inc.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-foreground flex items-center gap-2">
                        <ArrowDownRight className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>{inc.title}</span>
                      </div>
                      {inc.clientName && (
                        <div className="text-xs text-muted-foreground pl-6">Client: {inc.clientName}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {inc.category?.replace(/_/g, " ")}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-muted-foreground">
                      {formatDate(inc.date)}
                    </td>

                    <td className="py-3.5 px-4 text-xs font-mono uppercase text-muted-foreground">
                      {inc.paymentMethod?.replace(/_/g, " ")}
                    </td>

                    <td className="py-3.5 px-4 text-xs font-mono text-muted-foreground">
                      {inc.reference || "—"}
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold font-mono text-emerald-400">
                      +{formatCurrency(inc.amount, currency, currencySymbol)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => handleOpenEdit(inc, e)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(inc.id, e)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogHeader>
          <DialogTitle>{editingIncome ? "Edit Income Entry" : "Record Recognized Income"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Income Description *</label>
              <Input
                required
                placeholder="e.g. Wedding Reception Advance / Portrait Session"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Amount ({currencySymbol}) *</label>
              <Input
                type="number"
                required
                min="1"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Date *</label>
              <Input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Category</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background/50 px-3 text-sm capitalize"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as IncomeCategory })}
              >
                {["wedding_shoot", "portrait_session", "commercial", "cinematography", "studio_rental", "album_sales", "workshop", "other"].map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Payment Method</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background/50 px-3 text-sm capitalize"
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as PaymentMethod })}
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="bkash">bKash</option>
                <option value="nagad">Nagad</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Reference / Transaction ID</label>
              <Input
                placeholder="Bank reference, Trx ID, or check number"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Notes</label>
              <Input
                placeholder="Additional notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingIncome ? "Save Changes" : "Record Income"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
