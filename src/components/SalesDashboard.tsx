import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Upload,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Trophy,
  BarChart3,
  Users,
  UserCheck,
  Package,
  AlertTriangle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { analyze, formatCurrency, parseFile, type AnalysisResult, type SalesRow } from "@/lib/sales-analyzer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "oklch(0.6 0.2 30)",
  "oklch(0.65 0.18 200)",
  "oklch(0.7 0.2 100)",
];

export function SalesDashboard() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<string>("");

  useEffect(() => {
    const controller = new AbortController();
    const PYTHON_API_URL = "https://gymapi-sfss.onrender.com/sellers";

    fetch(PYTHON_API_URL, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        console.log("[Python API] resposta:", data);
        setApiStatus("conectado");
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.warn("[Python API] erro de conexão:", err);
        setApiStatus("offline");
      });

    return () => controller.abort();
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setError("");
    setLoading(true);
    try {
      const rows = await parseFile(file);
      const r = analyze(rows);
      setResult(r);
      setFileName(file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao processar arquivo.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-subtle)" }}>
      <header className="border-b border-border/60 bg-background/70 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-primary-foreground"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}
            >
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">Sales Insight</h1>
              <p className="text-xs text-muted-foreground">Análise inteligente de vendas</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {apiStatus && (
              <span className="text-xs text-muted-foreground">
                API Python: <strong className="text-foreground">{apiStatus}</strong>
              </span>
            )}
            {result && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setResult(null);
                  setFileName("");
                }}
              >
                Nova análise
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        {!result ? (
          <UploadZone onInput={onInput} onDrop={onDrop} loading={loading} error={error} />
        ) : (
          <Dashboard result={result} fileName={fileName} />
        )}
      </main>
    </div>
  );
}

function UploadZone({
  onInput,
  onDrop,
  loading,
  error,
}: {
  onInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent) => void;
  loading: boolean;
  error: string;
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-10 text-center">
        <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Transforme suas vendas em{" "}
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>
            insights claros
          </span>
        </h2>
        <p className="mt-4 text-base text-muted-foreground">
          Envie sua planilha (.xlsx ou .csv) e obtenha gráficos de vendas por período, categoria, vendedor, formas de
          pagamento, produtos mais vendidos e curva ABC.
        </p>
      </div>

      <label
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center transition-all hover:border-primary hover:bg-accent/30"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div
          className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-primary-foreground transition-transform group-hover:scale-110"
          style={{ background: "var(--gradient-primary)" }}
        >
          {loading ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
          ) : (
            <Upload className="h-7 w-7" />
          )}
        </div>
        <p className="text-base font-medium text-foreground">
          {loading ? "Processando..." : "Clique ou arraste sua planilha"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">Formatos suportados: .xlsx, .xls, .csv</p>
        <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onInput} disabled={loading} />
      </label>

      {error && (
        <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mt-8 rounded-xl border border-border bg-card/60 p-5 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Colunas reconhecidas automaticamente:</p>
        <p className="mt-2 leading-relaxed">
          {[
            "Data da Venda",
            "Produto",
            "Custo Unitário",
            "Código/Número",
            "Cliente",
            "Quantidade",
            "Forma de Pagamento",
            "Total",
            "Vendedor",
            "Categoria",
          ].map((c) => (
            <code key={c} className="mr-1 inline-block rounded bg-muted px-1.5 py-0.5 text-xs">
              {c}
            </code>
          ))}
        </p>
      </div>
    </div>
  );
}

function Dashboard({ result, fileName }: { result: AnalysisResult; fileName: string }) {
  const stats = [
    { label: "Total de vendas", value: result.totalVendas.toLocaleString("pt-BR"), icon: ShoppingBag },
    { label: "Faturamento total", value: formatCurrency(result.totalReceita), icon: TrendingUp },
    { label: "Itens vendidos", value: result.totalQuantidade.toLocaleString("pt-BR"), icon: Package },
    { label: "Ticket médio", value: formatCurrency(result.ticketMedio), icon: Trophy },
    { label: "Clientes únicos", value: result.clientesUnicos.toLocaleString("pt-BR"), icon: Users },
    { label: "Vendedores", value: result.vendedoresUnicos.toLocaleString("pt-BR"), icon: UserCheck },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <FileSpreadsheet className="h-4 w-4" />
        {fileName}
      </div>

      {result.missingColumns.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
          <div>
            <p className="font-medium text-foreground">Algumas colunas não foram encontradas</p>
            <p className="mt-1 text-muted-foreground">
              Faltando: <strong>{result.missingColumns.join(", ")}</strong>. Os dados disponíveis foram processados
              normalmente.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <Card key={s.label} className="p-5" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{s.value}</p>
          </Card>
        ))}
      </div>

      <CategoriaBI rows={result.rows} />

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Vendas por período" subtitle="Receita acumulada por mês (Data da Venda)">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={result.porPeriodo.length ? result.porPeriodo : result.porMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(v: number) => formatCurrency(v)}
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
              />
              <Bar dataKey="total" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>


        <ChartCard title="Faturamento por vendedor" subtitle="Receita acumulada por vendedor">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={result.porVendedor.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                type="number"
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              />
              <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={11} width={120} />
              <Tooltip
                formatter={(v: number) => formatCurrency(v)}
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
              />
              <Bar dataKey="total" fill="var(--chart-2)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Formas de pagamento" subtitle="Distribuição da receita por método">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={result.porFormaPagamento}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(e: { name: string }) => e.name}
              >
                {result.porFormaPagamento.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number) => formatCurrency(v)}
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Produtos mais vendidos" subtitle="Top 5 produtos por quantidade">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={result.topProdutos} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={11} width={140} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
              />
              <Bar dataKey="total" fill="var(--chart-3)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Quantidade por categoria" subtitle="Unidades vendidas por categoria">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={result.qtdPorCategoria.slice(0, 8)}
                dataKey="total"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(e: { name: string }) => e.name}
              >
                {result.qtdPorCategoria.slice(0, 8).map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Curva ABC" subtitle="Classificação de produtos por participação na receita">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">#</th>
                <th className="pb-2 pr-4 font-medium">Produto</th>
                <th className="pb-2 pr-4 text-right font-medium">Receita</th>
                <th className="pb-2 pr-4 text-right font-medium">Participação</th>
                <th className="pb-2 pr-4 text-right font-medium">Acumulado</th>
                <th className="pb-2 text-center font-medium">Classe</th>
              </tr>
            </thead>
            <tbody>
              {result.curvaABC.slice(0, 30).map((row, i) => (
                <tr key={row.produto} className="border-b border-border/50 last:border-0">
                  <td className="py-2 pr-4 text-muted-foreground">{i + 1}</td>
                  <td className="py-2 pr-4 font-medium text-foreground">{row.produto}</td>
                  <td className="py-2 pr-4 text-right text-foreground">{formatCurrency(row.receita)}</td>
                  <td className="py-2 pr-4 text-right text-muted-foreground">{row.participacao.toFixed(2)}%</td>
                  <td className="py-2 pr-4 text-right text-muted-foreground">{row.acumulado.toFixed(2)}%</td>
                  <td className="py-2 text-center">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        row.classe === "A"
                          ? "bg-primary/15 text-primary"
                          : row.classe === "B"
                            ? "bg-chart-3/15 text-foreground"
                            : "bg-muted text-muted-foreground"
                      }`}
                      style={
                        row.classe === "B"
                          ? { background: "oklch(0.72 0.2 50 / 0.15)", color: "oklch(0.5 0.2 50)" }
                          : undefined
                      }
                    >
                      {row.classe}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {result.curvaABC.length > 30 && (
            <p className="mt-3 text-xs text-muted-foreground">Mostrando 30 de {result.curvaABC.length} produtos.</p>
          )}
        </div>
      </ChartCard>
    </div>
  );
}

type PeriodType = "diario" | "semanal" | "mensal";

const PERIOD_LABEL: Record<PeriodType, string> = {
  diario: "Diário",
  semanal: "Semanal",
  mensal: "Mensal",
};

function periodKey(d: Date, p: PeriodType): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  if (p === "mensal") return `${y}-${m}`;
  if (p === "diario") return `${y}-${m}-${String(d.getDate()).padStart(2, "0")}`;
  // semanal: ISO week-ish — year-Www based on Monday
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-S${String(week).padStart(2, "0")}`;
}

function CategoriaBI({ rows }: { rows: SalesRow[] }) {
  const [period, setPeriod] = useState<PeriodType>("mensal");
  const [categoria, setCategoria] = useState<string>("__ALL__");

  const validRows = useMemo(() => rows.filter((r) => !isNaN(r.data.getTime())), [rows]);

  const categorias = useMemo(() => {
    const s = new Set<string>();
    validRows.forEach((r) => s.add(r.categoria));
    return [...s].sort();
  }, [validRows]);

  // Build chart data
  const { chartData, categoriesShown } = useMemo(() => {
    const filtered = categoria === "__ALL__" ? validRows : validRows.filter((r) => r.categoria === categoria);
    const cats = categoria === "__ALL__" ? categorias : [categoria];
    const keysMap = new Map<string, Record<string, number | string>>();
    for (const r of filtered) {
      const k = periodKey(r.data, period);
      if (!keysMap.has(k)) {
        const base: Record<string, number | string> = { name: k, __total: 0 };
        cats.forEach((c) => (base[c] = 0));
        keysMap.set(k, base);
      }
      const obj = keysMap.get(k)!;
      obj[r.categoria] = ((obj[r.categoria] as number) || 0) + r.valor;
      obj.__total = ((obj.__total as number) || 0) + r.valor;
    }
    const data = [...keysMap.values()].sort((a, b) => String(a.name).localeCompare(String(b.name)));
    return { chartData: data, categoriesShown: cats };
  }, [validRows, categorias, categoria, period]);

  // KPIs current vs previous period (entire window vs equal previous window)
  const kpis = useMemo(() => {
    const filtered = categoria === "__ALL__" ? validRows : validRows.filter((r) => r.categoria === categoria);
    if (!filtered.length) {
      return { receitaAtual: 0, receitaAnterior: 0, vendas: 0, ticket: 0, diffPct: 0, diffAbs: 0 };
    }
    const sorted = [...filtered].sort((a, b) => a.data.getTime() - b.data.getTime());
    const first = sorted[0].data.getTime();
    const last = sorted[sorted.length - 1].data.getTime();
    const span = Math.max(last - first, 86400000);
    const prevStart = first - span;
    const atual = sorted.filter((r) => r.data.getTime() >= first);
    // "previous period" = equal-length window immediately before; we only have data inside [first,last]
    // so we use the first half vs second half if no real previous data exists
    let anteriorRows: SalesRow[];
    const hasPrev = false; // we don't have data before `first` by definition
    if (hasPrev) {
      anteriorRows = sorted.filter((r) => r.data.getTime() >= prevStart && r.data.getTime() < first);
    } else {
      const mid = first + span / 2;
      anteriorRows = sorted.filter((r) => r.data.getTime() < mid);
    }
    const atualRows = hasPrev ? atual : sorted.filter((r) => r.data.getTime() >= first + span / 2);
    const receitaAtual = atualRows.reduce((s, r) => s + r.valor, 0);
    const receitaAnterior = anteriorRows.reduce((s, r) => s + r.valor, 0);
    const vendas = atualRows.length;
    const ticket = vendas ? receitaAtual / vendas : 0;
    const diffAbs = receitaAtual - receitaAnterior;
    const diffPct = receitaAnterior ? (diffAbs / receitaAnterior) * 100 : 0;
    return { receitaAtual, receitaAnterior, vendas, ticket, diffPct, diffAbs };
  }, [validRows, categoria]);

  const isUp = kpis.diffPct >= 0;

  return (
    <Card className="p-6" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Faturamento por categoria — Análise BI</h3>
          <p className="text-xs text-muted-foreground">Evolução temporal com comparativo de período</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="diario">Diário</SelectItem>
              <SelectItem value="semanal">Semanal</SelectItem>
              <SelectItem value="mensal">Mensal</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">Todas as Categorias</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card/60 p-4">
          <p className="text-xs font-medium text-muted-foreground">Faturamento Total</p>
          <p className="mt-1 text-xl font-bold text-foreground">{formatCurrency(kpis.receitaAtual)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Anterior: {formatCurrency(kpis.receitaAnterior)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card/60 p-4">
          <p className="text-xs font-medium text-muted-foreground">Quantidade de Vendas</p>
          <p className="mt-1 text-xl font-bold text-foreground">{kpis.vendas.toLocaleString("pt-BR")}</p>
        </div>
        <div className="rounded-lg border border-border bg-card/60 p-4">
          <p className="text-xs font-medium text-muted-foreground">Ticket Médio</p>
          <p className="mt-1 text-xl font-bold text-foreground">{formatCurrency(kpis.ticket)}</p>
        </div>
      </div>

      <div
        className={`mb-4 flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm ${
          isUp ? "border-emerald-500/40 bg-emerald-500/10" : "border-red-500/40 bg-red-500/10"
        }`}
      >
        {isUp ? (
          <TrendingUp className="h-4 w-4 text-emerald-600" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-600" />
        )}
        <span className="font-medium text-foreground">
          {isUp ? "Crescimento" : "Queda"} em relação ao período anterior: {isUp ? "+" : ""}
          {kpis.diffPct.toFixed(1)}%
        </span>
        <span className="text-muted-foreground">
          (Diferença: {isUp ? "+" : ""}
          {formatCurrency(kpis.diffAbs)})
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">Evolução do faturamento</h4>
            <span className="text-xs text-muted-foreground">{PERIOD_LABEL[period]}</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                cursor={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.2 }}
                formatter={(v: number) => [formatCurrency(v), "Faturamento"]}
                labelFormatter={(l) => `Período: ${l}`}
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              />
              <Area
                type="monotone"
                dataKey="__total"
                name="Faturamento"
                stroke="var(--chart-1)"
                strokeWidth={2.5}
                fill="url(#fillTotal)"
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">Composição por categoria</h4>
            <span className="text-xs text-muted-foreground">Empilhado</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", fillOpacity: 0.3 }}
                formatter={(v: number, n: string) => [formatCurrency(v), n]}
                labelFormatter={(l) => `Período: ${l}`}
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
              {categoriesShown.map((c, i) => (
                <Bar
                  key={c}
                  dataKey={c}
                  stackId="cat"
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  radius={i === categoriesShown.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Período: <strong className="text-foreground">{PERIOD_LABEL[period]}</strong> · Comparativo entre a segunda
        metade e a primeira metade do intervalo dos dados.
      </p>

    </Card>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <Card className="p-6" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="mb-4">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </Card>
  );
}
