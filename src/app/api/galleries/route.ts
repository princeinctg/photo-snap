import { NextResponse } from "next/server";
import { getGalleries, saveGallery } from "@/lib/db";
import { requireAuth, requireStaff, handleError, audit } from "@/lib/api";
import { ClientModel, EmployeeModel, ProjectModel } from "@/lib/models";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    let galleries = await getGalleries(auth.studioId);

    // Role-based scoping
    if (auth.role === "client") {
      const clientDocs = await ClientModel.find({ studioId: auth.studioId, userId: auth.userId })
        .select("id")
        .lean();
      const clientIds = clientDocs.map((c: any) => c.id);
      // Client only sees galleries explicitly linked to their client ID
      galleries = galleries.filter((g) => g.clientId && clientIds.includes(g.clientId));
    } else if (auth.role === "employee") {
      const employee = await EmployeeModel.findOne({ studioId: auth.studioId, userId: auth.userId })
        .select("id employeeId assignedProjects")
        .lean();
      if (employee) {
        const empId = (employee as any).id;
        const assignedPrjs = ((employee as any).assignedProjects || []).map(String);
        galleries = galleries.filter(
          (g) =>
            !g.employeeId ||
            g.employeeId === empId ||
            (g.projectId && assignedPrjs.includes(g.projectId))
        );
      }
    }

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || searchParams.get("q") || "").trim().toLowerCase();
    const eventType = searchParams.get("eventType");
    const clientId = searchParams.get("clientId");
    const projectId = searchParams.get("projectId");
    const employeeId = searchParams.get("employeeId");

    if (search) {
      galleries = galleries.filter(
        (g) =>
          g.title.toLowerCase().includes(search) ||
          (g.clientName && g.clientName.toLowerCase().includes(search)) ||
          (g.projectTitle && g.projectTitle.toLowerCase().includes(search)) ||
          (g.employeeName && g.employeeName.toLowerCase().includes(search)) ||
          (g.description && g.description.toLowerCase().includes(search))
      );
    }
    if (eventType) {
      galleries = galleries.filter((g) => g.eventType === eventType);
    }
    if (clientId) {
      galleries = galleries.filter((g) => g.clientId === clientId);
    }
    if (projectId) {
      galleries = galleries.filter((g) => g.projectId === projectId);
    }
    if (employeeId) {
      galleries = galleries.filter((g) => g.employeeId === employeeId);
    }

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50));
    const total = galleries.length;
    const paginated = galleries.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      success: true,
      galleries: paginated,
      total,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireStaff(req, "galleries:write");
    const body = await req.json();

    if (!body.title || !body.title.trim()) {
      return NextResponse.json({ success: false, error: "Gallery title is required" }, { status: 400 });
    }

    let clientName = body.clientName || "";
    if (body.clientId && !clientName) {
      const client = await ClientModel.findOne({ id: body.clientId, studioId: auth.studioId }).select("name").lean();
      if (client) clientName = (client as any).name;
    }

    let employeeName = body.employeeName || "";
    if (body.employeeId && !employeeName) {
      const emp = await EmployeeModel.findOne({ id: body.employeeId, studioId: auth.studioId }).select("fullName").lean();
      if (emp) employeeName = (emp as any).fullName;
    }

    let projectTitle = body.projectTitle || "";
    if (body.projectId && !projectTitle) {
      const prj = await ProjectModel.findOne({ id: body.projectId, studioId: auth.studioId }).select("title").lean();
      if (prj) projectTitle = (prj as any).title;
    }

    const saved = await saveGallery({
      ...body,
      studioId: auth.studioId,
      clientName,
      employeeName,
      projectTitle,
    });

    await audit({
      req,
      auth,
      studioId: auth.studioId,
      action: "gallery.create",
      entityType: "Gallery",
      entityId: saved.id,
      details: { title: saved.title },
    });

    return NextResponse.json({ gallery: saved, success: true }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
