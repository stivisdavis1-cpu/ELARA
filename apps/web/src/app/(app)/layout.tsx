import React from "react";
import { Sidebar } from "@/components/Sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="app-backdrop" aria-hidden="true"></div>
      <div className="shell">
        <Sidebar />
        <main className="canvas" id="canvas" tabIndex={-1}>
          {children}
        </main>
      </div>
    </>
  );
}
