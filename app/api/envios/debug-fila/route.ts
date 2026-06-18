import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("envio_fila")
    .select("id, status, agendado_para, telefone, criado_em")
    .order("criado_em", { ascending: false })
    .limit(10);

  return NextResponse.json({ data, error });
}
