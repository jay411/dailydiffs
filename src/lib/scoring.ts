export type RoundResultInput = {
  round: number;
  differencesFound: number;
  totalDifferences: number;
  timeSeconds: number;
};

export type RoundScoreBreakdown = {
  basePoints: number;
  timeBonus: number;
  multiplier: number;
  roundScore: number;
};

export type SessionScoreSummary = {
  totalScore: number;
  totalTimeSeconds: number;
};

export function getRoundMultiplier(round: number): number {
  switch (round) {
    case 1:
      return 1.0;
    case 2:
      return 1.2;
    case 3:
      return 1.5;
    case 4:
      return 2.0;
    case 5:
      return 3.0;
    default:
      return 1.0;
  }
}

export function calculateRoundScore(input: RoundResultInput): RoundScoreBreakdown {
  const clampedFound = Math.max(0, Math.min(input.differencesFound, input.totalDifferences));
  const basePoints = clampedFound * 100;

  const safeTime = Number.isFinite(input.timeSeconds) && input.timeSeconds >= 0 ? input.timeSeconds : 0;
  const timeBonusRaw = 300 - safeTime;
  const timeBonus = timeBonusRaw > 0 ? Math.floor(timeBonusRaw) : 0;

  const multiplier = getRoundMultiplier(input.round);
  const rawScore = (basePoints + timeBonus) * multiplier;
  const roundScore = Math.round(rawScore);

  return {
    basePoints,
    timeBonus,
    multiplier,
    roundScore,
  };
}

export function calculateSessionScore(rounds: RoundResultInput[]): SessionScoreSummary {
  return rounds.reduce<SessionScoreSummary>(
    (acc, round) => {
      const breakdown = calculateRoundScore(round);
      return {
        totalScore: acc.totalScore + breakdown.roundScore,
        totalTimeSeconds: acc.totalTimeSeconds + Math.max(0, round.timeSeconds),
      };
    },
    { totalScore: 0, totalTimeSeconds: 0 },
  );
}

