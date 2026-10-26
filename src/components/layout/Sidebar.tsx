"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Receipt,
  TrendingUp,
  CreditCard,
  Package,
  Image as ImageIcon,
  Settings,
  ChevronLeft,
  ChevronRight,
  Camera,
  LogOut,
  FileSpreadsheet,
  Moon,
  Sun,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "./ThemeProvider";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { mode, setMode, studioName, studioLogo } = useTheme();

  const navItems: NavItem[] = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Clients CRM", href: "/clients", icon: Users },
    { name: "Bookings & Calendar", href: "/bookings", icon: Calendar },
    { name: "Invoices", href: "/invoices", icon: Receipt },
    { name: "Income (Cash In)", href: "/finances/income", icon: TrendingUp },
    { name: "Expenses (Cash Out)", href: "/finances/expenses", icon: CreditCard },
    { name: "Financial Reports", href: "/finances/reports", icon: FileSpreadsheet },
    { name: "Packages & Services", href: "/packages", icon: Package },
    { name: "Galleries & Delivery", href: "/galleries", icon: ImageIcon },
    { name: "Studio Settings", href: "/settings", icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  };

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r bg-card/60 backdrop-blur-xl transition-all duration-300 z-30 select-none",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Studio Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b">
        <Link href="/" className="flex items-center gap-3 overflow-hidden">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary overflow-hidden">
            {studioLogo ? (
              <img
                src={studioLogo}
                alt="Studio Logo"
                className="h-full w-full object-cover"
              />
            ) : (
              <Camera className="h-5 w-5" />
            )}
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="font-bold text-sm tracking-tight text-foreground truncate">
                {studioName || "PhotoSnap Studio"}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block"></span>
                Ultimate Free OS
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent/40 hover:text-foreground transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
              )}
              title={collapsed ? item.name : undefined}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105",
                  isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {!collapsed && (
                <span className="truncate flex-1">{item.name}</span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Free Forever Badge */}
      {!collapsed && (
        <div className="mx-3 mb-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-primary mb-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>100% Free Forever</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Zero subscription fees, no locked features, self-hosted freedom.
          </p>
        </div>
      )}

      {/* Bottom User & Controls */}
      <div className="border-t p-3 space-y-2">
        <div className="flex items-center justify-between gap-1">
          <button
            onClick={() => setMode(mode === "dark" ? "light" : "dark")}
            className={cn(
              "flex items-center gap-2 rounded-md p-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors",
              collapsed ? "w-full justify-center" : "flex-1"
            )}
            title="Toggle Light / Dark mode"
          >
            {mode === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-blue-400" />}
            {!collapsed && <span>{mode === "dark" ? "Light Mode" : "Dark Mode"}</span>}
          </button>
          {!collapsed && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-md p-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
