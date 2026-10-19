const SKILL_ALIASES: Record<string, string> = {
  js: "javascript",
  node: "node.js",
  nodejs: "node.js",
  reactjs: "react",
  ts: "typescript",
};

function canonicalSkill(skill: string): string {
  const normalized = normalizeSkill(skill);
  return SKILL_ALIASES[normalized] ?? normalized;
}

export function normalizeSkill(skill: string): string {
  return skill
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*([.+#/,])\s*/g, "$1");
}

export function skillsMatch(first: string, second: string): boolean {
  const canonicalFirst = canonicalSkill(first);
  return canonicalFirst !== "" && canonicalFirst === canonicalSkill(second);
}

export function textContainsSkill(text: string, skill: string): boolean {
  const canonical = canonicalSkill(skill);
  if (!canonical) return false;

  const candidates = [
    canonical,
    ...Object.entries(SKILL_ALIASES)
      .filter(([, aliasCanonical]) => aliasCanonical === canonical)
      .map(([alias]) => alias),
  ];
  const normalizedText = normalizeSkill(text);

  return candidates.some((candidate) => {
    const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`).test(
      normalizedText
    );
  });
}
