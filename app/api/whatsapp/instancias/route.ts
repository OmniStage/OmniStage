import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const BASE_URL = process.env.EVOLUTION_API_URL!;
  const API_KEY = process.env.EVOLUTION_API_KEY!;

  // Busca tenant_id do usuário logado
  const authHeader = req.headers.get("authorization");
  let tenantInstance: string | null = null;

  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) {
      const { data: membro } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", user.id)
        .in("status", ["ativo", "active", "aprovado"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (membro?.tenant_id) {
        // Busca nome do tenant para nomear a instância de forma legível
        const { data: tenant } = await supabase
          .from("tenants")
          .select("nome")
          .eq("id", membro.tenant_id)
          .maybeSingle();
        if (tenant?.nome) {
          // Sanitiza: remove acentos, espaços viram _, só letras/números/_
          const nomeSanitizado = tenant.nome
            .normalize("NFD").replace(/[̀-ͯ]/g, "")
            .replace(/\s+/g, "_")
            .replace(/[^a-zA-Z0-9_]/g, "")
            .toLowerCase()
            .slice(0, 40);
          tenantInstance = nomeSanitizado || `tenant_${membro.tenant_id}`;
        } else {
          tenantInstance = `tenant_${membro.tenant_id}`;
        }
      }
    }
  }

  // Busca todas as instâncias da Evolution
  const res = await fetch(`${BASE_URL}/instance/fetchInstances`, {
    headers: { apikey: API_KEY },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Erro ao buscar instâncias" }, { status: 500 });
  }

  const instancias: any[] = await res.json();

  // Instâncias OmniStage = as que não têm __ no nome (não são de clientes)
  const instanciasOmniStage = instancias
    .filter((i) => !i.name.includes("__"))
    .map((i) => ({
      nome: i.name,
      conectado: i.connectionStatus === "open",
      numero: i.ownerJid?.replace("@s.whatsapp.net", "") || null,
    }));

  const cliente = tenantInstance ? instancias.find((i) => i.name === tenantInstance) : null;

  return NextResponse.json({
    omnistage: instanciasOmniStage,
    cliente: cliente ? {
      nome: tenantInstance,
      conectado: cliente.connectionStatus === "open",
      numero: cliente?.ownerJid?.replace("@s.whatsapp.net", "") || null,
    } : null,
    tenantInstance,
  });
}
