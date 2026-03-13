import { trackEvent, identifyUser, EVENTS } from '../posthog';

// Mock posthog-js
jest.mock('posthog-js', () => ({
  capture: jest.fn(),
  identify: jest.fn(),
  init: jest.fn(),
}));

const posthog = require('posthog-js');

describe('posthog helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('trackEvent', () => {
    it('does nothing when NEXT_PUBLIC_POSTHOG_KEY is not set', () => {
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
      trackEvent(EVENTS.PUZZLE_STARTED);
      expect(posthog.capture).not.toHaveBeenCalled();
    });

    it('calls posthog.capture with event name and properties when key is set', () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test_key';
      Object.defineProperty(global, 'window', { value: {}, writable: true });
      trackEvent(EVENTS.PUZZLE_STARTED, { round: 1 });
      expect(posthog.capture).toHaveBeenCalledWith('puzzle_started', { round: 1 });
    });

    it('calls posthog.capture without properties', () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test_key';
      Object.defineProperty(global, 'window', { value: {}, writable: true });
      trackEvent(EVENTS.LEADERBOARD_VIEWED);
      expect(posthog.capture).toHaveBeenCalledWith('leaderboard_viewed', undefined);
    });
  });

  describe('identifyUser', () => {
    it('calls posthog.identify with userId and traits when key is set', () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test_key';
      Object.defineProperty(global, 'window', { value: {}, writable: true });
      identifyUser('user_123', { email: 'test@example.com' });
      expect(posthog.identify).toHaveBeenCalledWith('user_123', { email: 'test@example.com' });
    });
  });

  describe('EVENTS constants', () => {
    it('exports the expected event names', () => {
      expect(EVENTS.PUZZLE_STARTED).toBe('puzzle_started');
      expect(EVENTS.DIFFERENCE_FOUND).toBe('difference_found');
      expect(EVENTS.DIFFERENCE_WRONG_TAP).toBe('difference_wrong_tap');
      expect(EVENTS.ROUND_COMPLETED).toBe('round_completed');
      expect(EVENTS.SESSION_COMPLETED).toBe('session_completed');
      expect(EVENTS.AD_INTERSTITIAL_SHOWN).toBe('ad_interstitial_shown');
      expect(EVENTS.AD_REWARDED_COMPLETED).toBe('ad_rewarded_completed');
      expect(EVENTS.AD_REWARDED_SKIPPED).toBe('ad_rewarded_skipped');
    });
  });
});
