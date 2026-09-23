import React from "react";

export const Icons = {
  grid: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
  ),
  scan: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3" strokeLinecap="round"/><path d="M3 12h18" strokeLinecap="round"/></svg>
  ),
  cfo: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 17l5-6 4 3 6-8" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 6h4v4" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  report: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M9 13h6M9 17h6M9 9h2" strokeLinecap="round"/></svg>
  ),
  assistant: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 12a8 8 0 1 1 3.2 6.4L4 20l1.2-3.6A7.96 7.96 0 0 1 4 12Z" strokeLinejoin="round"/><circle cx="9" cy="12" r=".8" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r=".8" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r=".8" fill="currentColor" stroke="none"/></svg>
  ),
  contacts: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" strokeLinecap="round"/><path d="M16 4.5c1.7.4 3 1.9 3 3.6s-1.3 3.2-3 3.6M20 20c0-2.6-1.7-4.5-4-5.3" strokeLinecap="round"/></svg>
  ),
  docs: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M9 13h6M9 17h6" strokeLinecap="round"/></svg>
  ),
  users: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="8" cy="9" r="3"/><circle cx="17" cy="10" r="2.4"/><path d="M2.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5M14.5 19c0-2.2 1.7-3.8 4-3.8s4 1.6 4 3.8" strokeLinecap="round"/></svg>
  ),
  settings: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a1.8 1.8 0 0 0 .36 2l.04.04a2.2 2.2 0 1 1-3.1 3.1l-.04-.04a1.8 1.8 0 0 0-2-.36 1.8 1.8 0 0 0-1.06 1.64V20a2.2 2.2 0 1 1-4.4 0v-.06A1.8 1.8 0 0 0 8.14 18.3a1.8 1.8 0 0 0-2 .36l-.04.04a2.2 2.2 0 1 1-3.1-3.1l.04-.04a1.8 1.8 0 0 0 .36-2 1.8 1.8 0 0 0-1.64-1.06H1.7a2.2 2.2 0 1 1 0-4.4h.06A1.8 1.8 0 0 0 3.42 6.94a1.8 1.8 0 0 0-.36-2l-.04-.04a2.2 2.2 0 1 1 3.1-3.1l.04.04a1.8 1.8 0 0 0 2 .36H8.3A1.8 1.8 0 0 0 9.36 .56V.5a2.2 2.2 0 1 1 4.4 0v.06a1.8 1.8 0 0 0 1.06 1.64 1.8 1.8 0 0 0 2-.36l.04-.04a2.2 2.2 0 1 1 3.1 3.1l-.04.04a1.8 1.8 0 0 0-.36 2v.06a1.8 1.8 0 0 0 1.64 1.06h.06a2.2 2.2 0 1 1 0 4.4h-.06a1.8 1.8 0 0 0-1.64 1.06Z"/></svg>
  ),
  health: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 12h4l2 7 4-14 2 7h6" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  mobile: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2" strokeLinecap="round"/></svg>
  ),
  wand: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M15 4l1.3 3.2L19.5 8.5 16.3 9.8 15 13l-1.3-3.2L10.5 8.5l3.2-1.3L15 4Z" strokeLinejoin="round"/><path d="M5 14l.8 2 2 .8-2 .8L5 19.6l-.8-2-2-.8 2-.8L5 14Z" strokeLinejoin="round"/><path d="M4 21l7-7" strokeLinecap="round"/></svg>
  ),
  logo: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M2 12h4l2.5-7 4 14 3-11 2 4h4.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  commercial: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 17l6-6 4 4 8-9" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 6h6v6" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 21h18" strokeLinecap="round"/></svg>
  ),
  ops: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 7l9-4 9 4-9 4-9-4Z" strokeLinejoin="round"/><path d="M3 7v10l9 4 9-4V7" strokeLinejoin="round"/><path d="M12 11v10" /></svg>
  ),
  shield: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3l7 3v6c0 4.6-3 7.6-7 9-4-1.4-7-4.4-7-9V6l7-3Z" strokeLinejoin="round"/><path d="M9 12l2 2 4-4.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  layers: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3l9 5-9 5-9-5 9-5Z" strokeLinejoin="round"/><path d="M3 13l9 5 9-5" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 18l9 5 9-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  flag: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M5 3v18" strokeLinecap="round"/><path d="M5 4h11l-2.5 4L16 12H5" strokeLinejoin="round"/></svg>
  ),
  gen: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M13 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9z"/><path d="M13 3v6h5" strokeLinecap="round" strokeLinejoin="round"/><path d="M9.3 13.2l.7 1.7 1.7.7-1.7.7-.7 1.7-.7-1.7-1.7-.7 1.7-.7.7-1.7Z" strokeLinejoin="round"/></svg>
  ),
  badge: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="5" y="3" width="14" height="18" rx="2.4"/><circle cx="12" cy="10.5" r="2.6"/><path d="M8.3 17c0-2 1.7-3.2 3.7-3.2s3.7 1.2 3.7 3.2" strokeLinecap="round"/></svg>
  ),
  flow: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="2.5" y="4" width="6.5" height="5.5" rx="1.4"/><rect x="15" y="4" width="6.5" height="5.5" rx="1.4"/><rect x="9" y="15" width="6.5" height="5.5" rx="1.4"/><path d="M9 6.8H6.2a1 1 0 0 0-1 1V17" strokeLinecap="round"/><path d="M15 6.8h2.8a1 1 0 0 1 1 1V17" strokeLinecap="round"/><path d="M12.2 15V9.5" strokeLinecap="round"/></svg>
  ),
  puzzle: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M9 4h4a1 1 0 0 1 1 1v2.2a1.8 1.8 0 0 0 2.6 1.6A1.8 1.8 0 0 1 19.2 10.4 1.8 1.8 0 0 0 20 13a1.8 1.8 0 0 1-1.6 2.6H16a1 1 0 0 1-1-1v-2.2a1.8 1.8 0 0 0-3.4 0V16a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.2a1.8 1.8 0 0 0-2.6-1.6A1.8 1.8 0 0 1 4.8 9 1.8 1.8 0 0 0 4 6.4 1.8 1.8 0 0 1 5.6 3.8 1.8 1.8 0 0 0 8 5.2 1 1 0 0 1 9 4Z" strokeLinejoin="round" strokeLinecap="round"/></svg>
  ),
};
