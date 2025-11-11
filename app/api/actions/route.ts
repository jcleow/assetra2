import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  type ActionEventInsert,
  listActionEvents,
  recordActionEvent,
} from "@/lib/db/queries";

const ActionPayloadSchema = z.object({
  intentId: z.string().min(1, "intentId required"),
  chatId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  action: z.object({
    verb: z.string().min(1),
    entity: z.string().min(1),
    target: z.string().optional(),
    amount: z.number().nullable().optional(),
    currency: z.string().nullable().optional(),
    raw: z.string().optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = ActionPayloadSchema.parse(await request.json());
    try {
      const event = await recordActionEvent({
        intentId: parsed.intentId,
        chatId: parsed.chatId,
        userId: parsed.userId,
        verb: parsed.action.verb,
        entity: parsed.action.entity,
        target: parsed.action.target,
        amount: parsed.action.amount ?? null,
        currency: parsed.action.currency ?? null,
        payload: parsed.action,
      } satisfies ActionEventInsert);

      return NextResponse.json(event);
    } catch (dbError) {
      console.warn("Action audit persistence skipped:", dbError);
      return NextResponse.json(
        { skipped: true, message: "Action audit storage disabled." },
        { status: 200 }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid action payload", details: error.flatten() },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to persist action" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("chatId") ?? undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : 50;

    if (limitParam && Number.isNaN(limit)) {
      return NextResponse.json(
        { error: "limit must be a number" },
        { status: 400 }
      );
    }

    const events = await listActionEvents({
      chatId,
      limit: Math.min(Math.max(limit, 1), 100),
    });
    return NextResponse.json({ events });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to fetch actions" },
      { status: 500 }
    );
  }
}
