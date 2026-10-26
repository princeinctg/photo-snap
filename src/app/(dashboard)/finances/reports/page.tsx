"use client";

import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Download,
  Printer,
  TrendingUp,
  CreditCard,
  DollarSign,
  Receipt,
  Calendar,
  Percent,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { exportToCSV } from "@/lib/export-utils";
import { useTheme } from "@/components/layout/ThemeProvider";
import {
  IncomeExpenseBarChart,
  NetProfitLineChart,
} from "@/components/dashboard/FinancialCharts";

export default function FinancialReportsPage() {
  const { currency, currencySymbol, studioName } = useTheme();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      try {
        const res = await fetch("/api/finances/summary?range=all");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  const summary = data?.summary || {
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    outstandingReceivables: 0,
    totalBilledAllTime: 0,
    totalCollectedAllTime: 0,
    collectionRate: 100,
  };

  const operatingMargin =
    summary.totalRevenue > 0
      ? ((summary.netProfit / summary.totalRevenue) * 100).toFixed(1)
      : "0.0";

  const handleExportPL = () => {
    if (!data?.monthlyTrends) return;
    const rows = data.monthlyTrends.map((t: any) => ({
      Month: t.month,
      "Recognized Income": t.income,
      "Total Expenses": t.expenses,
      "Net Profit": t.netProfit,
      "Margin %": t.income > 0 ? ((t.netProfit / t.income) * 100).toFixed(1) + "%" : "0%",
    }));
    exportToCSV("photostudio_profit_and_loss_report", rows);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileSpreadsheet className="h-7 w-7 text-primary" />
            <span>Financial & P&L Reports</span>
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Comprehensive Cash-Basis Income Statement, Operating Margin, and Receivables Aging.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPL} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
          <Button size="sm" onClick={handlePrint} className="gap-1.5 text-xs">
            <Printer className="h-3.5 w-3.5" />
            <span>Print Report</span>
          </Button>
        </div>
      </div>

      {/* Printable Report Wrapper */}
      <div className="space-y-6 print-container">
        {/* P&L Executive Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
                Total Recognized Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-400">
                {formatCurrency(summary.totalRevenue, currency, currencySymbol)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Confirmed client payments</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
                Total Operating Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">
                {formatCurrency(summary.totalExpenses, currency, currencySymbol)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Equipment, rent & editing</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
                Net Operating Profit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(summary.netProfit, currency, currencySymbol)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Gross cash in minus out</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-cyan-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
                Net Profit Margin
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-400 flex items-center gap-1">
                <span>{operatingMargin}%</span>
                <Percent className="h-4 w-4" />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Efficiency ratio</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts in Report */}
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle>Historical Monthly Performance</CardTitle>
            <CardDescription>Visual comparison of revenue versus expenses over time</CardDescription>
          </CardHeader>
          <IncomeExpenseBarChart data={data?.monthlyTrends || []} />
        </Card>

        {/* Monthly P&L Breakdown Table */}
        <Card>
          <CardHeader>
            <CardTitle>Profit and Loss Statement (Monthly)</CardTitle>
            <CardDescription>Chronological breakdown of cash revenue, expenditures, and net balance</CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground border-b">
                <tr>
                  <th className="py-3 px-4">Period / Month</th>
                  <th className="py-3 px-4 text-right">Recognized Revenue</th>
                  <th className="py-3 px-4 text-right">Total Expenses</th>
                  <th className="py-3 px-4 text-right">Net Profit</th>
                  <th className="py-3 px-4 text-right">Profit Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono text-xs">
                {(data?.monthlyTrends || []).map((t: any) => {
                  const margin =
                    t.income > 0 ? ((t.netProfit / t.income) * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={t.month} className="hover:bg-secondary/30">
                      <td className="py-3.5 px-4 font-sans font-medium text-foreground">
                        {t.month}
                      </td>
                      <td className="py-3.5 px-4 text-right text-emerald-400">
                        {formatCurrency(t.income, currency, currencySymbol)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-red-400">
                        {formatCurrency(t.expenses, currency, currencySymbol)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-foreground">
                        {formatCurrency(t.netProfit, currency, currencySymbol)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-muted-foreground">
                        {margin}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Accounting Method Disclosure */}
        <div className="p-4 rounded-xl border bg-card/60 text-xs text-muted-foreground leading-relaxed">
          <span className="font-bold text-foreground block mb-1">
            Accounting Standard & Method Disclosure:
          </span>
          This report uses strict <strong>Cash-Basis Accounting</strong>. Income is recognized
          exclusively upon physical or digital clearance of customer funds (via Cash, Bank Transfer,
          bKash, or Card) and is never recognized simply upon the issuance of an invoice draft.
          Outstanding balances are reported independently as <em>Accounts Receivable</em> and do not
          inflate recognized taxable profit.
        </div>
      </div>
    </div>
  );
}
