"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Receipt,
  CreditCard,
  Plus,
  Clock,
  CheckCircle2,
  DollarSign,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useTheme } from "@/components/layout/ThemeProvider";
import type { Client, Booking, Invoice, Payment } from "@/types";

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currency, currencySymbol } = useTheme();

  const [client, setClient] = useState<Client | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClientData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setClient(data.client);
        setBookings(data.bookings || []);
        setInvoices(data.invoices || []);
        setPayments(data.payments || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchClientData();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground animate-pulse">
        Loading client profile and operational timeline...
      </div>
    );
  }

  if (!client) {
    return (
      <div className="space-y-4">
        <Link href="/clients">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Clients</span>
          </Button>
        </Link>
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Client record not found.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button and quick actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link href="/clients">
          <Button variant="ghost" size="sm" className="gap-2 text-xs">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Clients CRM</span>
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <Link href={`/bookings?action=new&clientId=${client.id}`}>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs shadow-sm">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span>Schedule Booking</span>
            </Button>
          </Link>
          <Link href={`/invoices/new?clientId=${client.id}`}>
            <Button size="sm" className="gap-1.5 text-xs shadow-sm">
              <Receipt className="h-3.5 w-3.5" />
              <span>Create Invoice</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Client Profile Header Banner */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary/20 via-background to-secondary/30 p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-2xl bg-primary/10 border-2 border-primary/30 text-primary font-bold text-2xl flex items-center justify-center overflow-hidden shrink-0 shadow-md">
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
              <div>
                <h1 className="text-2xl font-bold text-foreground">{client.name}</h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1.5">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    <span>{client.phone}</span>
                  </span>
                  {client.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-primary" />
                      <span>{client.email}</span>
                    </span>
                  )}
                  {client.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      <span>{client.address}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Financial Status Summary */}
            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
              <div className="p-3 rounded-xl bg-card border shadow-sm min-w-[120px]">
                <div className="text-[11px] text-muted-foreground">Total Billed</div>
                <div className="text-base font-bold text-foreground">
                  {formatCurrency(client.totalBilled, currency, currencySymbol)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-card border shadow-sm min-w-[120px]">
                <div className="text-[11px] text-muted-foreground">Total Paid</div>
                <div className="text-base font-bold text-emerald-400">
                  {formatCurrency(client.totalPaid, currency, currencySymbol)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-card border shadow-sm min-w-[120px]">
                <div className="text-[11px] text-muted-foreground">Due Balance</div>
                <div
                  className={`text-base font-bold font-mono ${
                    client.balance > 0 ? "text-amber-400" : "text-muted-foreground"
                  }`}
                >
                  {formatCurrency(client.balance, currency, currencySymbol)}
                </div>
              </div>
            </div>
          </div>

          {client.notes && (
            <div className="mt-4 p-3 rounded-lg bg-card/60 border text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Special Instructions: </span>
              {client.notes}
            </div>
          )}
        </div>
      </Card>

      {/* Bookings & Photoshoots History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span>Bookings & Shoots ({bookings.length})</span>
            </CardTitle>
            <CardDescription>Scheduled events and shoot deliverables</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No bookings recorded for this client yet.
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border bg-background/50 gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center justify-center h-12 w-12 rounded-lg bg-primary/10 border border-primary/20 text-primary shrink-0">
                      <span className="text-[10px] font-bold uppercase">{formatDate(b.shootDate, "MMM")}</span>
                      <span className="text-base font-extrabold leading-tight">{formatDate(b.shootDate, "dd")}</span>
                    </div>
                    <div>
                      <div className="font-bold text-sm text-foreground">{b.title}</div>
                      <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                        <span className="capitalize font-medium text-foreground">{b.eventType}</span>
                        <span>•</span>
                        <span>{b.venue}</span>
                        {b.assignedPhotographer && (
                          <>
                            <span>•</span>
                            <span>Photographer: {b.assignedPhotographer}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div className="text-right">
                      <div className="text-xs font-semibold text-foreground">
                        {formatCurrency(b.totalPrice, currency, currencySymbol)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Bal: {formatCurrency(b.remainingBalance, currency, currencySymbol)}
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize text-xs">
                      {b.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoices & Recorded Payments */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                <span>Invoices ({invoices.length})</span>
              </CardTitle>
              <CardDescription>Billed photography invoices</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No invoices generated yet.
              </div>
            ) : (
              <div className="space-y-3">
                {invoices.map((inv) => (
                  <Link
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border bg-background/50 hover:bg-secondary/40 transition-colors group block"
                  >
                    <div>
                      <div className="text-sm font-semibold font-mono text-primary group-hover:underline">
                        {inv.invoiceNumber}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Issue: {formatDate(inv.issueDate)} • Due: {formatDate(inv.dueDate)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-foreground">
                        {formatCurrency(inv.totalAmount, currency, currencySymbol)}
                      </div>
                      <Badge
                        variant={
                          inv.status === "paid"
                            ? "success"
                            : inv.status === "partially_paid"
                            ? "warning"
                            : "outline"
                        }
                        className="text-[10px] mt-1 uppercase"
                      >
                        {inv.status?.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payments History */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <span>Payment Receipts ({payments.length})</span>
              </CardTitle>
              <CardDescription>Verified payments received from client</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No payments recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-background/50"
                  >
                    <div>
                      <div className="text-sm font-semibold text-emerald-400">
                        +{formatCurrency(p.amount, currency, currencySymbol)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                        <span>{formatDate(p.paymentDate)}</span>
                        <span>•</span>
                        <span className="uppercase font-mono text-[11px]">
                          {p.paymentMethod?.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>
                    {p.referenceNumber && (
                      <span className="text-[11px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                        {p.referenceNumber}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
