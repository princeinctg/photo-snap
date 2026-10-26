"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Printer, Camera, CheckCircle2, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Invoice, StudioSettings } from "@/types";

export default function PublicInvoiceViewPage() {
  const params = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<StudioSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPublicInvoice() {
      try {
        const [invRes, setRes] = await Promise.all([
          fetch(`/api/invoices/${params.id}`).then((r) => r.json()),
          fetch("/api/settings").then((r) => r.json()),
        ]);
        if (invRes.invoice) setInvoice(invRes.invoice);
        if (setRes.settings) setSettings(setRes.settings);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchPublicInvoice();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground animate-pulse">
        Loading invoice document...
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md w-full">
          <p className="text-foreground font-semibold">Invoice not found or link has expired.</p>
        </Card>
      </div>
    );
  }

  const currency = settings?.currency || "BDT";
  const currencySymbol = settings?.currencySymbol || "৳";

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Banner with Print Control */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between no-print">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span className="text-xs text-muted-foreground">Official Photography Invoice</span>
        </div>
        <Button size="sm" onClick={() => window.print()} className="gap-1.5 text-xs shadow-sm">
          <Printer className="h-3.5 w-3.5" />
          <span>Print or Save PDF</span>
        </Button>
      </div>

      {/* Invoice Content Card */}
      <Card className="max-w-4xl mx-auto p-8 md:p-12 bg-card text-foreground print-container shadow-xl border">
        {/* Header */}
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

        {/* Billed To */}
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

        {/* Items */}
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

        {/* Totals */}
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
                <span className="font-bold text-foreground block mb-1">Terms:</span>
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

        {/* Footer */}
        <div className="mt-12 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="text-center sm:text-left">
            <p className="font-semibold text-foreground">{settings?.studioName}</p>
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
    </div>
  );
}
