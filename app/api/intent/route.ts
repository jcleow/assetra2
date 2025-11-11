import { NextResponse } from "next/server";

import { IntentParseError, parseIntent } from "@/lib/intent/parser";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.message !== "string") {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "Expected payload { message: string }",
        },
        { status: 400 }
      );
    }

    const result = await parseIntent(body.message);
    console.info("[intent] parsed", result);

    return NextResponse.json({
      intentId: crypto.randomUUID(),
      actions: result.actions,
    });
  } catch (error) {
    if (error instanceof IntentParseError) {
      return NextResponse.json(
        {
          error: "Unable to parse intent",
          message: error.message,
        },
        { status: 400 }
      );
    }

    console.error("[intent] unexpected", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
