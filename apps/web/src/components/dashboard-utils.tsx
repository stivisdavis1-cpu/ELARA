import React from "react";

export const Ring = ({ val, size = 88 }: { val: number; size?: number }) => {
  const deg = (val / 100) * 360;
  const color = val >= 75 ? "#A9761F" : val >= 55 ? "#C06A2C" : "#A23B3B";
  return (
    <div
      className="ring"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        background: `conic-gradient(${color} ${deg}deg, #ECE9DD 0)`,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <div
        className="ring-val"
        style={{
          width: "calc(100% - 12px)",
          height: "calc(100% - 12px)",
          background: "#F6F4EE",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-heading)",
          fontWeight: 700,
          fontSize: "24px",
          color: "var(--ink)",
        }}
      >
        {val}
      </div>
    </div>
  );
};

export const Row = ({ label, val, color }: { label: string; val: number; color: string }) => (
  <div>
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "5px" }}>
      <span style={{ color: "var(--text-dim)" }}>{label}</span>
      <strong className="mono">{val}</strong>
    </div>
    <div className="progress" style={{ width: "100%", height: "6px", background: "var(--line)", borderRadius: "3px", overflow: "hidden" }}>
      <div style={{ width: `${val}%`, height: "100%", background: color, borderRadius: "3px" }}></div>
    </div>
  </div>
);

export const ListRow = ({ name, meta, amount }: { name: string; meta: string; amount: string }) => (
  <div className="list-row" style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
    <div>
      <div className="name-cell" style={{ fontWeight: 600, fontSize: "13.5px", color: "var(--text)" }}>{name}</div>
      <div style={{ fontSize: "11.5px", color: "var(--text-dim)", marginTop: "2px" }}>{meta}</div>
    </div>
    <div className="mono" style={{ fontWeight: 700 }}>{amount}</div>
  </div>
);

export const AiRow = ({ tag, text, color }: { tag: string; text: string; color: string }) => (
  <div className="list-row" style={{ display: "flex", padding: "12px 0", borderBottom: "1px solid var(--line)", alignItems: "center" }}>
    <span className="pill" style={{ background: `${color}18`, color: color, marginRight: "12px", padding: "4px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>{tag}</span>
    <span style={{ flex: 1, fontSize: "13px" }}>{text}</span>
  </div>
);

export const ScanRow = ({ name, pillClass, pillText }: { name: string; pillClass: string; pillText: string }) => (
  <div className="list-row" style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--line)", alignItems: "center" }}>
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div className="tag-icon" style={{ background: "var(--paper)", color: "var(--text-dim)", width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinejoin="round"/><path d="M14 2v6h6" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 13H8" strokeLinecap="round"/><path d="M16 17H8" strokeLinecap="round"/><path d="M10 9H8" strokeLinecap="round"/></svg>
      </div>
      <span className="name-cell" style={{ fontWeight: 600, fontSize: "13.5px", color: "var(--text)" }}>{name}</span>
    </div>
    <span className={`pill ${pillClass}`} style={{ padding: "4px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: 700 }}>{pillText}</span>
  </div>
);

export const ExtractField = ({ label, val, warn }: { label: string; val: string; warn: boolean }) => (
  <div style={{ marginBottom: "12px" }}>
    <div style={{ fontSize: "11px", color: "var(--text-dim)", fontWeight: 700, marginBottom: "5px", fontFamily: "var(--font-heading)", textTransform: "uppercase" }}>{label}</div>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 13px", borderRadius: "9px", background: warn ? "var(--amber-bg)" : "var(--green-bg)", fontSize: "13px", fontWeight: 600 }}>
      <span>{val}</span>
      <span style={{ fontSize: "11px", color: warn ? "var(--amber)" : "var(--green)", fontWeight: 700 }}>{warn ? "⚠ inhabituel" : "✓ vérifié"}</span>
    </div>
  </div>
);
