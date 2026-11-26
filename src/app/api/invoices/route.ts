import { NextResponse } from "next/server";
import { ApiError, audit, handleError, parseBody, requireAuth, requireStaff } from "@/lib/api";
import { can } from "@/lib/permissions";
import { getInvoices, saveInvoice } from "@/lib/db";
import { ClientModel } from "@/lib/models";
import { invoiceCreateSchema } from "@/lib/validation";

async function scopeInvoices(auth: Awaited<ReturnType<typeof requireAuth>>) {
  let invoices = await getInvoices(auth.studioId);

  if (auth.role === "client") {
    const clients = await ClientModel.find({ studioId: auth.studioId, userId: auth.userId })
      .select("id")
      .lean();
    const ids = clients.map((client: any) => client.id);
    invoices = invoices.filter((invoice) => ids.includes(invoice.clientId));
  } else if (!can(auth.role, "invoices:read")) {
    throw new ApiError(403, "You do not have permission to view invoices.", "FORBIDDEN");
  }

  return invoices;
}

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const clientId = searchParams.get("clientId");
    const q = (searchParams.get("q") || "").toLowerCase().trim();

    let invoices = await scopeInvoices(auth);

    if (status) invoices = invoices.filter((invoice) => invoice.status === status);
    if (clientId) invoices = invoices.filter((invoice) => invoice.clientId === clientId);
    if (q) {
      invoices = invoices.filter(
        (invoice) =>
          invoice.invoiceNumber.toLowerCase().includes(q) ||
          invoice.clientName.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ success: true, invoices, data: invoices });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireStaff(req, "invoices:write");
    const body = await parseBody(req, invoiceCreateSchema);

    const client = await ClientModel.findOne({ id: body.clientId, studioId: auth.studioId }).lean();
    if (!client) throw new ApiError(400, "Selected client was not found.", "INVALID_CLIENT");

    const saved = await saveInvoice({
      ...body,
      paymentMethod: body.paymentMethod as any,
      items: body.items.map((it, idx) => ({
        id: it.id || `item_${idx + 1}`,
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        amount: it.quantity * it.unitPrice,
      })),
      studioId: auth.studioId,
      clientName: (client as any).name,
      clientEmail: (client as any).email,
      clientPhone: (client as any).phone,
      clientAddress: (client as any).address,
      taxRate: body.taxRate ?? 0,
    });

    await audit({
      req,
      auth,
      studioId: auth.studioId,
      action: "invoice.create",
      entityType: "Invoice",
      entityId: saved.id,
      details: { invoiceNumber: saved.invoiceNumber, totalAmount: saved.totalAmount },
    });

    return NextResponse.json({ success: true, invoice: saved }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
