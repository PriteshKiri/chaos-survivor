import { useRef, useState } from "react";
import { parseFile, detectNameColumn, extractNames } from "../lib/parse";

export default function UploadScreen({ onReady }) {
  const inputRef = useRef(null);
  const [stage, setStage] = useState("idle"); // idle | parsing | choose | error
  const [error, setError] = useState("");
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [selectedCol, setSelectedCol] = useState("");

  async function handleFile(file) {
    if (!file) return;
    setFileName(file.name);
    setStage("parsing");
    setError("");
    try {
      const { headers, rows } = await parseFile(file);
      if (!headers.length || !rows.length) {
        setStage("error");
        setError("No data found in that file. Is it empty?");
        return;
      }
      const detected = detectNameColumn(headers);
      if (detected) {
        finish(rows, detected);
      } else {
        // Fallback: let the user pick the column manually.
        setHeaders(headers);
        setRows(rows);
        setSelectedCol(headers[0]);
        setStage("choose");
      }
    } catch (e) {
      setStage("error");
      setError(e?.message || "Failed to parse the file.");
    }
  }

  function finish(dataRows, column) {
    const names = extractNames(dataRows, column);
    if (!names.length) {
      setStage("error");
      setError(`Column "${column}" had no usable names.`);
      return;
    }
    onReady(names);
  }

  function onInputChange(e) {
    handleFile(e.target.files?.[0]);
  }

  function onDrop(e) {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0]);
  }

  return (
    <div className="chaos-backdrop relative flex min-h-screen flex-col items-center justify-center p-8">
      {/* Static brand logo, top-left. Drop the file at public/logo.png to show it. */}
      <img
        src="/logo.png"
        alt="LitmusChaos"
        className="absolute left-6 top-6 h-12 w-auto"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />

      <div className="mb-8 flex flex-col items-center text-center">
        <img
          src="/mascot.png"
          alt="mascot"
          className="animate-float h-44 w-44 drop-shadow-2xl"
        />
        <h1 className="mt-4 text-4xl font-black tracking-tight text-white">
          Chaos <span className="text-litmus-bright">Survivor</span>
        </h1>
        <p className="mt-2 font-mono text-sm text-slate-400">
          LitmusChaos · only the resilient survive chaos
        </p>
      </div>

      {stage !== "choose" && (
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="group flex w-full max-w-xl cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-chaos-border bg-chaos-panel/60 px-8 py-14 text-center transition hover:border-litmus hover:bg-chaos-panel"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={onInputChange}
          />
          <div className="text-5xl">📥</div>
          <p className="mt-4 text-lg font-semibold text-white">
            {stage === "parsing"
              ? `Parsing ${fileName}…`
              : "Drop your CSV / XLSX here"}
          </p>
          <p className="mt-1 font-mono text-xs text-slate-400">
            Export from your Google Form · parsed locally, nothing leaves this
            device
          </p>
        </label>
      )}

      {stage === "choose" && (
        <div className="w-full max-w-xl rounded-2xl border border-chaos-border bg-chaos-panel p-6">
          <p className="text-sm text-slate-300">
            Couldn't auto-detect the name column in{" "}
            <span className="font-mono text-litmus-bright">{fileName}</span>.
            Pick it:
          </p>
          <select
            value={selectedCol}
            onChange={(e) => setSelectedCol(e.target.value)}
            className="mt-4 w-full rounded-lg border border-chaos-border bg-chaos-bg px-3 py-2 font-mono text-sm text-white outline-none focus:border-litmus"
          >
            {headers.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => finish(rows, selectedCol)}
              className="flex-1 rounded-lg bg-litmus px-4 py-2 font-semibold text-white transition hover:bg-litmus-bright"
            >
              Use this column
            </button>
            <button
              onClick={() => setStage("idle")}
              className="rounded-lg border border-chaos-border px-4 py-2 text-slate-300 transition hover:bg-chaos-bg"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {stage === "error" && (
        <p className="mt-4 font-mono text-sm text-crashed">⚠ {error}</p>
      )}
    </div>
  );
}
