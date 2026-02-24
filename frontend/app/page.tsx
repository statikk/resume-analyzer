"use client";

import React, { useMemo, useState } from "react";

type AiResult = {
  fit_level: "Strong" | "Medium" | "Low";
  suitable: boolean;
  confidence: "High" | "Medium" | "Low";
  summary: string;

  matched_required_skills: string[];
  missing_required_skills: string[];
  matched_nice_to_have: string[];
  missing_nice_to_have: string[];
  risk_flags: string[];

  evidence: { claim: string; snippet: string }[];

  screening_recommendation:
    | "Proceed to technical interview"
    | "Recruiter screen only"
    | "Reject";

  interview_focus_areas: string[];

  final_verdict: string;
  final_why: string[];
};

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function Card(props: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 16,
        boxShadow: "0 6px 18px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 10,
        }}
      >
        <h3 style={{ margin: 0, color: "#111", fontWeight: 800 }}>
          {props.title}
        </h3>
        {props.right}
      </div>

      <div style={{ color: "#111", lineHeight: 1.6 }}>{props.children}</div>
    </section>
  );
}

function Badge(props: {
  label: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const bg =
    props.tone === "good"
      ? "#ecfdf5"
      : props.tone === "warn"
      ? "#fffbeb"
      : props.tone === "bad"
      ? "#fef2f2"
      : "#f3f4f6";

  const border =
    props.tone === "good"
      ? "#a7f3d0"
      : props.tone === "warn"
      ? "#fcd34d"
      : props.tone === "bad"
      ? "#fecaca"
      : "#e5e7eb";

  const color =
    props.tone === "good"
      ? "#065f46"
      : props.tone === "warn"
      ? "#92400e"
      : props.tone === "bad"
      ? "#991b1b"
      : "#111827";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 999,
        background: bg,
        border: `1px solid ${border}`,
        color,
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {props.label}
    </span>
  );
}

export default function Home() {
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);

  const [result, setResult] = useState<AiResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [dragOver, setDragOver] = useState<boolean>(false);

  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8001";

  const canAnalyze =
    title.trim().length > 0 &&
    file !== null &&
    !loading;

  const fitTone = useMemo(() => {
    if (!result) return "neutral" as const;
    if (result.fit_level === "Strong") return "good" as const;
    if (result.fit_level === "Medium") return "warn" as const;
    return "bad" as const;
  }, [result]);

  const onPickFile = (f: File | null) => {
    setError(null);
    if (!f) {
      setFile(null);
      return;
    }
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a PDF file.");
      return;
    }
    setFile(f);
  };

  const analyze = async (): Promise<void> => {
    setError(null);
    setResult(null);

    if (!canAnalyze) return;

    const formData = new FormData();
    formData.append("position_title", title.trim());
    formData.append("position_description", description);
    formData.append("cv_pdf", file as File);

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `HTTP ${res.status}`);
      }

      const data = (await res.json()) as AiResult;
      setResult(data);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        background: "#f4f6fb",
        minHeight: "100vh",
        padding: 40,
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div
          style={{
            background: "#ffffff",
            padding: 28,
            borderRadius: 14,
            boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
            border: "1px solid #eef2ff",
          }}
        >
          <h1 style={{ color: "#111", fontWeight: 900, fontSize: 28 }}>
            Resume Match Analyzer
          </h1>

          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <label style={{ fontWeight: 800, color: "#111" }}>
                Position title *
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="QA Automation Engineer"
                style={{
                  width: "100%",
                  padding: 12,
                  marginTop: 6,
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                }}
              />
            </div>

            <div>
              <label style={{ fontWeight: 800, color: "#111" }}>
                Position description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: "100%",
                  padding: 12,
                  marginTop: 6,
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  minHeight: 110,
                }}
              />
            </div>

            {/* Upload */}
            <div>
              <label style={{ fontWeight: 800, color: "#111" }}>
                Upload CV (PDF)
              </label>

              <input
                id="cv-upload"
                type="file"
                accept="application/pdf"
                style={{ display: "none" }}
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              />

              <div
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const dropped = e.dataTransfer.files?.[0] ?? null;
                  onPickFile(dropped);
                }}
                style={{
                  marginTop: 8,
                  borderRadius: 12,
                  border: dragOver ? "2px dashed #111" : "1px dashed #cbd5e1",
                  background: dragOver ? "#eef2ff" : "#f9fafb",
                  padding: 16,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <strong>Drag & drop PDF here</strong>
                    <div style={{ fontSize: 13, color: "#6b7280" }}>
                      or choose file
                    </div>
                  </div>

                  <label
                    htmlFor="cv-upload"
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: "#fff",
                      border: "1px solid #d1d5db",
                      cursor: "pointer",
                      fontWeight: 800,
                    }}
                  >
                    Choose file
                  </label>
                </div>

                {file && (
                  <div style={{ marginTop: 10 }}>
                    Selected: <strong>{file.name}</strong>
                    <button
                      onClick={() => onPickFile(null)}
                      style={{ marginLeft: 10 }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Analyze */}
            <div>
              <button
                onClick={analyze}
                disabled={!canAnalyze}
                style={{
                  padding: "12px 16px",
                  borderRadius: 10,
                  background: !canAnalyze ? "#9ca3af" : "#111",
                  color: "#fff",
                  border: "none",
                  fontWeight: 900,
                  cursor: !canAnalyze ? "not-allowed" : "pointer",
                  opacity: !canAnalyze ? 0.7 : 1,
                }}
              >
                {loading ? "Analyzing..." : "Analyze"}
              </button>

              {!title && (
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                  Enter position title to enable analysis
                </div>
              )}

              {title && !file && (
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                  Upload a PDF CV to continue
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RESULT */}
        {result && (
          <div style={{ marginTop: 18 }}>
            <Card
              title="Verdict"
              right={<Badge label={`Fit: ${result.fit_level}`} tone={fitTone} />}
            >
              <p>{result.final_verdict}</p>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}