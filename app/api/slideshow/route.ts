import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  const { evento_id, foto_ids } = await req.json();
  if (!evento_id || !Array.isArray(foto_ids) || foto_ids.length === 0) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("slideshow_configs")
    .insert({ evento_id, foto_ids })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
