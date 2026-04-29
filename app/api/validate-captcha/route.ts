import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const secret = process.env.TURNSTILE_SECRET_KEY;

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `secret=${secret}&response=${token}`,
      }
    );

    const data = await response.json();

    return NextResponse.json({
      success: data.success,
    });
  } catch (err) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
