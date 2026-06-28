import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const BASE_URL = process.env.EVOLUTION_API_URL!;
  const API_KEY = process.env.EVOLUTION_API_KEY!;
  const url = new URL(req.url);
  const INSTANCE = url.searchParams.get("instance") || process.env.EVOLUTION_INSTANCE!;

  await fetch(`${BASE_URL}/instance/logout/${INSTANCE}`, {
    method: "DELETE",
    headers: { apikey: API_KEY },
  });

  return NextResponse.json({ ok: true });
}
