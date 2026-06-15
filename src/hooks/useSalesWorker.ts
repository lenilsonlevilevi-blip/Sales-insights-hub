import { useCallback, useRef, useState } from "react";
import type { AnalysisResult } from "@/lib/sales-analyzer";

export function useSalesWorker() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const workerRef = useRef<Worker | null>(null);

  const processFile = useCallback((file: File) => {
    // Encerra worker anterior se existir
    workerRef.current?.terminate();

    setError("");
    setLoading(true);
    setResult(null);

    const worker = new Worker(
      new URL("../lib/sales-worker.ts", import.meta.url),
      { type: "module" }
    );

    workerRef.current = worker;

    worker.onmessage = (e) => {
      console.log("10 - React recebeu:", e.data);

      const { ok, result, error } = e.data;

      if (ok) {
        setResult(result);
      } else {
        setError(error ?? "Erro ao processar arquivo.");
      }

      setLoading(false);
      worker.terminate();
    };

    worker.onerror = (e) => {
      console.error("ERRO NO WORKER:", e);

      setError(e.message ?? "Erro no worker.");
      setLoading(false);
      worker.terminate();
    };

    worker.postMessage({ file });
  }, []);

  return {
    processFile,
    loading,
    error,
    result,
  };
}