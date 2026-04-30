import { supabase } from "@/lib/supabase";

export default async function NetworkPage() {
  const { data: networks } = await supabase
    .from("network_members")
    .select("network_id");

  return (
    <div style={{ padding: 40, color: "#fff" }}>
      <h1>Dashboard da Rede</h1>

      <p>Você tem acesso a {networks?.length || 0} redes</p>
    </div>
  );
}
