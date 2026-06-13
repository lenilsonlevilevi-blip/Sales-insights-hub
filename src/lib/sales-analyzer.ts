import * as XLSX from "xlsx";
import Papa from "papaparse";

export type SalesRow = {
  data: Date;
  produto: string;
  bairro: string;
  valor: number;
  quantidade: number;
  custoUnitario: number;
  codigo: string;
  cliente: string;
  formaPagamento: string;
  vendedor: string;
  categoria: string;
};

export type AnalysisResultado = {
  pct_desconto: number;
  pct_premium: number;
  receita: number;
  ticket_medio: number;
  vendas: number;
  vendedor: string;
};

export type AnalysisResult = {
  rows: SalesRow[];
  totalVendas: number;
  totalReceita: number;
  totalPedidos: number;
  ticketMedio: number;
  totalQuantidade: number;
  clientesUnicos: number;
  vendedoresUnicos: number;
  missingColumns: string[];
  porMes: { name: string; total: number }[];
  porAno: { name: string; total: number }[];
  porPeriodo: { name: string; total: number }[];
  porBairro: { name: string; value: number }[];
  porCategoria: { name: string; total: number }[];
  qtdPorCategoria: { name: string; total: number }[];
  porVendedor: { name: string; total: number }[];
  porFormaPagamento: { name: string; value: number }[];
  topProdutos: { name: string; total: number }[];
  curvaABC: {
    produto: string;
    receita: number;
    participacao: number;
    acumulado: number;
    classe: "A" | "B" | "C";
  }[];
};

const norm = (s: string) =>
  s
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const FIELD_MAP: Record<keyof SalesRow, string[]> = {
  data: ["data da venda", "data_venda", "datavenda", "data", "date", "dt", "dia"],
  produto: ["produto", "product", "item", "descricao", "nome"],
  bairro: ["bairro", "neighborhood", "regiao", "zona", "district"],
  valor: ["total", "valor total", "valor", "preco", "price", "receita", "amount", "value"],
  quantidade: ["quantidade", "qtd", "qty", "quantity", "qnt"],
  custoUnitario: ["custo unitario", "custo_unitario", "custounitario", "custo", "preco unitario", "valor unitario"],
  codigo: ["codigo", "numero", "codigo/numero", "code", "id", "n", "nro", "nr"],
  cliente: ["cliente", "customer", "comprador", "client"],
  formaPagamento: ["forma de pagamento", "forma_pagamento", "formapagamento", "pagamento", "payment"],
  vendedor: ["vendedor", "seller", "salesperson", "vendedora"],
  categoria: ["categoria", "category", "tipo", "segmento"],
};

function pickKey(headers: string[], candidates: string[]): string | undefined {
  const map = new Map(headers.map((h) => [norm(h), h]));
  for (const c of candidates) if (map.has(c)) return map.get(c);
  for (const c of candidates) {
    for (const [k, v] of map) if (k.includes(c)) return v;
  }
  return undefined;
}

function parseDate(v: unknown): Date | null {
  if (v instanceof Date) return v;
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return new Date(d.y, d.m - 1, d.d);
  }
  if (typeof v === "string") {
    const s = v.trim();
    const br = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
    if (br) {
      let [, d, m, y] = br;
      if (y.length === 2) y = "20" + y;
      return new Date(+y, +m - 1, +d);
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function parseNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const cleaned = v
      .replace(/[R$\s]/g, "")
      .replace(/\./g, "")
      .replace(",", ".");
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

export async function parseFile(file: File): Promise<Record<string, unknown>[]> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv") {
    const text = await file.text();
    const res = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });
    return res.data;
  }
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: null });
}

const REQUIRED_LABELS: Record<keyof SalesRow, string> = {
  data: "Data da Venda",
  produto: "Produto",
  custoUnitario: "Custo Unitário",
  codigo: "Código/Número",
  cliente: "Cliente",
  quantidade: "Quantidade",
  formaPagamento: "Forma de Pagamento",
  valor: "Total",
  vendedor: "Vendedor",
  categoria: "Categoria",
  bairro: "Bairro",
};

export function analyze(rows: Record<string, unknown>[]): AnalysisResult {
  if (!rows.length) throw new Error("Planilha vazia.");
  const headers = Object.keys(rows[0]);
  const keys = {} as Record<keyof SalesRow, string | undefined>;
  (Object.keys(FIELD_MAP) as (keyof SalesRow)[]).forEach((k) => {
    keys[k] = pickKey(headers, FIELD_MAP[k]);
  });

  if (!keys.valor && !keys.custoUnitario) {
    throw new Error(
      `Não foi possível identificar coluna de valor/total. Colunas detectadas: ${headers.join(", ")}`,
    );
  }
  if (!keys.produto) {
    throw new Error(`Coluna de Produto não encontrada. Colunas detectadas: ${headers.join(", ")}`);
  }

  const missingColumns = (Object.keys(REQUIRED_LABELS) as (keyof SalesRow)[])
    .filter((k) => k !== "bairro" && !keys[k])
    .map((k) => REQUIRED_LABELS[k]);

  const parsed: SalesRow[] = rows
    .map((r) => {
      const qtd = keys.quantidade ? parseNumber(r[keys.quantidade]) || 1 : 1;
      const custo = keys.custoUnitario ? parseNumber(r[keys.custoUnitario]) : 0;
      const total = keys.valor ? parseNumber(r[keys.valor]) : custo * qtd;
      return {
        data: keys.data ? (parseDate(r[keys.data]) ?? new Date(NaN)) : new Date(NaN),
        produto: String(r[keys.produto!] ?? "Sem nome").trim() || "Sem nome",
        bairro: keys.bairro ? String(r[keys.bairro] ?? "Não informado").trim() || "Não informado" : "Não informado",
        valor: total,
        quantidade: Math.round(qtd),
        custoUnitario: custo,
        codigo: keys.codigo ? String(r[keys.codigo] ?? "").trim() : "",
        cliente: keys.cliente ? String(r[keys.cliente] ?? "").trim() : "",
        formaPagamento: keys.formaPagamento
          ? String(r[keys.formaPagamento] ?? "Não informado").trim() || "Não informado"
          : "Não informado",
        vendedor: keys.vendedor
          ? String(r[keys.vendedor] ?? "Não informado").trim() || "Não informado"
          : "Não informado",
        categoria: keys.categoria
          ? String(r[keys.categoria] ?? "Sem categoria").trim() || "Sem categoria"
          : "Sem categoria",
      };
    })
    .filter((r) => r.valor > 0);

  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const porMesMap = new Map<number, number>();
  const porAnoMap = new Map<number, number>();
  const porPeriodoMap = new Map<string, number>();
  const bairroMap = new Map<string, number>();
  const produtoMap = new Map<string, number>();
  const produtoQtdMap = new Map<string, number>();
  const categoriaMap = new Map<string, number>();
  const categoriaQtdMap = new Map<string, number>();
  const vendedorMap = new Map<string, number>();
  const pagamentoMap = new Map<string, number>();
  const clientesSet = new Set<string>();
  const vendedoresSet = new Set<string>();

  for (const r of parsed) {
    if (!isNaN(r.data.getTime())) {
      porMesMap.set(r.data.getMonth(), (porMesMap.get(r.data.getMonth()) || 0) + r.valor);
      porAnoMap.set(r.data.getFullYear(), (porAnoMap.get(r.data.getFullYear()) || 0) + r.valor);
      const key = `${r.data.getFullYear()}-${String(r.data.getMonth() + 1).padStart(2, "0")}`;
      porPeriodoMap.set(key, (porPeriodoMap.get(key) || 0) + r.valor);
    }
    bairroMap.set(r.bairro, (bairroMap.get(r.bairro) || 0) + r.valor);
    produtoMap.set(r.produto, (produtoMap.get(r.produto) || 0) + r.valor);
    produtoQtdMap.set(r.produto, (produtoQtdMap.get(r.produto) || 0) + r.quantidade);
    categoriaMap.set(r.categoria, (categoriaMap.get(r.categoria) || 0) + r.valor);
    categoriaQtdMap.set(r.categoria, (categoriaQtdMap.get(r.categoria) || 0) + r.quantidade);
    vendedorMap.set(r.vendedor, (vendedorMap.get(r.vendedor) || 0) + r.valor);
    pagamentoMap.set(r.formaPagamento, (pagamentoMap.get(r.formaPagamento) || 0) + r.valor);
    if (r.cliente) clientesSet.add(r.cliente.toLowerCase());
    if (r.vendedor && r.vendedor !== "Não informado") vendedoresSet.add(r.vendedor.toLowerCase());
  }

  const porMes = meses.map((name, i) => ({ name, total: +(porMesMap.get(i) || 0).toFixed(2) }));
  const porAno = [...porAnoMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([y, t]) => ({ name: String(y), total: +t.toFixed(2) }));
  const porPeriodo = [...porPeriodoMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, t]) => ({ name: k, total: +t.toFixed(2) }));
  const porBairro = [...bairroMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value: +value.toFixed(2) }));
  const porCategoria = [...categoriaMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, total]) => ({ name, total: +total.toFixed(2) }));
  const qtdPorCategoria = [...categoriaQtdMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, total]) => ({ name, total: +total.toFixed(2) }));
  const porVendedor = [...vendedorMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, total]) => ({ name, total: +total.toFixed(2) }));
  const porFormaPagamento = [...pagamentoMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value: +value.toFixed(2) }));
  const topProdutos = [...produtoQtdMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, total]) => ({ name, total: +total.toFixed(2) }));

  const totalReceita = parsed.reduce((s, r) => s + r.valor, 0);
  const totalQuantidade = parsed.reduce((s, r) => s + r.quantidade, 0);
  const sortedProd = [...produtoMap.entries()].sort((a, b) => b[1] - a[1]);
  let acc = 0;
  const curvaABC = sortedProd.map(([produto, receita]) => {
    const part = receita / totalReceita;
    acc += part;
    const classe: "A" | "B" | "C" = acc <= 0.8 ? "A" : acc <= 0.95 ? "B" : "C";
    return {
      produto,
      receita: +receita.toFixed(2),
      participacao: +(part * 100).toFixed(2),
      acumulado: +(acc * 100).toFixed(2),
      classe,
    };
  });

  return {
    rows: parsed,
    totalVendas: parsed.length,
    totalReceita: +totalReceita.toFixed(2),
    totalPedidos: parsed.length,
    ticketMedio: +(totalReceita / parsed.length).toFixed(2),
    totalQuantidade,
    clientesUnicos: clientesSet.size,
    vendedoresUnicos: vendedoresSet.size,
    missingColumns,
    porMes,
    porAno,
    porPeriodo,
    porBairro,
    porCategoria,
    qtdPorCategoria,
    porVendedor,
    porFormaPagamento,
    topProdutos,
    curvaABC,
  };
}

export const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
