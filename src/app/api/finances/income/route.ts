import { NextResponse } from "next/server";
import { getIncomes, saveIncome } from "@/lib/db";
import { getAuthStudioId } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const studioId = getAuthStudioId(req);
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let incomes = await getIncomes(studioId);

    if (category && category !== "all") {
      incomes = incomes.filter((i) => i.category === category);
    }
    if (startDate) {
      incomes = incomes.filter((i) => i.date >= startDate);
    }
    if (endDate) {
      incomes = incomes.filter((i) => i.date <= endDate);
    }

    return NextResponse.json({ incomes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load income" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const studioId = getAuthStudioId(req);
    const body = await req.json();
    if (!body.title || !body.amount || !body.date) {
      return NextResponse.json(
        { error: "Title, amount, and date are required" },
        { status: 400 }
      );
    }

    const saved = await saveIncome({ ...body, studioId });
    return NextResponse.json({ income: saved, success: true }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save income" }, { status: 500 });
  }
}
