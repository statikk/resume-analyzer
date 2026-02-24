"use client";

import React, { useMemo, useRef, useState } from "react";

type EvidenceItem = { claim: string; snippet: string };

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

  evidence: EvidenceItem[];

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
        <h3 style={{ margin: 0, color: "#111", fontWeight: 900 }}>
          {props.title}
        </h3>
        {props.right}
      </div>

      <div style={{ color: "#111", lineHeight: 1.6 }}>{props.children}</div>
    </section>
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

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8001";

  const canAnalyze = title.trim().length > 0 && file !== null && !loading;

  const fitTone = useMemo(() => {
    if (!result) return "neutral" as const;
    if (result.fit_level === "Strong") return "good" as const;
    if (result.fit_level === "Medium") return "warn" as const;
    return "bad" as const;
  }, [result]);

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onPickFile = (f: File | null) => {
    setError(null);

    if (!f) {
      setFile(null);
      resetFileInput();
      return;
    }

    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a PDF file.");
      setFile(null);
      resetFileInput();
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
          <h1 style={{ color: "#111", fontWeight: 900, fontSize: 32, margin: 0 }}>
            Resume Match Analyzer
          </h1>
          <p style={{ color: "#374151", marginTop: 10, marginBottom: 22 }}>
            One-page AI pre-screening tool for recruiters (PDF only).
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
            <div>
              <label style={{ color: "#111", fontWeight: 900 }}>
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
                  background: "#fff",
                  color: "#111",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ color: "#111", fontWeight: 900 }}>
                Position description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional job description / requirements"
                style={{
                  width: "100%",
                  padding: 12,
                  marginTop: 6,
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  minHeight: 110,
                  background: "#fff",
                  color: "#111",
                  outline: "none",
                }}
              />
            </div>

            {/* Upload */}
            <div>
              <label style={{ color: "#111", fontWeight: 900 }}>
                Upload CV (PDF)
              </label>

              <input
                ref={fileInputRef}
                id="cv-upload"
                type="file"
                accept="application/pdf"
                style={{ display: "none" }}
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              />

              <div
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOver(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOver(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOver(false);
                  const dropped = e.dataTransfer.files?.[0] ?? null;
                  onPickFile(dropped);
                }}
                style={{
                  marginTop: 8,
                  borderRadius: 12,
                  border: dragOver ? "2px dashed #111" : "2px dashed #cbd5e1",
                  background: dragOver ? "#eef2ff" : "#ffffff",
                  padding: 18,
                  transition: "all 0.15s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 10,
                        background: "#111",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 900,
                        letterSpacing: 0.5,
                      }}
                      aria-hidden
                    >
                      PDF
                    </div>
                    <div>
                      <div style={{ fontWeight: 900, color: "#111" }}>
                        Drag & drop PDF here
                      </div>
                      <div style={{ color: "#6b7280", fontSize: 13 }}>
                        or choose a file
                      </div>
                    </div>
                  </div>

                  <label
                    htmlFor="cv-upload"
                    style={{
                      padding: "10px 16px",
                      borderRadius: 10,
                      background: "#111",
                      color: "#fff",
                      fontWeight: 900,
                      cursor: "pointer",
                      userSelect: "none",
                      boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
                    }}
                  >
                    Choose file
                  </label>
                </div>

                {/* Selected file row */}
                <div
                  style={{
                    marginTop: 12,
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: "#f9fafb",
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    minHeight: 44,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 800,
                      color: file ? "#111" : "#9ca3af",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "calc(100% - 60px)",
                    }}
                    title={file?.name ?? ""}
                  >
                    {file ? file.name : "No file selected"}
                  </span>

                  <button
                    type="button"
                    onClick={() => onPickFile(null)}
                    disabled={!file}
                    style={{
                      marginLeft: "auto",
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      border: "1px solid #e5e7eb",
                      background: file ? "#111" : "#e5e7eb",
                      color: file ? "#fff" : "#9ca3af",
                      cursor: file ? "pointer" : "not-allowed",
                      fontWeight: 900,
                      lineHeight: "34px",
                    }}
                    title="Remove selected file"
                    aria-label="Remove selected file"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>

            {/* Analyze */}
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <button
                onClick={analyze}
                disabled={!canAnalyze}
                style={{
                  padding: "12px 18px",
                  borderRadius: 10,
                  background: canAnalyze ? "#111" : "#d1d5db",
                  color: canAnalyze ? "#fff" : "#6b7280",
                  border: "none",
                  fontWeight: 900,
                  cursor: canAnalyze ? "pointer" : "not-allowed",
                  opacity: 1,
                }}
              >
                {loading ? "Analyzing..." : "Analyze"}
              </button>

              <div style={{ paddingTop: 6 }}>
                {!title.trim() && (
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    Enter position title to enable analysis
                  </div>
                )}
                {title.trim() && !file && (
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    Upload a PDF CV to continue
                  </div>
                )}
                {error && (
                  <div style={{ fontSize: 13, color: "#b91c1c", fontWeight: 800 }}>
                    {error}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RESULT */}
        {result && (
          <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
            <Card
              title="Verdict"
              right={<Badge label={`Fit: ${result.fit_level}`} tone={fitTone} />}
            >
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                <Badge
                  label={`Suitable: ${result.suitable ? "Yes" : "No"}`}
                  tone={result.suitable ? "good" : "bad"}
                />
                <Badge label={`Confidence: ${result.confidence}`} tone="neutral" />
                <Badge label={`Recommendation: ${result.screening_recommendation}`} tone="neutral" />
              </div>

              <div style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 900, marginBottom: 4 }}>Final verdict</div>
                <div style={{ color: "#111" }}>{result.final_verdict}</div>
              </div>

              {result.final_why?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 900, marginBottom: 4 }}>Why</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {result.final_why.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <div style={{ fontWeight: 900, marginBottom: 4 }}>Summary</div>
                <div style={{ color: "#111" }}>{result.summary}</div>
              </div>
            </Card>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Card title="Matched Required">
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {result.matched_required_skills.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>

                {result.matched_nice_to_have?.length > 0 && (
                  <>
                    <div style={{ height: 10 }} />
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>
                      Matched Nice-to-have
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {result.matched_nice_to_have.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </>
                )}
              </Card>

              <Card title="Missing Required">
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {result.missing_required_skills.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>

                {result.missing_nice_to_have?.length > 0 && (
                  <>
                    <div style={{ height: 10 }} />
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>
                      Missing Nice-to-have
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {result.missing_nice_to_have.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </>
                )}
              </Card>
            </div>

            {result.risk_flags?.length > 0 && (
              <Card title="Risk flags">
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {result.risk_flags.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </Card>
            )}

            <Card title="Evidence">
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {result.evidence.map((e, i) => (
                  <li key={i} style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 900 }}>{e.claim}</div>
                    <div style={{ color: "#374151" }}>&ldquo;{e.snippet}&rdquo;</div>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="Interview focus areas">
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {result.interview_focus_areas.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}