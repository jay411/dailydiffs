import {
  calculateRoundScore,
  calculateSessionScore,
  getRoundMultiplier,
  type RoundResultInput,
} from "../scoring";

describe("getRoundMultiplier", () => {
  it("returns correct multipliers for rounds 1-5", () => {
    expect(getRoundMultiplier(1)).toBe(1.0);
    expect(getRoundMultiplier(2)).toBe(1.2);
    expect(getRoundMultiplier(3)).toBe(1.5);
    expect(getRoundMultiplier(4)).toBe(2.0);
    expect(getRoundMultiplier(5)).toBe(3.0);
  });

  it("defaults to 1.0 for unknown rounds", () => {
    expect(getRoundMultiplier(0)).toBe(1.0);
    expect(getRoundMultiplier(99)).toBe(1.0);
  });
});

describe("calculateRoundScore", () => {
  const baseInput: RoundResultInput = {
    round: 3,
    differencesFound: 4,
    totalDifferences: 5,
    timeSeconds: 35,
  };

  it("matches the example from GAMEPLAY.md", () => {
    const result = calculateRoundScore(baseInput);
    expect(result.basePoints).toBe(400);
    expect(result.timeBonus).toBe(265);
    expect(result.multiplier).toBe(1.5);
    expect(result.roundScore).toBe(998);
  });

  it("clamps differencesFound between 0 and totalDifferences", () => {
    expect(
      calculateRoundScore({ ...baseInput, differencesFound: -2 }).basePoints,
    ).toBe(0);
    expect(
      calculateRoundScore({ ...baseInput, differencesFound: 999 }).basePoints,
    ).toBe(500);
  });

  it("never gives a negative time bonus", () => {
    expect(
      calculateRoundScore({ ...baseInput, timeSeconds: 300 }).timeBonus,
    ).toBe(0);
    expect(
      calculateRoundScore({ ...baseInput, timeSeconds: 500 }).timeBonus,
    ).toBe(0);
  });

  it("handles non-finite or negative time as 0 seconds", () => {
    expect(
      calculateRoundScore({ ...baseInput, timeSeconds: -10 }).timeBonus,
    ).toBe(300);
    expect(
      calculateRoundScore({ ...baseInput, timeSeconds: Number.NaN })
        .timeBonus,
    ).toBe(300);
  });
});

describe("calculateSessionScore", () => {
  it("sums round scores and times across rounds", () => {
    const rounds: RoundResultInput[] = [
      { round: 1, differencesFound: 5, totalDifferences: 5, timeSeconds: 60 },
      { round: 2, differencesFound: 4, totalDifferences: 5, timeSeconds: 45 },
    ];

    const r1 = calculateRoundScore(rounds[0]);
    const r2 = calculateRoundScore(rounds[1]);

    const session = calculateSessionScore(rounds);
    expect(session.totalScore).toBe(r1.roundScore + r2.roundScore);
    expect(session.totalTimeSeconds).toBe(105);
  });
});

