import React from 'react';
import { render, act } from '@testing-library/react';
import { InterstitialAd } from '../ads/InterstitialAd';

// Mock PostHog
jest.mock('@/lib/posthog', () => ({
  trackEvent: jest.fn(),
  EVENTS: { AD_INTERSTITIAL_SHOWN: 'ad_interstitial_shown' },
}));

describe('InterstitialAd', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('calls onComplete after the countdown finishes', () => {
    const onComplete = jest.fn();
    render(<InterstitialAd onComplete={onComplete} durationSeconds={3} />);

    expect(onComplete).not.toHaveBeenCalled();

    act(() => { jest.advanceTimersByTime(1000); });
    expect(onComplete).not.toHaveBeenCalled();

    act(() => { jest.advanceTimersByTime(1000); });
    expect(onComplete).not.toHaveBeenCalled();

    act(() => { jest.advanceTimersByTime(1000); });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('does not call onComplete before countdown finishes', () => {
    const onComplete = jest.fn();
    render(<InterstitialAd onComplete={onComplete} durationSeconds={5} />);

    act(() => { jest.advanceTimersByTime(4000); });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('renders placeholder when no AdSense env vars are set', () => {
    const { getByText } = render(<InterstitialAd onComplete={jest.fn()} />);
    expect(getByText(/advertisement/i)).toBeTruthy();
  });
});
