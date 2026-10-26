"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  Download,
  Share2,
  CreditCard,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Camera,
  Calendar,
  User,
  Building,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useTheme } from "@/components/layout/ThemeProvider";
import type { Invoice, Payment, StudioSettings, PaymentMethod } from "@/types";

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currency, currencySymbol } = useTheme();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<StudioSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Payment modal state
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bkash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const printRef = useRef<HTMLDivElement>(null);

  const fetchInvoiceData = async () => {
    setLoading(true);
    try {
      const [invRes, setRes] = await Promise.all([
        fetch(`/api/invoices/${params.id}`).then((r) => r.json()),
        fetch("/api/settings").then((r) => r.json()),
      ]);

      if (invRes.invoice) {
        setInvoice(invRes.invoice);
        setPayments(invRes.payments || []);
        setPaymentAmount(invRes.invoice.balanceDue);
      }
      if (setRes.settings) {
        setSettings(setRes.settings);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchInvoiceData();
    }
  }, [params.id]);

  const handlePrint = () => {
    window.print();
  };

  const handleShareLink = () => {
    if (!invoice) return;
    const shareUrl = `${window.location.origin}/invoice/${invoice.shareToken}/view`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    if (paymentAmount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    try {
      const res = await fetch(`/api/invoices/${invoice.id}/payments`, {
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
        fetchInvoiceData();
        setPayModalOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDuplicate = async () => {
    if (!invoice) return;
    try {
      const duplicatePayload = {
        clientId: invoice.clientId,
        clientName: invoice.clientName,
        bookingId: invoice.bookingId,
        bookingTitle: invoice.bookingTitle,
        items: invoice.items,
        subtotal: invoice.subtotal,
        discount: invoice.discount,
        taxRate: invoice.taxRate,
        taxAmount: invoice.taxAmount,
        totalAmount: invoice.totalAmount,
        notes: invoice.notes,
        terms: invoice.terms,
      };

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(duplicatePayload),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/invoices/${data.invoice.id}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground animate-pulse">
        Loading invoice document...
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-4">
        <Link href="/invoices">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Invoices
          </Button>
        </Link>
        <Card className="p-8 text-center text-muted-foreground">Invoice not found.</Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Action Toolbar (Hidden in Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <Link href="/invoices">
          <Button variant="ghost" size="sm" className="gap-2 text-xs">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Invoices</span>
          </Button>
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          {invoice.balanceDue > 0 && (
            <Button
              size="sm"
              onClick={() => setPayModalOpen(true)}
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>Record Payment</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleShareLink}
            className="gap-1.5 text-xs shadow-sm"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5" />}
            <span>{copied ? "Link Copied!" : "Share Link"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDuplicate}
            className="gap-1.5 text-xs shadow-sm"
          >
            <span>Duplicate</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 text-xs shadow-sm"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print / PDF</span>
          </Button>
        </div>
      </div>

      {/* Printable Invoice Card */}
      <Card
        ref={printRef}
        className="p-8 md:p-12 bg-card text-foreground print-container shadow-lg border"
      >
        {/* Studio Branding & Invoice Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b pb-8">
          <div>
            <div className="flex items-center gap-3">
              {settings?.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.studioName}
                  className="h-12 w-auto object-contain rounded"
                />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                  <Camera className="h-5 w-5" />
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  {settings?.studioName || "PhotoSnap Studio"}
                </h2>
                <p className="text-xs text-muted-foreground">{settings?.tagline}</p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground mt-4 space-y-0.5">
              <p>{settings?.address}</p>
              <p>{settings?.email} • {settings?.phone}</p>
              {settings?.website && <p className="text-primary font-mono">{settings?.website}</p>}
            </div>
          </div>

          <div className="text-left sm:text-right">
            <h1 className="text-3xl font-black text-primary tracking-tight">INVOICE</h1>
            <div className="text-sm font-mono font-bold text-foreground mt-1">
              {invoice.invoiceNumber}
            </div>
            <div className="mt-3">
              <Badge
                variant={
                  invoice.status === "paid"
                    ? "success"
                    : invoice.status === "partially_paid"
                    ? "warning"
                    : "destructive"
                }
                className="text-xs uppercase font-bold tracking-wider px-3 py-1"
              >
                {invoice.status?.replace(/_/g, " ")}
              </Badge>
            </div>
          </div>
        </div>

        {/* Bill To & Dates Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b text-xs">
          <div>
            <span className="font-bold text-muted-foreground uppercase tracking-wider block mb-1">
              Billed To
            </span>
            <div className="text-sm font-bold text-foreground">{invoice.clientName}</div>
            {invoice.clientAddress && <div className="text-muted-foreground mt-0.5">{invoice.clientAddress}</div>}
            {invoice.clientPhone && <div className="text-muted-foreground">{invoice.clientPhone}</div>}
            {invoice.clientEmail && <div className="text-muted-foreground">{invoice.clientEmail}</div>}
          </div>

          <div className="sm:text-right space-y-1">
            <div>
              <span className="text-muted-foreground font-medium">Issue Date: </span>
              <span className="font-semibold text-foreground">{formatDate(invoice.issueDate)}</span>
            </div>
            <div>
              <span className="text-muted-foreground font-medium">Due Date: </span>
              <span className="font-semibold text-foreground">{formatDate(invoice.dueDate)}</span>
            </div>
            {invoice.bookingTitle && (
              <div>
                <span className="text-muted-foreground font-medium">Event: </span>
                <span className="font-semibold text-primary">{invoice.bookingTitle}</span>
              </div>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="py-6">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b uppercase font-bold text-muted-foreground tracking-wider pb-2">
                <th className="py-2.5">Description</th>
                <th className="py-2.5 text-center">Qty</th>
                <th className="py-2.5 text-right">Unit Price</th>
                <th className="py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {invoice.items.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td className="py-3.5 pr-4 font-medium text-foreground">{item.description}</td>
                  <td className="py-3.5 text-center text-muted-foreground">{item.quantity}</td>
                  <td className="py-3.5 text-right font-mono text-muted-foreground">
                    {formatCurrency(item.unitPrice, currency, currencySymbol)}
                  </td>
                  <td className="py-3.5 text-right font-mono font-bold text-foreground">
                    {formatCurrency(item.amount, currency, currencySymbol)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Calculation Totals */}
        <div className="border-t pt-6 flex flex-col sm:flex-row justify-between gap-6">
          <div className="space-y-4 max-w-sm text-xs">
            {invoice.notes && (
              <div>
                <span className="font-bold text-foreground block mb-1">Notes:</span>
                <p className="text-muted-foreground leading-relaxed">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms && (
              <div>
                <span className="font-bold text-foreground block mb-1">Terms & Conditions:</span>
                <p className="text-muted-foreground whitespace-pre-line leading-relaxed">{invoice.terms}</p>
              </div>
            )}
          </div>

          <div className="w-full sm:w-72 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-mono font-medium text-foreground">
                {formatCurrency(invoice.subtotal, currency, currencySymbol)}
              </span>
            </div>

            {invoice.discount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Discount:</span>
                <span className="font-mono font-medium">
                  -{formatCurrency(invoice.discount, currency, currencySymbol)}
                </span>
              </div>
            )}

            {invoice.taxAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax / VAT ({invoice.taxRate}%):</span>
                <span className="font-mono font-medium text-foreground">
                  +{formatCurrency(invoice.taxAmount, currency, currencySymbol)}
                </span>
              </div>
            )}

            <div className="flex justify-between font-bold text-sm border-t pt-2 text-foreground">
              <span>Total Amount:</span>
              <span className="font-mono text-primary">
                {formatCurrency(invoice.totalAmount, currency, currencySymbol)}
              </span>
            </div>

            <div className="flex justify-between text-xs pt-1 border-t text-muted-foreground">
              <span>Amount Paid:</span>
              <span className="font-mono font-bold text-emerald-400">
                {formatCurrency(invoice.paidAmount, currency, currencySymbol)}
              </span>
            </div>

            <div className="flex justify-between text-sm font-black pt-1 bg-secondary/50 p-2.5 rounded-lg">
              <span className="text-foreground">Balance Due:</span>
              <span
                className={`font-mono ${
                  invoice.balanceDue > 0 ? "text-amber-400" : "text-emerald-400"
                }`}
              >
                {formatCurrency(invoice.balanceDue, currency, currencySymbol)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Signature */}
        <div className="mt-12 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="text-center sm:text-left">
            <p className="font-semibold text-foreground">PhotoSnap Studio & Cinematography</p>
            <p className="text-[11px]">All visual rights reserved. Deliverables upon full clearance.</p>
          </div>
          <div className="text-center sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 w-44">
            <div className="h-10 flex items-center justify-center font-display italic text-muted-foreground">
              {settings?.signatureUrl ? (
                <img src={settings.signatureUrl} alt="Signature" className="h-8 max-w-full" />
              ) : (
                "Authorized Signature"
              )}
            </div>
            <div className="border-t border-border mt-1 pt-1 text-[10px] uppercase font-mono">
              Authorized Signature
            </div>
          </div>
        </div>
      </Card>

      {/* Payment Receipts History (Hidden in print) */}
      <Card className="no-print">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <span>Payments History for this Invoice ({payments.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No payments recorded against this invoice yet.
            </div>
          ) : (
            <div className="space-y-2">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-background/50 text-xs"
                >
                  <div>
                    <div className="font-bold text-emerald-400">
                      +{formatCurrency(p.amount, currency, currencySymbol)}
                    </div>
                    <div className="text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span>{formatDate(p.paymentDate)}</span>
                      <span>•</span>
                      <span className="uppercase font-mono text-[10px]">
                        {p.paymentMethod?.replace(/_/g, " ")}
                      </span>
                      {p.referenceNumber && (
                        <span>• Ref: {p.referenceNumber}</span>
                      )}
                    </div>
                  </div>
                  <Badge variant="success" className="text-[10px]">
                    Verified
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Record Payment Dialog */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogHeader>
          <DialogTitle>Record Payment for {invoice.invoiceNumber}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="p-3 rounded-lg bg-secondary/50 border text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Client:</span>
              <span className="font-semibold text-foreground">{invoice.clientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Balance Due:</span>
              <span className="font-bold text-amber-400">
                {formatCurrency(invoice.balanceDue, currency, currencySymbol)}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Payment Amount ({currencySymbol}) *</label>
              <Input
                type="number"
                required
                min="1"
                max={invoice.balanceDue}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Payment Date *</label>
              <Input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Payment Method *</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background/50 px-3 text-sm capitalize"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              >
                <option value="bkash">bKash</option>
                <option value="nagad">Nagad</option>
                <option value="bank_transfer">Bank Wire / EFT</option>
                <option value="cash">Cash in Hand</option>
                <option value="card">Card Payment</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Reference / Trx ID</label>
              <Input
                placeholder="e.g. BK-9B8127361"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Notes</label>
              <Input
                placeholder="Payment memo or reference"
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
              Record Payment & Recognize Income
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
