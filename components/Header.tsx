
import Link from "next/link";

export function Header() {
  return (
    <header className="header">
      <Link href="/" className="logo">Omni<span>Stage</span></Link>
      <nav className="nav">
        <Link className="btn" href="/convite">Convite</Link>
        <Link className="btn" href="/checkin">Check-in</Link>
        <Link className="btn gold" href="/dashboard">Dashboard</Link>
      </nav>
    </header>
  );
}
