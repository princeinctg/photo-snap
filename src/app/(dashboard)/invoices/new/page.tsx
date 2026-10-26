"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Receipt,
  DollarSign,
  Calendar,
  User,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate, roundToTwoDecimals } from "@/lib/utils";
import { useTheme } from "@/components/layout/ThemeProvider";
import type { Client, Booking, PhotographyPackage, InvoiceLineItem } from "@/types";

function NewInvoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currency, currencySymbol } = useTheme();

  const [clients, setClients] = useState<Client[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [packages, setPackages] = useState<PhotographyPackage[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Fields
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [clientId, setClientId] = useState(searchParams.get("clientId") || "");
  const [bookingId, setBookingId] = useState(searchParams.get("bookingId") || "");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("Thank you for choosing PhotoSnap Studio.");
  const [terms, setTerms] = useState(
    "1. 50% advance to confirm booking.\n2. Balance due upon delivery of high-res master gallery."
  );

  // Dynamic Line Items
  const [items, setItems] = useState<InvoiceLineItem[]>([
    {
      id: "item_1",
      description: searchParams.get("title") || "Wedding & Cinematography Full Day Coverage",
      quantity: 1,
      unitPrice: Number(searchParams.get("price")) || 45000,
      amount: Number(searchParams.get("price")) || 45000,
    },
  ]);

  const [discount, setDiscount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [initialPaidAmount, setInitialPaidAmount] = useState<number>(0);

  useEffect(() => {
    async function loadData() {
      try {
        const [cRes, bRes, pRes, sRes] = await Promise.all([
          fetch("/api/clients").then((r) => r.json()),
          fetch("/api/bookings").then((r) => r.json()),
          fetch("/api/packages").then((r) => r.json()),
          fetch("/api/settings").then((r) => r.json()),
        ]);

        setClients(cRes.clients || []);
        setBookings(bRes.bookings || []);
        setPackages(pRes.packages || []);

        if (sRes.settings) {
          const prefix = sRes.settings.invoicePrefix || "PSB-";
          const year = new Date().getFullYear();
          const rand = Math.floor(100 + Math.random() * 900);
          setInvoiceNumber(`${prefix}${year}-${rand}`);
          if (sRes.settings.taxRate) setTaxRate(sRes.settings.taxRate);
          if (sRes.settings.invoiceTerms) setTerms(sRes.settings.invoiceTerms);
          if (sRes.settings.invoiceFooterNote) setNotes(sRes.settings.invoiceFooterNote);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Update item field
  const handleItemChange = (
    index: number,
    field: keyof InvoiceLineItem,
    value: any
  ) => {
    const updated = [...items];
    const target = { ...updated[index], [field]: value };
    target.amount = roundToTwoDecimals((Number(target.quantity) || 1) * (Number(target.unitPrice) || 0));
    updated[index] = target;
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: `item_${Date.now()}`,
        description: "",
        quantity: 1,
        unitPrice: 0,
        amount: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Populate from package template
  const handleApplyPackage = (pkgId: string) => {
    const pkg = packages.find((p) => p.id === pkgId);
    if (!pkg) return;
    setItems([
      ...items,
      {
        id: `item_${Date.now()}`,
        description: `${pkg.name} (${pkg.photographyHours} hrs coverage, ${pkg.editedPhotosCount} retouched photos)`,
        quantity: 1,
        unitPrice: pkg.price,
        amount: pkg.price,
      },
    ]);
  };

  // Calculations
  const subtotal = roundToTwoDecimals(items.reduce((acc, it) => acc + (it.amount || 0), 0));
  const cleanDiscount = Math.min(subtotal, roundToTwoDecimals(discount || 0));
  const taxableAmount = Math.max(0, subtotal - cleanDiscount);
  const taxAmount = roundToTwoDecimals((taxableAmount * (taxRate || 0)) / 100);
  const totalAmount = roundToTwoDecimals(taxableAmount + taxAmount);
  const balanceDue = roundToTwoDecimals(Math.max(0, totalAmount - (initialPaidAmount || 0)));

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      alert("Please select a client.");
      return;
    }
    if (items.length === 0 || !items[0].description) {
      alert("Please include at least one valid line item with description.");
      return;
    }

    try {
      const selectedClient = clients.find((c) => c.id === clientId);
      const selectedBooking = bookings.find((b) => b.id === bookingId);

      const payload = {
        invoiceNumber,
        clientId,
        clientName: selectedClient?.name || "Client",
        clientEmail: selectedClient?.email || "",
        clientPhone: selectedClient?.phone || "",
        clientAddress: selectedClient?.address || "",
        bookingId: bookingId || "",
        bookingTitle: selectedBooking?.title || "",
        issueDate,
        dueDate,
        items,
        subtotal,
        discount: cleanDiscount,
        taxRate,
        taxAmount,
        totalAmount,
        paidAmount: initialPaidAmount,
        balanceDue,
        status: initialPaidAmount >= totalAmount ? "paid" : initialPaidAmount > 0 ? "partially_paid" : "unpaid",
        notes,
        terms,
      };

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/invoices/${data.invoice.id}`);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create invoice.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <Link href="/invoices">
          <Button variant="ghost" size="sm" className="gap-2 text-xs">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Invoices</span>
          </Button>
        </Link>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>Decimal-safe monetary calculations</span>
        </div>
      </div>

      <form onSubmit={handleSaveInvoice} className="space-y-6">
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Receipt className="h-6 w-6 text-primary" />
                <span>New Studio Invoice</span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Generate itemized bill for photography packages, prints, and cinematography.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Invoice #:</span>
              <Input
                required
                className="w-40 font-mono font-bold text-primary"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Client & Booking Association */}
          <div className="grid gap-4 sm:grid-cols-2 pt-6">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Select Client *</label>
              <select
                required
                className="w-full h-9 rounded-md border border-input bg-background/50 px-3 text-sm"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                <option value="">Choose a client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Associated Booking (Optional)</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background/50 px-3 text-sm"
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
              >
                <option value="">No specific booking</option>
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} ({formatDate(b.shootDate)})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Issue Date *</label>
              <Input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Payment Due Date *</label>
              <Input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Line Items Editor */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-foreground">Services & Line Items</h2>
              <p className="text-xs text-muted-foreground">Add photography coverage, edited photos, or album options.</p>
            </div>

            {/* Quick add package shortcut */}
            {packages.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground hidden sm:inline">Add Package:</span>
                <select
                  className="h-8 rounded-md border border-input bg-background/50 px-2 text-xs"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleApplyPackage(e.target.value);
                      e.target.value = "";
                    }
                  }}
                >
                  <option value="">Select package to insert...</option>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (+{formatCurrency(p.price, currency, currencySymbol)})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="grid grid-cols-12 gap-2 items-center p-3 rounded-lg border bg-background/50"
              >
                <div className="col-span-12 sm:col-span-6 space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground sm:hidden">Description</label>
                  <Input
                    required
                    placeholder="Description of service or photography package"
                    value={item.description}
                    onChange={(e) => handleItemChange(index, "description", e.target.value)}
                  />
                </div>

                <div className="col-span-4 sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground sm:hidden">Qty</label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, "quantity", Number(e.target.value))}
                  />
                </div>

                <div className="col-span-4 sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground sm:hidden">Price ({currencySymbol})</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Price"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(index, "unitPrice", Number(e.target.value))}
                  />
                </div>

                <div className="col-span-3 sm:col-span-1 text-right font-mono text-xs font-bold text-foreground">
                  {formatCurrency(item.amount, currency, currencySymbol)}
                </div>

                <div className="col-span-1 sm:col-span-1 text-right">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    disabled={items.length <= 1}
                    className="p-1 rounded text-muted-foreground hover:text-destructive disabled:opacity-30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            className="mt-3 gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Another Line Item</span>
          </Button>

          {/* Subtotal, Discounts, Tax Calculation Box */}
          <div className="mt-8 border-t pt-6 flex flex-col sm:flex-row justify-between gap-6">
            <div className="space-y-4 flex-1 max-w-md">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Invoice Notes / Greeting</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Payment Terms & Delivery Timeline</label>
                <Textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <div className="w-full sm:w-80 space-y-3 p-4 rounded-xl bg-card border shadow-sm">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(subtotal, currency, currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs gap-2">
                <span className="text-muted-foreground">Discount ({currencySymbol}):</span>
                <Input
                  type="number"
                  min="0"
                  className="w-24 h-7 text-right text-xs"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
              </div>

              <div className="flex items-center justify-between text-xs gap-2">
                <span className="text-muted-foreground">Tax / VAT (%):</span>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  className="w-24 h-7 text-right text-xs"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                />
              </div>

              {taxAmount > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Tax Amount:</span>
                  <span className="font-semibold text-foreground">
                    +{formatCurrency(taxAmount, currency, currencySymbol)}
                  </span>
                </div>
              )}

              <div className="border-t pt-2 flex justify-between text-sm font-bold">
                <span className="text-foreground">Total Grand Amount:</span>
                <span className="text-primary font-mono text-base">
                  {formatCurrency(totalAmount, currency, currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs gap-2 pt-1 border-t">
                <span className="text-muted-foreground">Advance Received:</span>
                <Input
                  type="number"
                  min="0"
                  max={totalAmount}
                  className="w-28 h-7 text-right text-xs text-emerald-400 font-bold"
                  value={initialPaidAmount}
                  onChange={(e) => setInitialPaidAmount(Number(e.target.value))}
                />
              </div>

              <div className="flex justify-between text-xs font-bold pt-1">
                <span className="text-muted-foreground">Remaining Balance Due:</span>
                <span className="text-amber-400 font-mono">
                  {formatCurrency(balanceDue, currency, currencySymbol)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/invoices">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" size="lg" className="px-8 shadow-md">
            Generate & Save Invoice
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading invoice editor...</div>}>
      <NewInvoiceContent />
    </Suspense>
  );
}
