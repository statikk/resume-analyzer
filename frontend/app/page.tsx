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

export default function Home() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8001";

  const canAnalyze =
    title.trim().length > 0 &&
    file !== null &&
    !loading;

  const analyze = async () => {
    if (!canAnalyze) return;

    setError(null);
    setResult(null);

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
        throw new Error(msg || "Request failed");
      }

      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFile = (f: File | null) => {
    if (!f) {
      setFile(null);
      return;
    }

    if (
      f.type !== "application/pdf" &&
      !f.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Please upload a PDF file.");
      return;
    }

    setError(null);
    setFile(f);
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
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div
          style={{
            background: "#fff",
            padding: 30,
            borderRadius: 16,
            boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
          }}
        >
          <h1
            style={{
              fontSize: 32,
              fontWeight: 900,
              marginBottom: 24,
              color: "#111",
            }}
          >
            Resume Match Analyzer
          </h1>

          {/* Position title */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontWeight: 800, color: "#111" }}>
              Position title *
            </label>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="QA Automation Engineer"
              style={{
                width: "100%",
                padding: 14,
                marginTop: 6,
                borderRadius: 10,
                border: "1px solid #d1d5db",
                background: "#fff",
                color: "#111",
                outline: "none",
              }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontWeight: 800, color: "#111" }}>
              Position description
            </label>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional job description / requirements"
              style={{
                width: "100%",
                padding: 14,
                marginTop: 6,
                borderRadius: 10,
                border: "1px solid #d1d5db",
                background: "#fff",
                color: "#111",
                minHeight: 120,
                outline: "none",
              }}
            />
          </div>

          {/* Upload */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontWeight: 800, color: "#111" }}>
              Upload CV (PDF)
            </label>

            <input
              id="cv-upload"
              type="file"
              accept="application/pdf"
              style={{ display: "none" }}
              onChange={(e) =>
                handleFile(e.target.files?.[0] ?? null)
              }
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
                handleFile(e.dataTransfer.files?.[0] ?? null);
              }}
              style={{
                marginTop: 8,
                borderRadius: 12,
                border: dragOver
                  ? "2px dashed #111"
                  : "2px dashed #cbd5e1",
                background: dragOver ? "#eef2ff" : "#ffffff",
                padding: 20,
                transition: "all 0.15s ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 800,
                      color: "#111",
                    }}
                  >
                    Drag & drop PDF here
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: "#6b7280",
                    }}
                  >
                    or choose file
                  </div>
                </div>

                <label
                  htmlFor="cv-upload"
                  style={{
                    padding: "10px 16px",
                    borderRadius: 10,
                    background: "#111",
                    color: "#fff",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Choose file
                </label>
              </div>

              {file && (
                <div
                  style={{
                    marginTop: 14,
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>
                    {file.name}
                  </span>

                  <button
                    onClick={() => handleFile(null)}
                    style={{
                      marginLeft: "auto",
                      background: "#e5e7eb",
                      border: "none",
                      borderRadius: 8,
                      padding: "4px 10px",
                      cursor: "pointer",
                    }}
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
                padding: "12px 20px",
                borderRadius: 10,
                border: "none",
                fontWeight: 800,
                background: canAnalyze
                  ? "#111"
                  : "#d1d5db",
                color: canAnalyze
                  ? "#fff"
                  : "#6b7280",
                cursor: canAnalyze
                  ? "pointer"
                  : "not-allowed",
              }}
            >
              {loading ? "Analyzing..." : "Analyze"}
            </button>

            {!title && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  color: "#6b7280",
                }}
              >
                Enter position title to enable analysis
              </div>
            )}

            {title && !file && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  color: "#6b7280",
                }}
              >
                Upload a PDF CV to continue
              </div>
            )}
          </div>

          {error && (
            <div
              style={{
                marginTop: 14,
                color: "#b91c1c",
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}