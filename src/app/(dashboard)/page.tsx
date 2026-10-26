"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  CreditCard,
  DollarSign,
  Receipt,
  Calendar,
  Users,
  Camera,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useTheme } from "@/components/layout/ThemeProvider";
import {
  IncomeExpenseBarChart,
  NetProfitLineChart,
  ExpensePieChart,
  CashFlowChart,
} from "@/components/dashboard/FinancialCharts";

export default function DashboardPage() {
  const { currency, currencySymbol, studioName } = useTheme();
  const [range, setRange] = useState("this_year");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/finances/summary?range=${range}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [range]);

  const summary = data?.summary || {
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    outstandingReceivables: 0,
    totalBookings: 0,
    upcomingShootsCount: 0,
    completedProjects: 0,
    totalClients: 0,
    totalBilledAllTime: 0,
    totalCollectedAllTime: 0,
    collectionRate: 100,
  };

  const isProfitable = summary.netProfit >= 0;

  return (
    <div className="space-y-6">
      {/* Top Welcome & Date Filter Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Studio Dashboard
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Real-time financial performance and photoshoot operations for {studioName}.
          </p>
        </div>

        {/* Date Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-card border shadow-sm self-start sm:self-auto overflow-x-auto">
          {[
            { id: "today", label: "Today" },
            { id: "this_week", label: "This Week" },
            { id: "this_month", label: "This Month" },
            { id: "this_year", label: "This Year" },
            { id: "all", label: "All Time" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setRange(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                range === item.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={fetchDashboardData}
            title="Refresh Data"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Financial KPI Grid (4 primary cards) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Recognized Income */}
        <Card className="border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Revenue (Cash In)
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {formatCurrency(summary.totalRevenue, currency, currencySymbol)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-emerald-500 font-medium">Recognized Income</span>
              <span>from confirmed payments</span>
            </p>
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Expenses (Cash Out)
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center">
              <CreditCard className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {formatCurrency(summary.totalExpenses, currency, currencySymbol)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-red-400 font-medium">Studio Gear & Ops</span>
              <span>recorded expenditures</span>
            </p>
          </CardContent>
        </Card>

        {/* Net Profit */}
        <Card
          className={`border-l-4 ${
            isProfitable ? "border-l-primary" : "border-l-red-500"
          } hover:shadow-md transition-shadow`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Net Profit
            </CardTitle>
            <div
              className={`h-8 w-8 rounded-lg ${
                isProfitable ? "bg-primary/10 text-primary" : "bg-red-500/10 text-red-500"
              } flex items-center justify-center`}
            >
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold tracking-tight ${
                isProfitable ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {formatCurrency(summary.netProfit, currency, currencySymbol)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Revenue minus expenses (Cash-Basis)
            </p>
          </CardContent>
        </Card>

        {/* Outstanding Receivables */}
        <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Receivables (Unpaid)
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Receipt className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-amber-400">
              {formatCurrency(summary.outstandingReceivables, currency, currencySymbol)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
              <span>Collection Rate</span>
              <span className="font-semibold text-foreground">{summary.collectionRate}%</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Operational Stats Grid (Secondary 4 metrics) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="p-4 rounded-xl border bg-card/60 backdrop-blur flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">{summary.upcomingShootsCount}</div>
            <div className="text-xs text-muted-foreground">Upcoming Shoots</div>
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card/60 backdrop-blur flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">{summary.completedProjects}</div>
            <div className="text-xs text-muted-foreground">Completed Projects</div>
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card/60 backdrop-blur flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">{summary.totalClients}</div>
            <div className="text-xs text-muted-foreground">Total Clients</div>
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card/60 backdrop-blur flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center shrink-0">
            <Camera className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">{summary.totalBookings}</div>
            <div className="text-xs text-muted-foreground">Total Bookings</div>
          </div>
        </div>
      </div>

      {/* Financial Charts Section */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Monthly Income vs Expense Bar Chart */}
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Income vs. Expense Trend</CardTitle>
              <CardDescription>Monthly recognized cash inflows versus operational expenditures</CardDescription>
            </div>
            <Link href="/finances/reports">
              <Button variant="ghost" size="sm" className="gap-1 text-xs text-primary">
                <span>Detailed Reports</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <IncomeExpenseBarChart data={data?.monthlyTrends || []} />
          </CardContent>
        </Card>

        {/* Expense Category Pie/Donut Chart */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Expense Distribution</CardTitle>
              <CardDescription>Breakdown by gear, studio rent, travel, editing</CardDescription>
            </div>
            <Link href="/finances/expenses">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                <span>View All</span>
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <ExpensePieChart data={data?.categoryExpenses || []} />
          </CardContent>
        </Card>
      </div>

      {/* Second Charts Row: Net Profit Trend & Monthly Cash Flow */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Net Profit Trajectory</CardTitle>
            <CardDescription>Visualizing month-by-month studio net earnings</CardDescription>
          </CardHeader>
          <CardContent>
            <NetProfitLineChart data={data?.monthlyTrends || []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cash Flow Velocity</CardTitle>
            <CardDescription>Tracking net liquidity after operational expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <CashFlowChart data={data?.cashFlow || []} />
          </CardContent>
        </Card>
      </div>

      {/* Lower Dashboard: Upcoming Photoshoots & Recent Transactions */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Upcoming Shoots Table / Cards */}
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span>Upcoming Photoshoots</span>
              </CardTitle>
              <CardDescription>Scheduled studio & outdoor event sessions</CardDescription>
            </div>
            <Link href="/bookings">
              <Button variant="outline" size="sm" className="text-xs">
                Calendar View
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {(!data?.upcomingAppointments || data.upcomingAppointments.length === 0) ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No upcoming shoots scheduled.
              </div>
            ) : (
              <div className="space-y-3">
                {data.upcomingAppointments.map((b: any) => (
                  <div
                    key={b.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border bg-background/50 hover:bg-secondary/40 transition-colors gap-2"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center justify-center h-12 w-12 rounded-lg bg-primary/10 border border-primary/20 text-primary shrink-0">
                        <span className="text-[10px] font-bold uppercase">
                          {formatDate(b.shootDate, "MMM")}
                        </span>
                        <span className="text-base font-extrabold leading-tight">
                          {formatDate(b.shootDate, "dd")}
                        </span>
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-foreground">{b.title}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <span>{b.clientName}</span>
                          <span>•</span>
                          <span className="truncate max-w-[200px]">{b.venue}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Badge variant="outline" className="text-[11px] capitalize">
                        {b.eventType}
                      </Badge>
                      <Badge variant="success" className="text-[11px]">
                        {b.startTime}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions List */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Live stream of income & payments</CardDescription>
            </div>
            <Link href="/invoices">
              <Button variant="ghost" size="sm" className="text-xs">
                Invoices
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {(!data?.recentTransactions || data.recentTransactions.length === 0) ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No recent transactions recorded.
              </div>
            ) : (
              <div className="space-y-3">
                {data.recentTransactions.map((tx: any) => {
                  const isInc = tx.type === "income";
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border bg-background/40 hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                            isInc
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {isInc ? (
                            <ArrowDownRight className="h-4 w-4" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4" />
                          )}
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-medium text-foreground truncate">
                            {tx.title}
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                            <span>{formatDate(tx.date)}</span>
                            <span>•</span>
                            <span className="uppercase font-mono">{tx.method?.replace(/_/g, " ")}</span>
                          </div>
                        </div>
                      </div>
                      <div
                        className={`text-xs font-bold font-mono shrink-0 ml-2 ${
                          isInc ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {isInc ? "+" : "-"}
                        {formatCurrency(tx.amount, currency, currencySymbol)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
