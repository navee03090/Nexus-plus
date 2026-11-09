const fs = require("fs");
const path = require("path");

const files = ["src/app/alerts/page.tsx", "src/app/profile/page.tsx"];
const pairs = [
  ["bg-slate-950", "bg-np-bg"],
  ["bg-slate-900/80", "bg-np-surface"],
  ["bg-slate-900", "bg-np-surface"],
  ["bg-slate-800", "bg-np-surface-2"],
  ["border-slate-800", "border-np-border"],
  ["border-slate-700", "border-np-border-strong"],
  ["text-slate-300", "text-np-muted"],
  ["text-slate-400", "text-np-muted"],
  ["text-slate-500", "text-np-faint"],
  ["text-indigo-400", "text-np-accent"],
  ["bg-indigo-600", "bg-np-accent"],
  ["bg-indigo-500/10", "bg-np-accent/10"],
  ["border-indigo-500/20", "border-np-accent/20"],
  ["border-indigo-400/40", "border-np-accent/40"],
  ["hover:bg-indigo-500", "hover:bg-[#5a9dff]"],
  ["focus:border-indigo-500", "focus:border-np-accent"],
  ["accent-indigo-600", "accent-np-accent"],
  ["text-emerald-400", "text-np-verify"],
  ["bg-emerald-500/10", "bg-np-verify/10"],
  ["border-emerald-500/20", "border-np-verify/20"],
  ["bg-emerald-950/60", "bg-np-verify/10"],
  ["border-emerald-500/40", "border-np-verify/40"],
  ["text-emerald-300", "text-np-verify"],
  ["peer-checked:bg-indigo-600", "peer-checked:bg-np-accent"],
  ["peer-checked:bg-emerald-600", "peer-checked:bg-np-verify"],
  ["peer-checked:bg-sky-600", "peer-checked:bg-np-online"],
  ["rounded-3xl", "rounded-np-lg"],
  ["rounded-2xl", "rounded-np-lg"],
  ["shadow-indigo-600/30", "shadow-np"],
  ["hover:text-white", "hover:text-np-text"],
  ["text-white", "text-np-text"],
];

for (const file of files) {
  const full = path.join(__dirname, "..", file);
  let src = fs.readFileSync(full, "utf8");
  const before = src;
  for (const [a, b] of pairs) src = src.split(a).join(b);
  src = src.replace(/bg-np-accent((?:(?!"|').)*)text-np-text/g, "bg-np-accent$1text-white");
  fs.writeFileSync(full, src);
  console.log(file, src !== before ? "updated" : "same");
}
