"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { createWorker } from "tesseract.js";

export default function Home() {
  const webcamRef = useRef<Webcam>(null);
  const workerRef = useRef<Awaited<ReturnType<typeof createWorker>> | null>(null);
  const [total, setTotal] = useState(0);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState("Iniciando OCR...");

  useEffect(() => {
    (async () => {
      try {
        const worker = await createWorker("por");
        await worker.setParameters({
          tessedit_char_whitelist: "0123456789,.",
        });
        workerRef.current = worker;
        setStatus("Alinhe a etiqueta na mira");
      } catch {
        setStatus("Erro ao iniciar OCR");
      }
    })();
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const parsePrice = (text: string): number | null => {
    const commaMatches = text.match(/(\d+),(\d{1,2})\b/g);
    if (commaMatches) {
      for (const m of commaMatches.reverse()) {
        const value = parseFloat(m.replace(",", "."));
        if (value > 0 && value < 10000) return value;
      }
    }

    const dotMatches = text.match(/(\d+)\.(\d{1,2})\b/g);
    if (dotMatches) {
      for (const m of dotMatches.reverse()) {
        const value = parseFloat(m);
        if (value > 0 && value < 10000) return value;
      }
    }

    const rawNumbers = text.match(/\d{3,}/g);
    if (rawNumbers) {
      for (const n of rawNumbers.reverse()) {
        const intPart = n.slice(0, -2);
        const decPart = n.slice(-2);
        const value = parseFloat(`${intPart}.${decPart}`);
        if (value > 0 && value < 10000) return value;
      }
    }

    return null;
  };

  const preprocessImage = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d")!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    for (let i = 0; i < pixels.length; i += 4) {
      const gray = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
      const value = gray > 140 ? 255 : 0;
      pixels[i] = value;
      pixels[i + 1] = value;
      pixels[i + 2] = value;
    }
    ctx.putImageData(imageData, 0, 0);
  };

  const captureAndCalculate = useCallback(async () => {
    if (isProcessing || !workerRef.current) return;
    setIsProcessing(true);
    setStatus("Processando...");

    try {
      const video = webcamRef.current?.video;
      if (!video) {
        setStatus("Erro ao acessar câmera");
        setIsProcessing(false);
        return;
      }

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const rect = video.getBoundingClientRect();
      const rw = rect.width;
      const rh = rect.height;

      const coverScale = Math.max(rw / vw, rh / vh);
      const displayedW = vw * coverScale;
      const displayedH = vh * coverScale;
      const offsetX = (rw - displayedW) / 2;
      const offsetY = (rh - displayedH) / 2;

      const crossW = 256;
      const crossH = 192;
      const cx = rw / 2;
      const cy = rh / 2;

      const cropX = Math.max(0, Math.round((cx - crossW / 2 - offsetX) / coverScale));
      const cropY = Math.max(0, Math.round((cy - crossH / 2 - offsetY) / coverScale));
      const cropW = Math.min(vw - cropX, Math.round(crossW / coverScale));
      const cropH = Math.min(vh - cropY, Math.round(crossH / coverScale));

      const canvas = document.createElement("canvas");
      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      preprocessImage(canvas);
      const processedImage = canvas.toDataURL("image/jpeg", 0.9);

      const { data } = await workerRef.current.recognize(processedImage, undefined, {
        blocks: true,
      });

      const allWords = data.blocks?.flatMap(b =>
        b.paragraphs?.flatMap(p =>
          p.lines?.flatMap(l => l.words ?? [])
        ) ?? []
      ) ?? [];

      const highConfWords = allWords.filter(w => w.confidence > 70);
      const textToParse = highConfWords.length > 0
        ? highConfWords.map(w => w.text).join(" ")
        : data.text;

      const price = parsePrice(textToParse);
      if (price !== null) {
        setLastPrice(price);
        setTotal(prev => prev + price);
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
