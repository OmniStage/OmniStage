import { NextResponse } from "next/server";

export async function GET() {
  const XLSX = await import("xlsx");

  const wb = XLSX.utils.book_new();

  // Row 1: section headers
  const sectionRow = [
    "01 - Dados do convidado", "", "",
    "02 - Perfil do convidado", "", "", "", "", "", "", "", "", "", "",
  ];

  // Row 2: column names
  const headerRow = [
    "Nome", "Telefone", "email",
    "Criança", "Idade Criança", "tipo_contato",
    "Nome Responsável", "Telefone Responsável",
    "Tipo de Núcleo", "Núcleo",
    "Relação com o Núcleo", "Relação do Responsável com o Núcleo",
    "Relação com o Evento", "Recebe Comunicação", "Contato Principal",
  ];

  const ws = XLSX.utils.aoa_to_sheet([sectionRow, headerRow]);

  // Merge section label cells
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },   // 01 - Dados do convidado
    { s: { r: 0, c: 3 }, e: { r: 0, c: 14 } },   // 02 - Perfil do convidado
  ];

  // Column widths
  ws["!cols"] = [
    { wch: 28 }, // Nome
    { wch: 18 }, // Telefone
    { wch: 24 }, // email
    { wch: 10 }, // Criança
    { wch: 14 }, // Idade Criança
    { wch: 14 }, // tipo_contato
    { wch: 22 }, // Nome Responsável
    { wch: 22 }, // Telefone Responsável
    { wch: 16 }, // Tipo de Núcleo
    { wch: 22 }, // Núcleo
    { wch: 24 }, // Relação com o Núcleo
    { wch: 34 }, // Relação do Responsável com o Núcleo
    { wch: 22 }, // Relação com o Evento
    { wch: 20 }, // Recebe Comunicação
    { wch: 18 }, // Contato Principal
  ];

  // Style section header cells
  const sectionStyle = {
    font: { bold: true, sz: 11 },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin" }, bottom: { style: "thin" },
      left: { style: "thin" }, right: { style: "thin" },
    },
  };

  const headerStyle = {
    font: { bold: true, sz: 10 },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin" }, bottom: { style: "thin" },
      left: { style: "thin" }, right: { style: "thin" },
    },
  };

  // Apply styles to section row
  const cols = "ABCDEFGHIJKLMNO".split("");
  for (let i = 0; i < cols.length; i++) {
    const sectionCell = `${cols[i]}1`;
    const headerCell = `${cols[i]}2`;
    if (!ws[sectionCell]) ws[sectionCell] = { t: "s", v: "" };
    if (!ws[headerCell]) ws[headerCell] = { t: "s", v: "" };
    ws[sectionCell].s = {
      ...sectionStyle,
      fill: { fgColor: { rgb: i < 3 ? "CCFFCC" : "FFFFCC" } },
    };
    ws[headerCell].s = { ...headerStyle };
  }

  XLSX.utils.book_append_sheet(wb, ws, "Convidados");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="modelo-convidados-omnistage.xlsx"',
    },
  });
}
