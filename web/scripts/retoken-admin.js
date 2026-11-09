const fs = require("fs");
const path = require("path");

const files = [
  "src/app/admin/review/page.tsx",
  "src/app/admin/opportunities/page.tsx",
  "src/app/admin/sources/page.tsx",
  "src/app/admin/ingestion/page.tsx",
  "src/app/admin/ingest/page.tsx",
  "src/app/admin/settings/page.tsx",
  "src/app/admin/page.tsx",
];

const pairs = [
  ["bg-slate-950", "bg-np-bg"],
  ["bg-slate-900/90", "bg-np-surface"],
  ["bg-slate-900/80", "bg-np-surface"],
  ["bg-slate-900/70", "bg-np-surface"],
  ["bg-slate-900/60", "bg-np-surface"],
  ["bg-slate-900/40", "bg-np-surface"],
  ["bg-slate-900", "bg-np-surface"],
  ["bg-slate-800/80", "bg-np-surface-2"],
  ["bg-slate-800/60", "bg-np-surface-2"],
  ["bg-slate-800/50", "bg-np-surface-2"],
  ["bg-slate-800", "bg-np-surface-2"],
  ["bg-slate-700/60", "bg-np-surface-2"],
  ["bg-slate-700/40", "bg-np-surface-2"],
  ["border-slate-800/80", "border-np-border"],
  ["border-slate-800", "border-np-border"],
  ["border-slate-700/80", "border-np-border"],
  ["border-slate-700/60", "border-np-border"],
  ["border-slate-700", "border-np-border-strong"],
  ["text-slate-100", "text-np-text"],
  ["text-slate-200", "text-np-text"],
  ["text-slate-300", "text-np-muted"],
  ["text-slate-400", "text-np-muted"],
  ["text-slate-500", "text-np-faint"],
  ["hover:bg-slate-800/50", "hover:bg-np-surface-2"],
  ["hover:bg-slate-800", "hover:bg-np-surface-2"],
  ["hover:bg-slate-700/60", "hover:bg-np-surface-2"],
  ["hover:bg-slate-700", "hover:bg-np-surface-2"],
  ["hover:text-white", "hover:text-np-text"],
  ["text-indigo-400", "text-np-accent"],
  ["text-indigo-300", "text-np-accent"],
  ["text-indigo-100", "text-np-accent"],
  ["bg-indigo-600/20", "bg-np-accent/15"],
  ["bg-indigo-600", "bg-np-accent"],
  ["bg-indigo-500/15", "bg-np-accent/15"],
  ["hover:bg-indigo-500", "hover:bg-[#5a9dff]"],
  ["border-indigo-500/40", "border-np-accent/40"],
  ["border-indigo-500/30", "border-np-accent/30"],
  ["border-indigo-500/20", "border-np-accent/20"],
  ["focus:border-indigo-400", "focus:border-np-accent"],
  ["focus:border-indigo-500", "focus:border-np-accent"],
  ["accent-indigo-500", "accent-np-accent"],
  ["text-emerald-400", "text-np-verify"],
  ["text-emerald-300", "text-np-verify"],
  ["text-emerald-200", "text-np-verify"],
  ["text-emerald-100", "text-np-verify"],
  ["bg-emerald-600", "bg-np-verify"],
  ["bg-emerald-500/15", "bg-np-verify/15"],
  ["bg-emerald-500/10", "bg-np-verify/10"],
  ["border-emerald-500/40", "border-np-verify/40"],
  ["border-emerald-500/30", "border-np-verify/30"],
  ["border-emerald-500/20", "border-np-verify/20"],
  ["text-amber-400", "text-np-warn"],
  ["text-amber-300", "text-np-warn"],
  ["text-amber-200", "text-np-warn"],
  ["text-amber-50", "text-np-text"],
  ["bg-amber-500/15", "bg-np-warn/15"],
  ["bg-amber-500/10", "bg-np-warn/10"],
  ["border-amber-500/40", "border-np-warn/40"],
  ["border-amber-500/30", "border-np-warn/30"],
  ["border-amber-500/20", "border-np-warn/20"],
  ["text-rose-400", "text-np-danger"],
  ["text-rose-300", "text-np-danger"],
  ["text-rose-200", "text-np-danger"],
  ["text-rose-100", "text-np-danger"],
  ["bg-rose-950/70", "bg-np-danger/15"],
  ["bg-rose-950/50", "bg-np-danger/10"],
  ["bg-rose-600", "bg-np-danger"],
  ["border-rose-500/40", "border-np-danger/40"],
  ["border-rose-900/40", "border-np-danger/30"],
  ["text-cyan-400", "text-np-online"],
  ["text-cyan-300", "text-np-online"],
  ["bg-cyan-500/20", "bg-np-online/15"],
  ["rounded-3xl", "rounded-np-lg"],
  ["rounded-2xl", "rounded-np-lg"],
  ["shadow-indigo-600/30", "shadow-np"],
];

for (const file of files) {
  const full = path.join(__dirname, "..", file);
  let src = fs.readFileSync(full, "utf8");
  const before = src;
  for (const [a, b] of pairs) {
    src = src.split(a).join(b);
  }
  // Keep readable contrast on solid accent buttons
  src = src.replace(/bg-np-accent((?:(?!"|').)*)text-np-text/g, "bg-np-accent$1text-white");
  src = src.replace(/bg-np-verify((?:(?!"|').)*)text-np-text/g, "bg-np-verify$1text-white");
  src = src.replace(/bg-np-danger((?:(?!"|').)*)text-np-text/g, "bg-np-danger$1text-white");
  if (src !== before) {
    fs.writeFileSync(full, src);
    console.log("updated", file);
  } else {
    console.log("unchanged", file);
  }
}
