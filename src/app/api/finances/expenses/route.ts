import { NextResponse } from "next/server";
import { getExpenses, saveExpense } from "@/lib/db";
import { DEFAULT_STUDIO_ID } from "@/lib/demo-data";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studioId = searchParams.get("studioId") || DEFAULT_STUDIO_ID;
    const category = searchParams.get("category");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let expenses = await getExpenses(studioId);

    if (category && category !== "all") {
      expenses = expenses.filter((e) => e.category === category);
    }
    if (startDate) {
      expenses = expenses.filter((e) => e.date >= startDate);
    }
    if (endDate) {
      expenses = expenses.filter((e) => e.date <= endDate);
    }

    return NextResponse.json({ expenses });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load expenses" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.title || !body.amount || !body.date) {
      return NextResponse.json(
        { error: "Title, amount, and date are required" },
        { status: 400 }
      );
    }

    const saved = await saveExpense(body);
    return NextResponse.json({ expense: saved, success: true }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save expense" }, { status: 500 });
  }
}
