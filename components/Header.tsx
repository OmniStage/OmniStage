"use client";

export default function Header() {
  return (
    <header
      style={{
        width: "100%",
        padding: "20px 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid rgba(167,139,250,0.2)",
        background: "#020617",
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: 1,
        }}
      >
        Omni<span style={{ color: "#a78bfa" }}>Stage</span>
      </h1>

      <nav style={{ display: "flex", gap: 20 }}>
        <a href="/" style={{ color: "#cbd5e1" }}>
          Home
        </a>
        <a href="/login" style={{ color: "#cbd5e1" }}>
          Login
        </a>
      </nav>
    </header>
  );
}
