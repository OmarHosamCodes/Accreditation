import type { AppState } from "./types.ts";

export function activeWeights(db: AppState, weightsVersionId: number): Record<string, number> {
  return db.weights_versions.find((version) => version.id === weightsVersionId)?.weights || db.weights_versions.at(-1)?.weights || {};
}

export function computeOverall(
  scoreArr: Array<{ dim_id: number; score: number }>,
  db: AppState,
  weightsVersionId: number,
): number {
  const weights = activeWeights(db, weightsVersionId);
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0) || 1;
  let final = 0;

  for (const category of db.categories) {
    const dimensions = db.dimensions.filter((dimension) => dimension.category_key === category.key);
    let sum = 0;
    let count = 0;

    for (const dimension of dimensions) {
      const score = scoreArr.find((item) => item.dim_id === dimension.id);
      sum += score?.score || 0;
      count += 1;
    }

    const average = count ? sum / count : 0;
    final += (average / 10) * ((weights[category.key] || 0) / totalWeight) * 100;
  }

  return Math.round(final);
}

export function activeRubricVersion(db: AppState): number {
  return db.rubric_versions.at(-1)?.id || 1;
}

export function activeWeightsVersion(db: AppState): number {
  return db.weights_versions.at(-1)?.id || 1;
}
