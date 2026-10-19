export type SkillPriority = "High" | "Medium" | "Low";

export interface ReadinessBenchmark {
  requiredSkills: string[];
  goodToHaveSkills: string[];
}

export interface MissingSkillPriority {
  name: string;
  priority: SkillPriority;
}

export interface ReadinessTaskProgress {
  completedWeight: number;
  totalWeight: number;
}

export interface ComputeReadinessInput {
  benchmark: ReadinessBenchmark;
  matchedSkills: string[];
  missingSkills?: MissingSkillPriority[];
  taskProgress?: ReadinessTaskProgress;
}

const PRIORITY_WEIGHT: Record<SkillPriority, number> = {
  High: 3,
  Medium: 2,
  Low: 1,
};

function normalizeSkill(skill: string): string {
  return skill.trim().toLowerCase();
}

export function computeReadiness({
  benchmark,
  matchedSkills,
  missingSkills = [],
  taskProgress,
}: ComputeReadinessInput): number {
  const benchmarkWeights = new Map<string, number>();

  for (const skill of benchmark.requiredSkills) {
    benchmarkWeights.set(normalizeSkill(skill), PRIORITY_WEIGHT.High);
  }
  for (const skill of benchmark.goodToHaveSkills) {
    const key = normalizeSkill(skill);
    if (!benchmarkWeights.has(key)) {
      benchmarkWeights.set(key, PRIORITY_WEIGHT.Medium);
    }
  }

  const aiPriorityWeights = new Map(
    missingSkills.map((skill) => [
      normalizeSkill(skill.name),
      PRIORITY_WEIGHT[skill.priority],
    ])
  );

  let totalWeight = 0;
  let matchedWeight = 0;
  const matched = new Set(matchedSkills.map(normalizeSkill));

  benchmarkWeights.forEach((benchmarkWeight, skill) => {
    const weight = aiPriorityWeights.get(skill) ?? benchmarkWeight;
    totalWeight += weight;
    if (matched.has(skill)) matchedWeight += weight;
  });

  let score =
    totalWeight === 0
      ? 10
      : Math.round(10 + (matchedWeight / totalWeight) * 88);

  if (taskProgress && taskProgress.totalWeight > 0) {
    const progress = Math.max(
      0,
      Math.min(1, taskProgress.completedWeight / taskProgress.totalWeight)
    );
    score = Math.round(score + (98 - score) * progress);
  }

  return Math.max(10, Math.min(98, score));
}
