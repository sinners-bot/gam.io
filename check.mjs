// Parses every bundle as TSX, the way Railway runs it (index.tsx). Catches e.g. `<T>` generics read as JSX.
import ts from "typescript"; import fs from "fs";
let bad = 0;
for (const f of fs.readdirSync("dist").filter((f) => f.endsWith(".tsx"))) {
  const sf = ts.createSourceFile("index.tsx", fs.readFileSync("dist/" + f, "utf8"), ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
  const d = sf.parseDiagnostics || [];
  if (d.length) { bad++; for (const x of d.slice(0, 5)) { const p = sf.getLineAndCharacterOfPosition(x.start); console.log(f, (p.line + 1) + ":" + (p.character + 1), ts.flattenDiagnosticMessageText(x.messageText, "\n")); } }
  else console.log(f.padEnd(12), "OK");
}
process.exit(bad ? 1 : 0);
