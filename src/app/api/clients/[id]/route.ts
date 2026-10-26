import { NextResponse } from "next/server";
import { getClients, saveClient, deleteClient, getBookings, getInvoices, getPayments } from "@/lib/db";
import { DEFAULT_STUDIO_ID } from "@/lib/demo-data";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const clients = await getClients(DEFAULT_STUDIO_ID);
    const client = clients.find((c) => c.id === params.id);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const bookings = (await getBookings(DEFAULT_STUDIO_ID)).filter((b) => b.clientId === client.id);
    const invoices = (await getInvoices(DEFAULT_STUDIO_ID)).filter((i) => i.clientId === client.id);
    const payments = (await getPayments(DEFAULT_STUDIO_ID)).filter((p) => p.clientId === client.id);

    return NextResponse.json({ client, bookings, invoices, payments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load client" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const updated = await saveClient({ ...body, id: params.id });
    return NextResponse.json({ client: updated, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update client" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const success = await deleteClient(params.id);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete client" }, { status: 500 });
  }
}
