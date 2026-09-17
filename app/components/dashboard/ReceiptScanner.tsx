"use client";

import Image from "next/image";
import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Camera, LoaderCircle, ScanLine, X } from "lucide-react";
import { parseReceiptText } from "../../lib/receipt-parser";

export type ScannedReceiptPurchase = {
  title: string;
  amount: number;
  date: string;
  category: string;
};

type ReceiptScannerProps = {
  categories: string[];
  defaultCategory: string;
  disabled?: boolean;
  onSave: (purchase: ScannedReceiptPurchase) => Promise<boolean>;
  suggestCategory: (merchant: string) => string;
};

function todayValue() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function createDraft(defaultCategory: string) {
  return {
    title: "",
    amount: "",
    date: todayValue(),
    category: defaultCategory,
  };
}

async function prepareReceiptImage(file: File) {
  const bitmap = await createImageBitmap(file);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Kunde inte förbereda kvittobilden.");
  }

  context.filter = "grayscale(1) contrast(1.25)";
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return canvas;
}

export default function ReceiptScanner({
  categories,
  defaultCategory,
  disabled = false,
  onSave,
  suggestCategory,
}: ReceiptScannerProps) {
  const [open, setOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState(() => createDraft(defaultCategory));
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlRef = useRef("");
  const scanRequestRef = useRef(0);

  const releaseImage = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = "";
    }

    setPreviewUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const closeScanner = useCallback(() => {
    scanRequestRef.current += 1;
    releaseImage();
    setOpen(false);
    setScanning(false);
    setSaving(false);
    setProgress(0);
    setMessage("");
    setDraft(createDraft(defaultCategory));
  }, [defaultCategory, releaseImage]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeScanner();
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [closeScanner, open]);

  useEffect(() => () => {
    scanRequestRef.current += 1;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  async function scanReceipt(file: File) {
    const requestId = scanRequestRef.current + 1;
    scanRequestRef.current = requestId;
    setScanning(true);
    setProgress(0);
    setMessage("Förbereder kvittot …");

    let worker: Awaited<ReturnType<(typeof import("tesseract.js"))["createWorker"]>> | null = null;

    try {
      const canvas = await prepareReceiptImage(file);
      const { createWorker } = await import("tesseract.js");
      worker = await createWorker("swe", undefined, {
        logger: ({ progress: nextProgress }) => {
          if (requestId !== scanRequestRef.current) return;
          setProgress(Math.round(nextProgress * 100));
          setMessage("Läser butik, belopp och datum …");
        },
      });
      const result = await worker.recognize(canvas, { rotateAuto: true });
      if (requestId !== scanRequestRef.current) return;

      const parsed = parseReceiptText(result.data.text, todayValue());
      const category = suggestCategory(parsed.merchant) || defaultCategory;
      setDraft({
        title: parsed.merchant,
        amount: parsed.total === null ? "" : String(parsed.total).replace(".", ","),
        date: parsed.date,
        category: categories.includes(category) ? category : defaultCategory,
      });
      setMessage(parsed.merchant && parsed.total !== null
        ? "Kvittot är avläst. Kontrollera uppgifterna innan du sparar."
        : "Allt kunde inte läsas. Fyll i eller rätta fälten innan du sparar.");
    } catch (error) {
      console.error(error);
      if (requestId !== scanRequestRef.current) return;
      setMessage("Kvittot kunde inte läsas automatiskt. Du kan fylla i uppgifterna manuellt.");
    } finally {
      if (worker) await worker.terminate().catch(() => undefined);
      if (requestId === scanRequestRef.current) setScanning(false);
    }
  }

  async function selectReceipt(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    releaseImage();
    const nextPreviewUrl = URL.createObjectURL(file);
    previewUrlRef.current = nextPreviewUrl;
    setPreviewUrl(nextPreviewUrl);
    setDraft(createDraft(defaultCategory));
    setOpen(true);
    await scanReceipt(file);
  }

  async function saveReceipt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(draft.amount.replace(/\s/g, "").replace(",", "."));

    if (!draft.title.trim()) {
      setMessage("Kontrollera butikens namn.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Kontrollera totalbeloppet.");
      return;
    }

    if (!draft.date) {
      setMessage("Kontrollera kvittodatumet.");
      return;
    }

    setSaving(true);
    const saved = await onSave({
      title: draft.title.trim(),
      amount,
      date: draft.date,
      category: draft.category,
    });
    setSaving(false);

    if (saved) closeScanner();
  }

  return (
    <div className="receipt-scanner">
      <input
        accept="image/*"
        capture="environment"
        className="receipt-file-input"
        onChange={selectReceipt}
        ref={fileInputRef}
        type="file"
      />
      <button
        className="receipt-scan-trigger"
        disabled={disabled}
        onClick={() => fileInputRef.current?.click()}
        type="button"
      >
        <Camera size={17} /> Skanna kvitto
      </button>

      {open && (
        <div className="receipt-modal" role="dialog" aria-modal="true" aria-labelledby="receipt-modal-title">
          <div className="receipt-modal-card">
            <div className="receipt-modal-heading">
              <div>
                <span><ScanLine size={16}/> Lokal kvittoläsning</span>
                <h2 id="receipt-modal-title">Kontrollera köpet</h2>
                <p>Bilden används bara under avläsningen och sparas inte i appen.</p>
              </div>
              <button className="receipt-close" onClick={closeScanner} type="button" aria-label="Stäng kvittoskanner"><X size={20}/></button>
            </div>

            {previewUrl && (
              <div className="receipt-preview">
                <Image alt="Fotograferat kvitto" fill sizes="(max-width: 720px) 90vw, 340px" src={previewUrl} unoptimized />
                {scanning && (
                  <div className="receipt-scan-overlay">
                    <LoaderCircle className="receipt-spinner" size={28}/>
                    <b>{progress}%</b>
                  </div>
                )}
              </div>
            )}

            <div className={`receipt-status ${scanning ? "scanning" : ""}`}>{message}</div>

            <form className="receipt-review-form" onSubmit={saveReceipt}>
              <label><span>Butik</span><input disabled={scanning || saving} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Ex. ICA Maxi" /></label>
              <label><span>Totalbelopp</span><input disabled={scanning || saving} inputMode="decimal" value={draft.amount} onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))} placeholder="0,00" /></label>
              <label><span>Datum</span><input disabled={scanning || saving} type="date" value={draft.date} onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))} /></label>
              <label><span>Kategori</span><select disabled={scanning || saving} value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
              <div className="receipt-actions">
                <button className="secondary-action" disabled={saving} onClick={closeScanner} type="button">Avbryt</button>
                <button disabled={scanning || saving} type="submit">{saving ? "Sparar …" : "Spara köp"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
