import { NextResponse } from "next/server";
import { ApiError, audit, handleError, parseBody, requireAuth, requireStaff } from "@/lib/api";
import { can } from "@/lib/permissions";
import { getInvoiceById, recordInvoicePayment } from "@/lib/db";
import { ClientModel, PaymentModel } from "@/lib/models";
import { paymentSchema } from "@/lib/validation";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req);
    const invoice = await getInvoiceById(params.id, auth.studioId);
    if (!invoice) throw new ApiError(404, "Invoice not found", "NOT_FOUND");

    if (auth.role === "client") {
      const client = await ClientModel.findOne({
        id: invoice.clientId,
        studioId: auth.studioId,
      })
        .select("userId")
        .lean();
      if (!client || (client as any).userId !== auth.userId) {
        throw new ApiError(403, "You can only access your own payments.", "FORBIDDEN");
      }
    } else if (!can(auth.role, "payments:read")) {
      throw new ApiError(403, "You do not have permission to view payments.", "FORBIDDEN");
    }

    const payments = await PaymentModel.find({
      studioId: auth.studioId,
      invoiceId: invoice.id,
    })
      .sort({ paymentDate: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      payments: payments.map((payment: any) => ({
        ...payment,
        id: payment.id || String(payment._id),
      })),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireStaff(req, "payments:write");
    const body = await parseBody(req, paymentSchema);

    const invoice = await getInvoiceById(params.id, auth.studioId);
    if (!invoice) throw new ApiError(404, "Invoice not found", "NOT_FOUND");

    const result = await recordInvoicePayment({
      invoiceId: params.id,
      amount: body.amount,
      paymentDate: body.paymentDate,
      paymentMethod: body.paymentMethod,
      referenceNumber: body.referenceNumber,
      notes: body.notes,
      studioId: auth.studioId,
    });

    await audit({
      req,
      auth,
      studioId: auth.studioId,
      action: "payment.record",
      entityType: "Payment",
      entityId: result.payment.id,
      details: { invoiceId: params.id, amount: body.amount },
    });

    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
