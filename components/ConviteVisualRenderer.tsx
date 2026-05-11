"use client";

import type { CSSProperties } from "react";

export type ConviteBlock = {
  id: string;
  type: string;
  content: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  font_size: number;
  font_family: string;
  color: string;
  background: string | null;
  border_radius: number;
  z_index: number;
  visible: boolean;
};

type Props = {
  blocks: ConviteBlock[];
  backgroundUrl?: string;
  logoUrl?: string;
  width?: number;
  height?: number;
  scale?: number;
  backgroundX?: number;
  backgroundY?: number;
  backgroundScale?: number;
  backgroundOpacity?: number;
  glassOpacity?: number;
  glassBlur?: number;
  glassTone?: "light" | "dark";
};

export default function ConviteVisualRenderer({
  blocks,
  backgroundUrl = "",
  logoUrl = "",
  width = 430,
  height = 920,
  scale = 1,
  backgroundX = 0,
  backgroundY = 0,
  backgroundScale = 1,
  backgroundOpacity = 1,
  glassOpacity = 0.18,
  glassBlur = 0,
  glassTone = "dark",
}: Props) {
  return (
    <div
      style={{
        width: width * scale,
        height: height * scale,
        overflow: "hidden",
        position: "relative",
        borderRadius: 24,
      }}
    >
      <div
        style={{
          width,
          height,
          position: "absolute",
          left: 0,
          top: 0,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          overflow: "hidden",
          background:
            "radial-gradient(circle at 50% 0%, rgba(255,255,255,.11), transparent 30%), linear-gradient(180deg,#0b1530,#211f63)",
        }}
      >
        {backgroundUrl && (
          <img
            src={backgroundUrl}
            alt=""
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width,
              height,
              objectFit: "cover",
              transform: `translate(calc(-50% + ${backgroundX}px), calc(-50% + ${backgroundY}px)) scale(${backgroundScale})`,
              opacity: backgroundOpacity,
              zIndex: 0,
            }}
          />
        )}

        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            background:
              glassTone === "light"
                ? `rgba(255,255,255,${glassOpacity})`
                : `rgba(2,6,23,${glassOpacity})`,
            backdropFilter: glassBlur
              ? `blur(${glassBlur}px)`
              : "none",
          }}
        />

        {blocks
          .filter((b) => b.visible !== false)
          .sort((a, b) => a.z_index - b.z_index)
          .map((block) => {
            const shared: CSSProperties = {
              position: "absolute",
              left: block.x,
              top: block.y,
              width: block.width,
              height: block.height,
              zIndex: block.z_index + 10,
              boxSizing: "border-box",
              borderRadius: block.border_radius,
              color: block.color,
              background: block.background || "transparent",
              fontFamily: block.font_family,
              fontSize: block.font_size,
              fontWeight: 900,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              lineHeight: 1.12,
              padding: block.type === "divider" ? 0 : 8,
              whiteSpace: "pre-wrap",
            };

            if (block.type === "logo") {
              return (
                <div
                  key={block.id}
                  style={{
                    ...shared,
                    background: "transparent",
                    overflow: "visible",
                  }}
                >
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        display: "block",
                      }}
                    />
                  ) : null}
                </div>
              );
            }

            if (block.type === "divider") {
              return <div key={block.id} style={shared} />;
            }

            if (block.type === "qr") {
              return (
                <div key={block.id} style={shared}>
                  <div
                    style={{
                      width: "78%",
                      height: "78%",
                      borderRadius: 8,
                      background:
                        "linear-gradient(90deg,#111 10px,transparent 10px) 0 0/22px 22px, linear-gradient(#111 10px,transparent 10px) 0 0/22px 22px, #fff",
                    }}
                  />
                </div>
              );
            }

            return (
              <div key={block.id} style={shared}>
                {block.content}
              </div>
            );
          })}
      </div>
    </div>
  );
}
