"use client";

import React, { useState, useEffect } from "react";
import { Search, Users, Calendar, Receipt, CreditCard, ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useTheme } from "./ThemeProvider";

interface SearchResults {
  clients: any[];
  bookings: any[];
  invoices: any[];
  expenses: any[];
}

export function GlobalSearch({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults>({
    clients: [],
    bookings: [],
    invoices: [],
    expenses: [],
  });
  const { currency, currencySymbol } = useTheme();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ clients: [], bookings: [], invoices: [], expenses: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [cRes, bRes, iRes, eRes] = await Promise.all([
          fetch(`/api/clients?q=${encodeURIComponent(query)}`).then((r) => r.json()),
          fetch(`/api/bookings`).then((r) => r.json()),
          fetch(`/api/invoices?q=${encodeURIComponent(query)}`).then((r) => r.json()),
          fetch(`/api/finances/expenses`).then((r) => r.json()),
        ]);

        const q = query.toLowerCase();
        const matchedBookings = (bRes.bookings || []).filter(
          (b: any) =>
            b.title.toLowerCase().includes(q) ||
            (b.clientName && b.clientName.toLowerCase().includes(q)) ||
            (b.venue && b.venue.toLowerCase().includes(q))
        );

        const matchedExpenses = (eRes.expenses || []).filter(
          (e: any) =>
            e.title.toLowerCase().includes(q) ||
            (e.vendor && e.vendor.toLowerCase().includes(q))
        );

        setResults({
          clients: cRes.clients || [],
          bookings: matchedBookings.slice(0, 5),
          invoices: iRes.invoices || [],
          expenses: matchedExpenses.slice(0, 5),
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!open) return null;

  const hasAnyResults =
    results.clients.length > 0 ||
    results.bookings.length > 0 ||
    results.invoices.length > 0 ||
    results.expenses.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />
      <div className="relative z-50 w-full max-w-2xl overflow-hidden rounded-xl border bg-card shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 border-b">
          <Search className="h-5 w-5 text-muted-foreground mr-3" />
          <input
            autoFocus
            type="text"
            placeholder="Search clients, invoices, bookings, or expenses..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-14 w-full bg-transparent text-sm md:text-base outline-none placeholder:text-muted-foreground text-foreground"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {loading && (
            <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">
              Searching across studio database...
            </div>
          )}

          {!loading && !query && (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Type anything to search clients, bookings, invoices, or transactions...
            </div>
          )}

          {!loading && query && !hasAnyResults && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No matching records found for "{query}".
            </div>
          )}

          {/* Clients Results */}
          {results.clients.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Clients ({results.clients.length})
              </div>
              <div className="space-y-1">
                {results.clients.map((c) => (
                  <Link
                    key={c.id}
                    href={`/clients/${c.id}`}
                    onClick={onClose}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-secondary/70 transition-colors group"
                  >
                    <div>
                      <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        {c.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {c.phone} • {c.email || "No email"}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Invoices Results */}
          {results.invoices.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5" />
                Invoices ({results.invoices.length})
              </div>
              <div className="space-y-1">
                {results.invoices.map((inv) => (
                  <Link
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    onClick={onClose}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-secondary/70 transition-colors group"
                  >
                    <div>
                      <div className="text-sm font-medium text-foreground flex items-center gap-2">
                        <span className="font-mono text-primary">{inv.invoiceNumber}</span>
                        <span>{inv.clientName}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Total: {formatCurrency(inv.totalAmount, currency, currencySymbol)} • Status: {inv.status}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Bookings Results */}
          {results.bookings.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Bookings ({results.bookings.length})
              </div>
              <div className="space-y-1">
                {results.bookings.map((b) => (
                  <Link
                    key={b.id}
                    href={`/bookings`}
                    onClick={onClose}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-secondary/70 transition-colors group"
                  >
                    <div>
                      <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        {b.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(b.shootDate)} • {b.venue}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Expenses Results */}
          {results.expenses.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5" />
                Expenses ({results.expenses.length})
              </div>
              <div className="space-y-1">
                {results.expenses.map((e) => (
                  <Link
                    key={e.id}
                    href={`/finances/expenses`}
                    onClick={onClose}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-secondary/70 transition-colors group"
                  >
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {e.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(e.amount, currency, currencySymbol)} • {e.vendor || "No vendor"}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
