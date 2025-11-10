import type { NextRequest } from "next/server";

/**
 * Temporary stub history endpoint.
 * We don't have user-specific chat persistence yet, so just return an empty array
 * and skip hitting the database. This keeps the UI happy without requiring auth.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const limit = Number.parseInt(searchParams.get("limit") || "10", 10);
  const startingAfter = searchParams.get("starting_after");
  const endingBefore = searchParams.get("ending_before");

  if (startingAfter && endingBefore) {
    return Response.json(
      {
        error: "Only one of starting_after or ending_before can be provided.",
      },
      { status: 400 }
    );
  }

  return Response.json({
    chats: [],
    hasMore: false,
    limit,
    startingAfter,
    endingBefore,
  });
}

export async function DELETE() {
  return Response.json({ deleted: 0 }, { status: 200 });
}
