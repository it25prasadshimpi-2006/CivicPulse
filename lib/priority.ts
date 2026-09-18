export interface PriorityInputs {
  citizenDemand: number;
  severity: number;
  populationAffected: number;
  infrastructureGap: number;
  investmentGap: number;
}

export interface PriorityResult {
  score: number;
  level: "Low" | "Medium" | "High" | "Critical";
  breakdown: {
    citizenDemand: number;
    severity: number;
    populationAffected: number;
    infrastructureGap: number;
    investmentGap: number;
  };
}

export function calculatePriorityScore(
  inputs: PriorityInputs
): PriorityResult {
  const score =
    inputs.citizenDemand * 0.35 +
    inputs.severity * 0.20 +
    inputs.populationAffected * 0.20 +
    inputs.infrastructureGap * 0.15 +
    inputs.investmentGap * 0.10;

  const roundedScore = Math.round(score * 10) / 10;

  let level: PriorityResult["level"];

  if (roundedScore >= 85) {
    level = "Critical";
  } else if (roundedScore >= 70) {
    level = "High";
  } else if (roundedScore >= 40) {
    level = "Medium";
  } else {
    level = "Low";
  }

  return {
    score: roundedScore,
    level,
    breakdown: {
      citizenDemand: inputs.citizenDemand,
      severity: inputs.severity,
      populationAffected: inputs.populationAffected,
      infrastructureGap: inputs.infrastructureGap,
      investmentGap: inputs.investmentGap,
    },
  };
}