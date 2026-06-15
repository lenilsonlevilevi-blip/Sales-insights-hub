import * as XLSX from "xlsx";
import Papa from "papaparse";
import { analyze } from "./sales-analyzer";

self.onmessage = async (e: MessageEvent<{ file: File }>) => {
  console.log("1 - Worker iniciado");

  try {
    const { file } = e.data;

    console.log("2 - Arquivo recebido:", file.name);

    const ext = file.name.split(".").pop()?.toLowerCase();

    let rows: Record<string, unknown>[];

    if (ext === "csv") {
      console.log("3 - Lendo CSV");

      const text = await file.text();

      const res = Papa.parse<Record<string, unknown>>(text, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
      });

      rows = res.data;
    } else {
      console.log("3 - Lendo XLSX");

      const buf = await file.arrayBuffer();

      console.log("4 - Buffer carregado");

      const wb = XLSX.read(buf, {
        type: "array",
        cellDates: true,
      });

      console.log("5 - Workbook criado");

      const ws = wb.Sheets[wb.SheetNames[0]];

      rows = XLSX.utils.sheet_to_json(ws, {
        defval: null,
      });

      console.log("6 - Linhas:", rows.length);
    }

    console.log("7 - Iniciando analyze");

    const result = analyze(rows);

    console.log("8 - Analyze concluído");

    self.postMessage({
      ok: true,
      result,
    });

    console.log("9 - Resultado enviado");
  } catch (err) {
    console.error("ERRO NO WORKER:", err);

    self.postMessage({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
