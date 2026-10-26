"use client";

import React, { useState } from "react";
import {
  Search,
  Plus,
  Bell,
  Menu,
  X,
  Users,
  Receipt,
  Calendar,
  CreditCard,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "./ThemeProvider";
import { GlobalSearch } from "./GlobalSearch";
import { Button } from "@/components/ui/button";

export function Header({ onMobileMenuToggle }: { onMobileMenuToggle?: () => void }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const { studioName, currency, currencySymbol } = useTheme();

  return (
    <>
      <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b bg-background/80 px-4 md:px-6 backdrop-blur-md">
        {/* Left: Mobile Menu & Studio Branding */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMobileMenuToggle}
            className="flex md:hidden p-2 rounded-lg border text-muted-foreground hover:bg-secondary"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden sm:flex flex-col">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Operating System
            </span>
            <span className="text-sm font-semibold text-foreground">
              {studioName}
            </span>
          </div>
        </div>

        {/* Center: Search Trigger Button */}
        <div className="flex-1 max-w-md mx-4">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex w-full items-center justify-between rounded-lg border border-input bg-background/50 px-3 py-2 text-xs md:text-sm text-muted-foreground hover:border-primary/50 hover:bg-secondary/40 transition-colors shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span>Search studio records...</span>
            </div>
            <kbd className="hidden sm:inline-block rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Quick Action, Currency Badge & Actions */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Active Studio Currency Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-xs font-mono font-medium text-muted-foreground border">
            <span className="text-primary font-bold">{currencySymbol}</span>
            <span>{currency}</span>
          </div>

          {/* Quick Create Dropdown */}
          <div className="relative">
            <Button
              size="sm"
              onClick={() => setQuickMenuOpen(!quickMenuOpen)}
              className="gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Quick Action</span>
            </Button>

            {quickMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setQuickMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-52 rounded-xl border bg-card p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  <Link
                    href="/invoices/new"
                    onClick={() => setQuickMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg hover:bg-secondary transition-colors"
                  >
                    <Receipt className="h-4 w-4 text-primary" />
                    <span>Create Invoice</span>
                  </Link>
                  <Link
                    href="/bookings?action=new"
                    onClick={() => setQuickMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg hover:bg-secondary transition-colors"
                  >
                    <Calendar className="h-4 w-4 text-blue-400" />
                    <span>Schedule Shoot</span>
                  </Link>
                  <Link
                    href="/clients?action=new"
                    onClick={() => setQuickMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg hover:bg-secondary transition-colors"
                  >
                    <Users className="h-4 w-4 text-purple-400" />
                    <span>Add New Client</span>
                  </Link>
                  <Link
                    href="/finances/income?action=new"
                    onClick={() => setQuickMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg hover:bg-secondary transition-colors"
                  >
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    <span>Record Direct Income</span>
                  </Link>
                  <Link
                    href="/finances/expenses?action=new"
                    onClick={() => setQuickMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg hover:bg-secondary transition-colors"
                  >
                    <CreditCard className="h-4 w-4 text-amber-400" />
                    <span>Log Studio Expense</span>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
