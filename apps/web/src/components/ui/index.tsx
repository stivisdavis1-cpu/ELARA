import React from "react";

export const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => {
  return (
    <div className={`card ${className}`}>
      {children}
    </div>
  );
};

export const CardFlat = ({ children, className = "" }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => {
  return (
    <div className={`card card-flat ${className}`}>
      {children}
    </div>
  );
};

export const Button = ({
  children,
  variant = "primary",
  className = "",
  ...props
}: {
  children: React.ReactNode;
  variant?: "primary" | "ghost" | "teal";
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const vClass = variant === "teal" ? "btn-primary teal" : `btn-${variant}`;
  return (
    <button className={`btn ${vClass} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const Pill = ({ children, variant = "neutral", className = "" }: { children: React.ReactNode; variant?: "success" | "warning" | "danger" | "info" | "neutral"; className?: string; style?: React.CSSProperties }) => {
  return <span className={`pill pill-${variant} ${className}`}>{children}</span>;
};

export const Badge = ({ children, className = "" }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => {
  return <span className={`ai-badge ${className}`}>{children}</span>;
};
