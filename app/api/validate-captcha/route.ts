import { NextResponse } from "next/server";

type TurnstileResult = {
  success: boolean;
  "error-codes"?: string[];
};

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    const secret = process.env.TURNSTILE_SECRET_KEY;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "missing_token" },
        { status: 400 }
      );
    }

    if (!secret) {
      return NextResponse.json(
        { success: false, error: "missing_turnstile_secret" },
        { status: 500 }
      );
    }

    const forwardedFor = req.headers.get("x-forwarded-for");
    const remoteIp = forwardedFor?.split(",")[0]?.trim();
    const formData = new URLSearchParams();

    formData.set("secret", secret);
    formData.set("response", token);

    if (remoteIp) {
      formData.set("remoteip", remoteIp);
    }

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      }
    );

    const data = (await response.json()) as TurnstileResult;

    return NextResponse.json({
      success: data.success,
      errorCodes: data["error-codes"] || [],
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "captcha_validation_failed" },
      { status: 500 }
    );
  }
}
