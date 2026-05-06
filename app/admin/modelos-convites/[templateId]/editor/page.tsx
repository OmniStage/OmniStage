"use client";

import { useState } from "react";
import { Rnd } from "react-rnd";

type Block = {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export default function EditorModeloConvitePage() {
  const [blocks, setBlocks] = useState<Block[]>([
    {
      id: "titulo",
      text: "VALENTINA XV",
      x: 80,
      y: 120,
      width: 320,
      height: 80,
    },
    {
      id: "subtitulo",
      text: "16 de Maio • Guerrah Hall",
      x: 80,
      y: 220,
      width: 300,
      height: 50,
    },
  ]);

  function atualizarBlock(id: string, updates: Partial<Block>) {
    setBlocks((old) =>
      old.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#eef2ff",
        padding: 24,
      }}
    >
      <div
        style={{
          marginBottom: 20,
          display: "flex",
          gap: 12,
        }}
      >
        <button
          style={{
            height: 44,
            padding: "0 18px",
            borderRadius: 12,
            border: "none",
            background: "#7c3aed",
            color: "#fff",
            fontWeight: 800,
            cursor: "pointer",
          }}
          onClick={() => {
            setBlocks((old) => [
              ...old,
              {
                id: crypto.randomUUID(),
                text: "Novo texto",
                x: 100,
                y: 100,
                width: 220,
                height: 60,
              },
            ]);
          }}
        >
          + Adicionar texto
        </button>
      </div>

      <div
        style={{
          width: 430,
          height: 920,
          margin: "0 auto",
          position: "relative",
          borderRadius: 28,
          overflow: "hidden",
          background:
            "linear-gradient(180deg, #111827 0%, #312e81 100%)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.25)",
        }}
      >
        {blocks.map((block) => (
          <Rnd
            key={block.id}
            size={{
              width: block.width,
              height: block.height,
            }}
            position={{
              x: block.x,
              y: block.y,
            }}
            onDragStop={(e, d) => {
              atualizarBlock(block.id, {
                x: d.x,
                y: d.y,
              });
            }}
            onResizeStop={(e, direction, ref, delta, position) => {
              atualizarBlock(block.id, {
                width: parseInt(ref.style.width),
                height: parseInt(ref.style.height),
                ...position,
              });
            }}
            bounds="parent"
          >
            <div
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => {
                atualizarBlock(block.id, {
                  text: e.currentTarget.innerText,
                });
              }}
              style={{
                width: "100%",
                height: "100%",
                outline: "2px dashed rgba(255,255,255,0.35)",
                borderRadius: 12,
                color: "#fff",
                padding: 8,
                fontWeight: 800,
                fontSize: block.id === "titulo" ? 42 : 22,
                cursor: "move",
                userSelect: "none",
              }}
            >
              {block.text}
            </div>
          </Rnd>
        ))}
      </div>
    </main>
  );
}
