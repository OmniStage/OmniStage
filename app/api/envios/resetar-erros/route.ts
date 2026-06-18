import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("envio_fila")
    .update({ status: "pendente", erro: null })
    .in("status", ["erro", "processando"])
    .select("id, telefone, status");

  return NextResponse.json({ resetados: data?.length || 0, data, error });
}
