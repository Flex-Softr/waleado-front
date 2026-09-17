import { readFileSync } from "node:fs";

const r = JSON.parse(readFileSync(process.argv[2], "utf8"));
const c = {};
for (const f of r)
  for (const m of f.messages) {
    const k = (m.severity === 2 ? "ERROR" : "warn") + " " + (m.ruleId || "?");
    c[k] = (c[k] || 0) + 1;
  }
console.log(
  Object.entries(c)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => v + "  " + k)
    .join("\n"),
);
console.log("--- files ---");
for (const f of r)
  if (f.messages.length)
    console.log(
      f.messages.length + "  " + f.filePath.split("waleado-front").pop(),
    );
