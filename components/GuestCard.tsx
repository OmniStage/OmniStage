"use client";

import { useState } from "react";
import type { Guest } from "@/lib/types";
import { guestName, guestPhone, guestStatus } from "@/lib/types";

export default function GuestCard({ guest }: { guest: Guest }) {
  const [open, setOpen] = useState(false);
  const status = guestStatus(guest);
  const name = guestName(guest);
  const phone = guestPhone(guest);
  const whatsapp = phone.replace(/\D/g, "");

  async function copyName(e: React.MouseEvent) {
    e.stopPropagation();
    await navigator.clipboard.writeText(name);
  }

  return (
    <div className="guestRow" onClick={() => setOpen(!open)}>
      <div className="guestHeader">
        <div>
          <div className="name">{name}</div>
          <div className="sub">{guest.grupo || "INDIVIDUAL"}{phone ? ` • ${phone}` : ""}</div>
        </div>
        <div className={`badge ${status}`}>{status === "nao" ? "NÃO VAI" : status.toUpperCase()}</div>
        <div className="sub">ID {guest.id}</div>
        <div className="chev">{open ? "⌃" : "⌄"}</div>
      </div>

      {open && (
        <div className="details">
          <div className="detailGrid">
            <div className="detailItem"><div className="detailLabel">Grupo</div><div className="detailVal">{guest.grupo || "—"}</div></div>
            <div className="detailItem"><div className="detailLabel">Telefone</div><div className="detailVal">{phone || "—"}</div></div>
            <div className="detailItem"><div className="detailLabel">Status RSVP</div><div className="detailVal">{status.toUpperCase()}</div></div>
            <div className="detailItem"><div className="detailLabel">Check-in</div><div className="detailVal">{status === "entrou" || guest.checkin ? "Entrou" : "Ainda não entrou"}</div></div>
            <div className="detailItem"><div className="detailLabel">Confirmação</div><div className="detailVal">{guest.data_confirmacao || guest.created_at || "—"}</div></div>
            <div className="detailItem"><div className="detailLabel">Token</div><div className="detailVal">{guest.token || "—"}</div></div>
          </div>
          <div className="actions">
            <button className="actionBtn" onClick={copyName}>Copiar nome</button>
            {whatsapp && <a className="actionBtn" onClick={(e) => e.stopPropagation()} href={`https://wa.me/55${whatsapp}`} target="_blank">WhatsApp</a>}
            {guest.link_cartao && <a className="actionBtn" onClick={(e) => e.stopPropagation()} href={guest.link_cartao} target="_blank">Ver cartão</a>}
          </div>
        </div>
      )}
    </div>
  );
}
