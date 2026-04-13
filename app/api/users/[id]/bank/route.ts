import { prisma } from "@/lib/db";
import { type NextRequest } from "next/server";

// GET /api/users/[id]/bank — get linked bank for user
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const bank = await prisma.bankAccount.findUnique({
      where: { userId: id },
    });

    return Response.json({ bank });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/users/[id]/bank — link/update bank account
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { bankName, beneficiary, accountLast4, fullAccount, ifsc, upiId, mobikwik } = body;

    if (!bankName || !beneficiary || !accountLast4 || !fullAccount || !ifsc) {
      return Response.json(
        { error: "All bank fields are required" },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const bank = await prisma.bankAccount.upsert({
      where: { userId: id },
      update: { bankName, beneficiary, accountLast4, fullAccount, ifsc, upiId: upiId || "", mobikwik: mobikwik || "" },
      create: {
        userId: id,
        bankName,
        beneficiary,
        accountLast4,
        fullAccount,
        ifsc,
        upiId: upiId || "",
        mobikwik: mobikwik || "",
      },
    });

    return Response.json({ bank });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/users/[id]/bank — remove linked bank account
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.bankAccount.findUnique({
      where: { userId: id },
    });

    if (!existing) {
      return Response.json({ error: "No bank account found" }, { status: 404 });
    }

    await prisma.bankAccount.delete({ where: { userId: id } });

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
