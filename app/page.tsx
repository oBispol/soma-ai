"use client";

import { useCallback, useRef, useState } from "react";
import Webcam from "react-webcam";
import { createWorker } from "tesseract.js";

const CROP_RATIO = 0.4;

export default function Home() {
  const webcamRef = useRef<Webcam>(null);
  const [total, setTotal] = useState(0);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState("Alinhe a etiqueta na mira");

  const parsePrice = (text: string): number | null => {
    const matches = text.match(/(\d+)[,.](\d{2})/g);
    if (!matches) return null;

    let bestValue: number | null = null;
    for (const match of matches) {
      const normalized = match.replace(",", ".");
      const value = parseFloat(normalized);
      if (value > 0 && value < 10000) {
        if (bestValue === null || value > bestValue) {
          bestValue = value;
        }
      }
    }
    return bestValue;
  };

  const captureAndCalculate = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setStatus("Processando...");

    try {
      const video = webcamRef.current?.video;
      if (!video) {
        setStatus("Erro ao acessar câmera");
        setIsProcessing(false);
        return;
      }

      const canvas = document.createElement("canvas");
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const cropW = Math.round(vw * CROP_RATIO);
      const cropH = Math.round(vh * CROP_RATIO);
      const cropX = Math.round((vw - cropW) / 2);
      const cropY = Math.round((vh - cropH) / 2);
      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      const croppedImage = canvas.toDataURL("image/jpeg", 0.8);

      const worker = await createWorker("por");
      await worker.setParameters({
        tessedit_char_whitelist: "0123456789,.",
      });
      const { data } = await worker.recognize(croppedImage, undefined, {
        blocks: true,
      });
      const allWords = data.blocks?.flatMap(b =>
        b.paragraphs?.flatMap(p =>
          p.lines?.flatMap(l => l.words ?? [])
        ) ?? []
      ) ?? [];
      const highConfidence = allWords
        .filter((w) => w.confidence > 70)
        .map((w) => w.text)
        .join(" ");
      await worker.terminate();

      const price = parsePrice(highConfidence || data.text);
      if (price !== null) {
        setLastPrice(price);
        setTotal((prev) => prev + price);
        setStatus(`Adicionado: R$ ${price.toFixed(2)}`);
      } else {
        setStatus("Preço não encontrado. Tente novamente.");
      }
    } catch {
      setStatus("Erro ao processar imagem");
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing]);

  const resetTotal = () => {
    setTotal(0);
    setLastPrice(null);
    setStatus("Total zerado");
  };

  return (
    <div className="relative h-full w-full bg-black">
      <Webcam
        ref={webcamRef}
        audio={false}
        screenshotFormat="image/jpeg"
        screenshotQuality={0.8}
        videoConstraints={{
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        }}
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Overlay escuro com mira */}
      <div className="pointer-events-none absolute inset-0">
        {/* Bordas escuras */}
        <div className="absolute inset-0 bg-black/40" />

        {/* Mira central transparente */}
        <div className="absolute left-1/2 top-1/2 h-48 w-64 -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-white/80 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />

        {/* Texto de orientação */}
        <div className="absolute left-1/2 top-[calc(50%+120px)] -translate-x-1/2 text-center">
          <p className="text-sm text-white/70">{status}</p>
        </div>
      </div>

      {/* Header */}
      <div className="absolute left-0 right-0 top-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
        <h1 className="text-center text-xl font-bold text-green-400">
          SomaAI
        </h1>
      </div>

      {/* Painel inferior */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/90 to-transparent p-6 pt-12">
        {/* Total */}
        <div className="mb-4 text-center">
          <p className="text-sm text-white/60">Total Estimado</p>
          <p className="text-4xl font-bold text-green-400">
            R$ {total.toFixed(2)}
          </p>
          {lastPrice !== null && (
            <p className="mt-1 text-xs text-white/40">
              Último item: R$ {lastPrice.toFixed(2)}
            </p>
          )}
        </div>

        {/* Botões */}
        <div className="flex gap-4">
          <button
            onClick={resetTotal}
            className="flex-1 rounded-full bg-white/10 py-4 text-lg font-semibold text-white transition-colors hover:bg-white/20 active:scale-95"
          >
            Zerar
          </button>
          <button
            onClick={captureAndCalculate}
            disabled={isProcessing}
            className="flex-1 rounded-full bg-green-500 py-4 text-lg font-semibold text-white transition-colors hover:bg-green-600 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          >
            {isProcessing ? "Lendo..." : "Somar Item"}
          </button>
        </div>
      </div>
    </div>
  );
}
