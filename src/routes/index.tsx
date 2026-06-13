import { createFileRoute } from "@tanstack/react-router";
import { SalesDashboard } from "@/components/SalesDashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sales Insight — Análise de Vendas" },
      { name: "description", content: "Envie sua planilha e visualize gráficos de vendas mensais, anuais, por bairro, top produtos e curva ABC." },
      { property: "og:title", content: "Sales Insight — Análise de Vendas" },
      { property: "og:description", content: "Análise inteligente de vendas a partir de planilhas Excel ou CSV." },
    ],
  }),
  component: SalesDashboard,
});
