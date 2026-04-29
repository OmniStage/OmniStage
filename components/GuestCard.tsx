
import type { Guest } from "@/types/guest";

export function GuestCard({ guest }: { guest: Guest }) {
  return (
    <article className="guest">
      <div>
        <strong>{guest.nome}</strong>
        <p style={{ margin: "4px 0 0" }}>{guest.grupo} · Token {guest.token}</p>
      </div>
      <span className={`badge ${guest.status}`}>{guest.status}</span>
    </article>
  );
}
