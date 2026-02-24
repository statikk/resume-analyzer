"use client";

import { useMemo, useState } from "react";

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

  // NEW:
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

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8001";

  const fitTone = useMemo(() => {
    if (!result) return "neutral" as const;
    if (result.fit_level === "Strong") return "good" as const;
    if (result.fit_level === "Medium") return "warn" as const;
    return "bad" as const;
  }, [result]);

  const analyze = async (): Promise<void> => {
    setError(null);
    setResult(null);

    if (!title.trim() || !file) {
      setError("Position title and PDF required");
      return;
    }

    const formData = new FormData();
    formData.append("position_title", title.trim());
    formData.append("position_description", description);
    formData.append("cv_pdf", file);

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
          <h1 style={{ color: "#111", fontWeight: 900, fontSize: 28, margin: 0 }}>
            Resume Match Analyzer
          </h1>
          <p style={{ color: "#374151", marginTop: 10, marginBottom: 22 }}>
            One-page AI pre-screening tool for recruiters (PDF only).
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
            <div>
              <label style={{ color: "#111", fontWeight: 800 }}>Position title *</label>
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
                }}
              />
            </div>

            <div>
              <label style={{ color: "#111", fontWeight: 800 }}>Position description</label>
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
                }}
              />
            </div>

            <div>
              <label style={{ color: "#111", fontWeight: 800 }}>Upload CV (PDF)</label>
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                {file && (
                  <span style={{ color: "#374151", fontSize: 13 }}>
                    Selected: <b style={{ color: "#111" }}>{file.name}</b>
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button
                onClick={analyze}
                disabled={loading}
                style={{
                  padding: "12px 16px",
                  borderRadius: 10,
                  background: loading ? "#374151" : "#111",
                  color: "#fff",
                  border: "none",
                  fontWeight: 800,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Analyzing..." : "Analyze"}
              </button>

              {error && (
                <span style={{ color: "#b91c1c", fontWeight: 700 }}>
                  {error}
                </span>
              )}
            </div>
          </div>
        </div>

        {result && (
          <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
            <Card
              title="Verdict"
              right={<Badge label={`Fit: ${result.fit_level}`} tone={fitTone} />}
            >
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                <Badge label={`Suitable: ${result.suitable ? "Yes" : "No"}`} tone={result.suitable ? "good" : "bad"} />
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
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Matched Nice-to-have</div>
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
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Missing Nice-to-have</div>
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
