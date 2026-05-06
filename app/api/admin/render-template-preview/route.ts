import { NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 60;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  let browser: any = null;

  try {
    const body = await req.json();

    const templateId = body?.templateId;
    const html = body?.html;

    if (!templateId || !html) {
      return NextResponse.json(
        { error: "templateId e html são obrigatórios." },
        { status: 400 }
      );
    }

    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      defaultViewport: {
        width: 430,
        height: 920,
        deviceScaleFactor: 2,
      },
    });

    const page = await browser.newPage();

    await page.setViewport({
      width: 430,
      height: 920,
      deviceScaleFactor: 2,
    });

    await page.setContent(html, {
      waitUntil: ["domcontentloaded", "networkidle0"],
      timeout: 45000,
    });

    await page.evaluate(async () => {
      const images = Array.from(document.images);
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 800));
    });

    const screenshot = await page.screenshot({
      type: "png",
      fullPage: false,
      clip: {
        x: 0,
        y: 0,
        width: 430,
        height: 920,
      },
    });

    const filePath = `template-previews/${templateId}-${Date.now()}.png`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("invite-assets")
      .upload(filePath, screenshot, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: "Erro ao enviar preview: " + uploadError.message },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("invite-assets")
      .getPublicUrl(filePath);

    const previewUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabaseAdmin
      .from("invite_templates")
      .update({ preview_image: previewUrl })
      .eq("id", templateId);

    if (updateError) {
      return NextResponse.json(
        { error: "Erro ao atualizar modelo: " + updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      preview_image: previewUrl,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || "Erro ao gerar preview.",
      },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
