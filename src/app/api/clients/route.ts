import { NextResponse } from "next/server";
import { getClients, saveClient } from "@/lib/db";
import { DEFAULT_STUDIO_ID } from "@/lib/demo-data";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studioId = searchParams.get("studioId") || DEFAULT_STUDIO_ID;
    const query = (searchParams.get("q") || "").toLowerCase().trim();

    let clients = await getClients(studioId);

    if (query) {
      clients = clients.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.phone.toLowerCase().includes(query) ||
          (c.email && c.email.toLowerCase().includes(query)) ||
          (c.address && c.address.toLowerCase().includes(query))
      );
    }

    return NextResponse.json({ clients });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch clients" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.name || !body.phone) {
      return NextResponse.json({ error: "Client name and phone are required" }, { status: 400 });
    }

    const saved = await saveClient(body);
    return NextResponse.json({ client: saved, success: true }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save client" }, { status: 500 });
  }
}
