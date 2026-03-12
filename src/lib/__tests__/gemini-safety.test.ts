import { parseSafetyResponse, parseQAResponse } from '../gemini';

describe('parseSafetyResponse', () => {
  it('returns safe=true when response is clean', () => {
    const result = parseSafetyResponse('{"safe": true, "issues": []}');
    expect(result.safe).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('returns safe=false with issues when unsafe', () => {
    const result = parseSafetyResponse('{"safe": false, "issues": ["nudity detected", "violence"]}');
    expect(result.safe).toBe(false);
    expect(result.issues).toContain('nudity detected');
    expect(result.issues).toContain('violence');
  });

  it('handles JSON wrapped in markdown code block', () => {
    const result = parseSafetyResponse('```json\n{"safe": true, "issues": []}\n```');
    expect(result.safe).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('defaults to safe=false on completely invalid response', () => {
    const result = parseSafetyResponse('This image looks fine to me!');
    expect(result.safe).toBe(false);
    expect(result.issues[0]).toMatch(/Failed to parse/);
  });

  it('defaults to safe=false when safe field is missing', () => {
    const result = parseSafetyResponse('{"issues": ["something"]}');
    expect(result.safe).toBe(false);
  });

  it('defaults to safe=false when safe is null', () => {
    const result = parseSafetyResponse('{"safe": null, "issues": []}');
    expect(result.safe).toBe(false);
  });

  it('handles missing issues array gracefully', () => {
    const result = parseSafetyResponse('{"safe": true}');
    expect(result.safe).toBe(true);
    expect(result.issues).toEqual([]);
  });
});

describe('parseQAResponse', () => {
  it('returns score and empty issues for a passing response', () => {
    const result = parseQAResponse('{"score": 7, "issues": []}');
    expect(result.score).toBe(7);
    expect(result.issues).toHaveLength(0);
  });

  it('returns score with issues', () => {
    const result = parseQAResponse('{"score": 3, "issues": ["differences too subtle"]}');
    expect(result.score).toBe(3);
    expect(result.issues).toContain('differences too subtle');
  });

  it('handles JSON wrapped in markdown code block', () => {
    const result = parseQAResponse('```json\n{"score": 8, "issues": []}\n```');
    expect(result.score).toBe(8);
  });

  it('returns score=0 on invalid response', () => {
    const result = parseQAResponse('Looks good!');
    expect(result.score).toBe(0);
    expect(result.issues[0]).toMatch(/Failed to parse/);
  });

  it('returns score=0 when score field is missing', () => {
    const result = parseQAResponse('{"issues": []}');
    expect(result.score).toBe(0);
  });

  it('handles decimal scores', () => {
    const result = parseQAResponse('{"score": 7.2, "issues": []}');
    expect(result.score).toBe(7.2);
  });
});
