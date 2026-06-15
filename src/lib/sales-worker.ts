import * as XLSX from "xlsx";
import Papa from "papaparse";
import { analyze } from "./sales-analyzer";

self.onmessage = async (e: MessageEvent<{ file: File }>) => {
  try {
    const { file } = e.data;
    const ext = file.name.split(".").pop()?.toLowerCase();
    let rows: Record<string, unknown>[];

    if (ext === "csv") {
      const text = await file.text();
      const res = Papa.parse<Record<string, unknown>>(text, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
      });
      rows = res.data;
    } else {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(ws, { defval: null });
    }

    const result = analyze(rows);
    self.postMessage({ ok: true, result });
  } catch (err) {
    self.postMessage({ ok: false, error: (err as Error).message });
  }
};