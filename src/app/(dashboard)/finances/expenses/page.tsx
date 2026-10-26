"use client";

import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Plus,
  Search,
  Download,
  Calendar,
  DollarSign,
  Trash2,
  Edit,
  Tag,
  ArrowUpRight,
  FileText,
  Image as ImageIcon,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { exportToCSV } from "@/lib/export-utils";
import { useTheme } from "@/components/layout/ThemeProvider";
import type { Expense, ExpenseCategory, PaymentMethod } from "@/types";

export default function ExpensesPage() {
  const { currency, currencySymbol } = useTheme();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    amount: 0,
    category: "equipment" as ExpenseCategory,
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "card" as PaymentMethod,
    vendor: "",
    receiptUrl: "",
    referenceNumber: "",
    notes: "",
  });

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/finances/expenses");
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setFormData({
      title: "",
      amount: 0,
      category: "equipment",
      date: new Date().toISOString().split("T")[0],
      paymentMethod: "card",
      vendor: "",
      receiptUrl: "",
      referenceNumber: "",
      notes: "",
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (exp: Expense, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingExpense(exp);
    setFormData({
      title: exp.title,
      amount: exp.amount,
      category: exp.category,
      date: exp.date,
      paymentMethod: exp.paymentMethod,
      vendor: exp.vendor || "",
      receiptUrl: exp.receiptUrl || "",
      referenceNumber: exp.referenceNumber || "",
      notes: exp.notes || "",
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this expense?")) return;
    try {
      const res = await fetch(`/api/finances/expenses/${id}`, { method: "DELETE" });
      if (res.ok) {
        setExpenses((prev) => prev.filter((e) => e.id !== id));
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
      if (editingExpense) {
        const res = await fetch(`/api/finances/expenses/${editingExpense.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          fetchExpenses();
          setModalOpen(false);
        }
      } else {
        const res = await fetch("/api/finances/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          fetchExpenses();
          setModalOpen(false);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportCSV = () => {
    const rows = expenses.map((e) => ({
      ID: e.id,
      Title: e.title,
      Amount: e.amount,
      Category: e.category,
      Date: e.date,
      Vendor: e.vendor,
      "Payment Method": e.paymentMethod,
      Reference: e.referenceNumber,
      Notes: e.notes,
    }));
    exportToCSV("photostudio_expenses", rows);
  };

  const totalExpenseAmount = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  const filteredExpenses = expenses.filter((e) => {
    const q = search.toLowerCase();
    const matchesSearch =
      e.title.toLowerCase().includes(q) ||
      (e.vendor && e.vendor.toLowerCase().includes(q)) ||
      (e.referenceNumber && e.referenceNumber.toLowerCase().includes(q));

    if (!matchesSearch) return false;
    if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CreditCard className="h-7 w-7 text-red-500" />
            <span>Studio Expenses (Cash Out)</span>
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Log camera gear, lighting, studio rent, travel, salaries, and editing costs with receipts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
          <Button size="sm" onClick={handleOpenAdd} className="gap-1.5 text-xs">
            <Plus className="h-4 w-4" />
            <span>Log Expense</span>
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="border-l-4 border-l-red-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Total Operational Expenditures
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-extrabold text-red-400">
            {formatCurrency(totalExpenseAmount, currency, currencySymbol)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Deducted from recognized income to determine net business profit.
          </p>
        </CardContent>
      </Card>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search expenses by title, vendor, or invoice #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card shadow-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-card border rounded-lg p-1 self-stretch sm:self-auto overflow-x-auto">
          {["all", "equipment", "camera_accessories", "rent", "salary", "editing", "marketing"].map((cat) => (
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
                <th className="py-3 px-4">Expense Item</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Vendor / Payee</th>
                <th className="py-3 px-4">Receipt</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-muted-foreground animate-pulse">
                    Loading expenses...
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-muted-foreground">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-foreground flex items-center gap-2">
                        <ArrowUpRight className="h-4 w-4 text-red-400 shrink-0" />
                        <span>{exp.title}</span>
                      </div>
                      {exp.notes && (
                        <div className="text-xs text-muted-foreground pl-6 truncate max-w-sm">{exp.notes}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {exp.category?.replace(/_/g, " ")}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-muted-foreground">
                      {formatDate(exp.date)}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-muted-foreground">
                      {exp.vendor || "—"}
                    </td>

                    <td className="py-3.5 px-4 text-xs">
                      {exp.receiptUrl ? (
                        <button
                          onClick={() => setReceiptPreviewUrl(exp.receiptUrl!)}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                          <span>View</span>
                        </button>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold font-mono text-red-400">
                      -{formatCurrency(exp.amount, currency, currencySymbol)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => handleOpenEdit(exp, e)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(exp.id, e)}
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
          <DialogTitle>{editingExpense ? "Edit Expense Entry" : "Log Studio Expense"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Expense Title *</label>
              <Input
                required
                placeholder="e.g. Sony 50mm Lens Maintenance / Banani Studio Rent"
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
                onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
              >
                {[
                  "equipment",
                  "camera_accessories",
                  "lighting",
                  "travel",
                  "rent",
                  "salary",
                  "editing",
                  "marketing",
                  "utilities",
                  "software",
                  "maintenance",
                  "custom",
                ].map((cat) => (
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
                <option value="card">Credit / Debit Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="bkash">bKash</option>
                <option value="nagad">Nagad</option>
                <option value="cash">Cash in Hand</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Vendor / Store / Service Provider</label>
              <Input
                placeholder="e.g. Camera Zone BD, Meta Ads, Adobe Creative Cloud"
                value={formData.vendor}
                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Receipt / Voucher Image URL</label>
              <Input
                placeholder="https://..."
                value={formData.receiptUrl}
                onChange={(e) => setFormData({ ...formData, receiptUrl: e.target.value })}
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Reference / Invoice #</label>
              <Input
                placeholder="Vendor invoice or voucher reference number"
                value={formData.referenceNumber}
                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Notes</label>
              <Input
                placeholder="Additional details regarding equipment or business usage"
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
              {editingExpense ? "Save Changes" : "Log Expense"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Receipt Image Preview Dialog */}
      <Dialog open={!!receiptPreviewUrl} onOpenChange={() => setReceiptPreviewUrl(null)}>
        <DialogHeader>
          <DialogTitle>Receipt / Invoice Proof</DialogTitle>
        </DialogHeader>
        {receiptPreviewUrl && (
          <div className="rounded-lg overflow-hidden border">
            <img src={receiptPreviewUrl} alt="Receipt" className="w-full max-h-[70vh] object-contain" />
          </div>
        )}
      </Dialog>
    </div>
  );
}
