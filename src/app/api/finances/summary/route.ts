import { NextResponse } from "next/server";
import { getIncomes, getExpenses, getInvoices, getBookings, getClients } from "@/lib/db";
import { DEFAULT_STUDIO_ID } from "@/lib/demo-data";
import { calculateStudioFinancials, generateMonthlyFinancialTrends } from "@/lib/finance-utils";
import { roundToTwoDecimals } from "@/lib/utils";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studioId = searchParams.get("studioId") || DEFAULT_STUDIO_ID;
    const dateRange = searchParams.get("range") || "this_year"; // today, this_week, this_month, this_year, all, custom
    const customStart = searchParams.get("startDate");
    const customEnd = searchParams.get("endDate");

    const allIncomes = await getIncomes(studioId);
    const allExpenses = await getExpenses(studioId);
    const allInvoices = await getInvoices(studioId);
    const allBookings = await getBookings(studioId);
    const allClients = await getClients(studioId);

    // Filter by date range for dashboard KPI metrics
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (dateRange === "today") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (dateRange === "this_week") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      startDate = new Date(now.getFullYear(), now.getMonth(), diff);
      endDate = new Date(now.getFullYear(), now.getMonth(), diff + 6, 23, 59, 59);
    } else if (dateRange === "this_month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (dateRange === "this_year") {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    } else if (dateRange === "custom" && customStart && customEnd) {
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
    }

    const filteredIncomes = startDate && endDate
      ? allIncomes.filter((i) => {
          const d = new Date(i.date);
          return d >= startDate! && d <= endDate!;
        })
      : allIncomes;

    const filteredExpenses = startDate && endDate
      ? allExpenses.filter((e) => {
          const d = new Date(e.date);
          return d >= startDate! && d <= endDate!;
        })
      : allExpenses;

    // Financial KPIs
    const financials = calculateStudioFinancials(filteredIncomes, filteredExpenses, allInvoices);

    // Bookings metrics
    const todayStr = now.toISOString().split("T")[0];
    const upcomingShoots = allBookings.filter(
      (b) => b.shootDate >= todayStr && b.status !== "cancelled" && b.status !== "completed"
    );
    const completedProjects = allBookings.filter((b) => b.status === "completed").length;

    // Monthly trends (last 6 months)
    const monthlyTrends = generateMonthlyFinancialTrends(allIncomes, allExpenses, 6);

    // Expense breakdown by category for pie/donut chart
    const expenseCategoryMap: Record<string, number> = {};
    filteredExpenses.forEach((exp) => {
      const cat = exp.category.replace(/_/g, " ").toUpperCase();
      expenseCategoryMap[cat] = (expenseCategoryMap[cat] || 0) + exp.amount;
    });

    const categoryColors: Record<string, string> = {
      EQUIPMENT: "#10b981",
      "CAMERA ACCESSORIES": "#06b6d4",
      LIGHTING: "#3b82f6",
      TRAVEL: "#f59e0b",
      RENT: "#8b5cf6",
      SALARY: "#ec4899",
      EDITING: "#6366f1",
      MARKETING: "#f97316",
      UTILITIES: "#14b8a6",
      SOFTWARE: "#84cc16",
      MAINTENANCE: "#a855f7",
      CUSTOM: "#64748b",
    };

    const categoryExpenses = Object.entries(expenseCategoryMap).map(([name, value]) => ({
      name,
      value: roundToTwoDecimals(value),
      color: categoryColors[name] || "#64748b",
    }));

    // Income breakdown by category
    const incomeCategoryMap: Record<string, number> = {};
    filteredIncomes.forEach((inc) => {
      const cat = inc.category.replace(/_/g, " ").toUpperCase();
      incomeCategoryMap[cat] = (incomeCategoryMap[cat] || 0) + inc.amount;
    });
    const categoryIncome = Object.entries(incomeCategoryMap).map(([name, value]) => ({
      name,
      value: roundToTwoDecimals(value),
    }));

    // Cash flow: monthly cash in vs cash out
    const cashFlow = monthlyTrends.map((t) => ({
      date: t.month,
      cashIn: t.income,
      cashOut: t.expenses,
      netCash: t.netProfit,
    }));

    // Recent transactions (merged incomes and expenses)
    const recentTransactions = [
      ...allIncomes.map((i) => ({
        id: i.id,
        title: i.title,
        type: "income" as const,
        amount: i.amount,
        date: i.date,
        method: i.paymentMethod,
        party: i.clientName || "Direct Income",
      })),
      ...allExpenses.map((e) => ({
        id: e.id,
        title: e.title,
        type: "expense" as const,
        amount: e.amount,
        date: e.date,
        method: e.paymentMethod,
        party: e.vendor || "Vendor",
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 7);

    // Upcoming appointments
    const upcomingAppointments = [...upcomingShoots]
      .sort((a, b) => new Date(a.shootDate).getTime() - new Date(b.shootDate).getTime())
      .slice(0, 5);

    // Outstanding summary: total billed, total collected, remaining receivables
    const totalBilledAllTime = allInvoices.reduce((acc, inv) => acc + (inv.status !== "cancelled" ? inv.totalAmount : 0), 0);
    const totalCollectedAllTime = allInvoices.reduce((acc, inv) => acc + (inv.status !== "cancelled" ? inv.paidAmount : 0), 0);

    return NextResponse.json({
      summary: {
        totalRevenue: financials.totalRevenue,
        totalExpenses: financials.totalExpenses,
        netProfit: financials.netProfit,
        outstandingReceivables: financials.outstandingReceivables,
        totalBookings: allBookings.length,
        upcomingShootsCount: upcomingShoots.length,
        completedProjects,
        totalClients: allClients.length,
        totalBilledAllTime: roundToTwoDecimals(totalBilledAllTime),
        totalCollectedAllTime: roundToTwoDecimals(totalCollectedAllTime),
        collectionRate: totalBilledAllTime > 0 ? roundToTwoDecimals((totalCollectedAllTime / totalBilledAllTime) * 100) : 100,
      },
      monthlyTrends,
      categoryExpenses,
      categoryIncome,
      cashFlow,
      recentTransactions,
      upcomingAppointments,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to calculate summary" }, { status: 500 });
  }
}
