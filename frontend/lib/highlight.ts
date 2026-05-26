export const FILLERS = [
  "um", "uh", "er", "ah",
  "like", "basically", "actually", "you know", "so", "literally",
  "i mean", "well", "okay", "ok", "right", "anyway", "honestly",
  "totally", "seriously", "obviously", "sort of", "kind of", "you see",
];

export function highlight(text: string): string {
  let out = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  FILLERS.forEach(w => {
    const escaped = w.replace(/\s+/g, "\\s+");
    out = out.replace(
      new RegExp(`\\b${escaped}\\b`, "gi"),
      m => `<span class="filler-word">${m}</span>`
    );
  });
  return out;
}
