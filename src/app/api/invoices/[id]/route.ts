import { NextResponse } from "next/server";
import { ApiError, audit, handleError, parseBody, requireAuth, requireStaff } from "@/lib/api";
import { can } from "@/lib/permissions";
import { getInvoiceById, saveInvoice, deleteInvoice, getSettings } from "@/lib/db";
import { ClientModel, InvoiceModel } from "@/lib/models";
import { getSessionFromRequest } from "@/lib/session";
import { invoiceUpdateSchema } from "@/lib/validation";

async function publicInvoice(id: string) {
  const invoice = await InvoiceModel.findOne({ shareToken: id }).lean();
  if (!invoice) return null;
  const settings = await getSettings((invoice as any).studioId);
  return {
    invoice: { ...(invoice as any), id: (invoice as any).id || String((invoice as any)._id) },
    studioSettings: settings,
  };
}

async function assertInvoiceAccess(
  auth: Awaited<ReturnType<typeof requireAuth>>,
  invoice: any
) {
  if (auth.role === "client") {
    const client = await ClientModel.findOne({
      id: invoice.clientId,
      studioId: auth.studioId,
    })
      .select("userId")
      .lean();
    if (!client || (client as any).userId !== auth.userId) {
      throw new ApiError(403, "You can only access your own invoices.", "FORBIDDEN");
    }
    return;
  }
  if (!can(auth.role, "invoices:read")) {
    throw new ApiError(403, "You do not have permission to view this invoice.", "FORBIDDEN");
  }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionFromRequest(req);

    // Public share link: only the opaque shareToken can be used without auth.
    if (!session) {
      const shared = await publicInvoice(params.id);
      if (!shared) throw new ApiError(404, "Invoice not found or link has expired.", "NOT_FOUND");
      return NextResponse.json({ success: true, ...shared });
    }

    const auth = await requireAuth(req);
    let invoice = await getInvoiceById(params.id, auth.studioId);
    if (!invoice) {
      // Authenticated users may also open their own share link.
      invoice = await getInvoiceById(params.id);
      if (!invoice || invoice.studioId !== auth.studioId) {
        throw new ApiError(404, "Invoice not found", "NOT_FOUND");
      }
    }
    await assertInvoiceAccess(auth, invoice);

    const settings = await getSettings(invoice.studioId || auth.studioId);
    return NextResponse.json({ success: true, invoice, studioSettings: settings });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireStaff(req, "invoices:write");
    const existing = await getInvoiceById(params.id, auth.studioId);
    if (!existing) throw new ApiError(404, "Invoice not found", "NOT_FOUND");

    const body = await parseBody(req, invoiceUpdateSchema);

    const updated = await saveInvoice({
      ...existing,
      ...body,
      paymentMethod: (body.paymentMethod || existing.paymentMethod) as any,
      id: params.id,
      studioId: auth.studioId,
      clientId: body.clientId || existing.clientId,
      items: body.items
        ? (body.items.map((item, idx) => ({
            id: item.id || `item_${idx + 1}`,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.quantity * item.unitPrice,
          })) as any)
        : existing.items,
    });

    await audit({
      req,
      auth,
      studioId: auth.studioId,
      action: "invoice.update",
      entityType: "Invoice",
      entityId: params.id,
      details: { fields: Object.keys(body) },
    });

    return NextResponse.json({ success: true, invoice: updated });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireStaff(req, "invoices:write");
    const existing = await getInvoiceById(params.id, auth.studioId);
    if (!existing) throw new ApiError(404, "Invoice not found", "NOT_FOUND");

    await deleteInvoice(params.id, auth.studioId);

    await audit({
      req,
      auth,
      studioId: auth.studioId,
      action: "invoice.delete",
      entityType: "Invoice",
      entityId: params.id,
      details: { invoiceNumber: existing.invoiceNumber },
    });

    return NextResponse.json({ success: true, message: "Invoice deleted." });
  } catch (error) {
    return handleError(error);
  }
}
