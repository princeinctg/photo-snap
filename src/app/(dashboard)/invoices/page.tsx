"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  Eye,
  Trash2,
  Copy,
  ExternalLink,
  CreditCard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useTheme } from "@/components/layout/ThemeProvider";
import type { Invoice, PaymentMethod } from "@/types";

export default function InvoicesPage() {
  const { currency, currencySymbol } = useTheme();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Record Payment Modal State
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bkash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/invoices");
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleOpenPayment = (inv: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedInvoice(inv);
    setPaymentAmount(inv.balanceDue);
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setReferenceNumber("");
    setPaymentNotes("");
    setPayModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    if (paymentAmount <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    try {
      const res = await fetch(`/api/invoices/${selectedInvoice.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: paymentAmount,
          paymentDate,
          paymentMethod,
          referenceNumber,
          notes: paymentNotes,
        }),
      });

      if (res.ok) {
        fetchInvoices();
        setPayModalOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this invoice?")) return;
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (res.ok) {
        setInvoices((prev) => prev.filter((i) => i.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Metrics
  const totalBilled = invoices.reduce((acc, i) => acc + (i.status !== "cancelled" ? i.totalAmount : 0), 0);
  const totalCollected = invoices.reduce((acc, i) => acc + (i.status !== "cancelled" ? i.paidAmount : 0), 0);
  const totalDue = invoices.reduce((acc, i) => acc + (i.status !== "cancelled" ? i.balanceDue : 0), 0);

  // Filter
  const filteredInvoices = invoices.filter((inv) => {
    const q = search.toLowerCase();
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.clientName.toLowerCase().includes(q) ||
      (inv.bookingTitle && inv.bookingTitle.toLowerCase().includes(q));

    if (!matchesSearch) return false;
    if (statusFilter !== "all" && inv.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Receipt className="h-7 w-7 text-primary" />
            <span>Invoices & Billing</span>
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Create professional invoices, record advance payments, and monitor outstanding receivables.
          </p>
        </div>

        <Link href="/invoices/new">
          <Button size="sm" className="gap-1.5 text-xs shadow-sm">
            <Plus className="h-4 w-4" />
            <span>Create Invoice</span>
          </Button>
        </Link>
      </div>

      {/* Invoice Summary Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Invoiced
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(totalBilled, currency, currencySymbol)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Across all active contracts</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Collected Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">
              {formatCurrency(totalCollected, currency, currencySymbol)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Recognized in income reports</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Remaining Balance Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">
              {formatCurrency(totalDue, currency, currencySymbol)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Awaiting client payment</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by invoice number (PSB-2024-001), client name, or shoot title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card shadow-sm"
          />
        </div>

        <div className="flex items-center gap-1 bg-card border rounded-lg p-1 self-stretch sm:self-auto overflow-x-auto">
          {["all", "unpaid", "partially_paid", "paid", "draft"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                statusFilter === st
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {st.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices List Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground border-b">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Shoot / Booking</th>
                <th className="py-3 px-4">Issue / Due Date</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-muted-foreground animate-pulse">
                    Loading invoices...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-muted-foreground">
                    No invoices found.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-primary">
                      <Link href={`/invoices/${inv.id}`} className="hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-foreground">
                      <Link href={`/clients/${inv.clientId}`} className="hover:text-primary transition-colors">
                        {inv.clientName}
                      </Link>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-muted-foreground truncate max-w-[160px]">
                      {inv.bookingTitle || "Direct Photography Service"}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-muted-foreground">
                      <div>{formatDate(inv.issueDate)}</div>
                      <div className="text-[10px] text-muted-foreground/80">Due: {formatDate(inv.dueDate)}</div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-foreground">
                      {formatCurrency(inv.totalAmount, currency, currencySymbol)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold font-mono">
                      <span className={inv.balanceDue > 0 ? "text-amber-400" : "text-emerald-400"}>
                        {formatCurrency(inv.balanceDue, currency, currencySymbol)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <Badge
                        variant={
                          inv.status === "paid"
                            ? "success"
                            : inv.status === "partially_paid"
                            ? "warning"
                            : inv.status === "unpaid"
                            ? "destructive"
                            : "outline"
                        }
                        className="text-[10px] uppercase font-semibold"
                      >
                        {inv.status?.replace(/_/g, " ")}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {inv.balanceDue > 0 && (
                          <Button
                            size="sm"
                            variant="subtle"
                            onClick={(e) => handleOpenPayment(inv, e)}
                            className="h-7 px-2 text-[11px] gap-1"
                          >
                            <CreditCard className="h-3 w-3" />
                            <span>Pay</span>
                          </Button>
                        )}

                        <Link href={`/invoices/${inv.id}`}>
                          <button
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                            title="View & Print Invoice"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </Link>

                        <button
                          onClick={(e) => handleDelete(inv.id, e)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Delete Invoice"
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

      {/* Record Payment Dialog */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogHeader>
          <DialogTitle>Record Payment for {selectedInvoice?.invoiceNumber}</DialogTitle>
        </DialogHeader>

        {selectedInvoice && (
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="p-3 rounded-lg bg-secondary/50 border text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Client:</span>
                <span className="font-semibold text-foreground">{selectedInvoice.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Invoice Amount:</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(selectedInvoice.totalAmount, currency, currencySymbol)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remaining Balance Due:</span>
                <span className="font-bold text-amber-400">
                  {formatCurrency(selectedInvoice.balanceDue, currency, currencySymbol)}
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Payment Amount ({currencySymbol}) *
                </label>
                <Input
                  type="number"
                  required
                  min="1"
                  max={selectedInvoice.balanceDue}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Payment Date *
                </label>
                <Input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Payment Method *
                </label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background/50 px-3 text-sm capitalize"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                >
                  <option value="bkash">bKash Merchant / Personal</option>
                  <option value="nagad">Nagad</option>
                  <option value="bank_transfer">Bank Transfer (Wire/EFT)</option>
                  <option value="cash">Cash in Hand</option>
                  <option value="card">Credit / Debit Card</option>
                  <option value="other">Other / Custom</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Reference / Trx ID
                </label>
                <Input
                  placeholder="e.g. BK-9B8127361 or Cheque #"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground">
                  Payment Notes
                </label>
                <Input
                  placeholder="e.g. Advance paid on shoot booking date"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPayModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Confirm & Record Income
              </Button>
            </DialogFooter>
          </form>
        )}
      </Dialog>
    </div>
  );
}
