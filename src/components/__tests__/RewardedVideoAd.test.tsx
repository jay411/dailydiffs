import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RewardedVideoAd } from '../ads/RewardedVideoAd';

// Mock PostHog
jest.mock('@/lib/posthog', () => ({
  trackEvent: jest.fn(),
  EVENTS: {
    AD_REWARDED_STARTED: 'ad_rewarded_started',
    AD_REWARDED_COMPLETED: 'ad_rewarded_completed',
    AD_REWARDED_SKIPPED: 'ad_rewarded_skipped',
    AD_FAILED_TO_LOAD: 'ad_failed_to_load',
  },
}));

const { trackEvent } = require('@/lib/posthog');

describe('RewardedVideoAd (placeholder mode)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // No IMA SDK and no env var — runs in placeholder mode
    delete process.env.NEXT_PUBLIC_ADMOB_REWARDED_AD_UNIT_ID;
  });

  it('renders the unlock prompt', () => {
    render(<RewardedVideoAd onComplete={jest.fn()} onSkip={jest.fn()} />);
    expect(screen.getByText(/Unlock Round 5/i)).toBeTruthy();
    expect(screen.getByText(/Watch a short ad/i)).toBeTruthy();
  });

  it('shows "Watch Ad" button in placeholder mode', () => {
    render(<RewardedVideoAd onComplete={jest.fn()} onSkip={jest.fn()} />);
    expect(screen.getByText(/Watch Ad/i)).toBeTruthy();
  });

  it('renders "Skip → go to results" link', () => {
    render(<RewardedVideoAd onComplete={jest.fn()} onSkip={jest.fn()} />);
    expect(screen.getByText(/Skip/i)).toBeTruthy();
  });

  it('calls onSkip when skip button is clicked', () => {
    const onSkip = jest.fn();
    render(<RewardedVideoAd onComplete={jest.fn()} onSkip={onSkip} />);
    fireEvent.click(screen.getByText(/Skip/i));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('fires ad_rewarded_skipped event on skip', () => {
    render(<RewardedVideoAd onComplete={jest.fn()} onSkip={jest.fn()} />);
    fireEvent.click(screen.getByText(/Skip/i));
    expect(trackEvent).toHaveBeenCalledWith('ad_rewarded_skipped');
  });

  it('fires ad_rewarded_started event when Watch Ad is clicked', () => {
    render(<RewardedVideoAd onComplete={jest.fn()} onSkip={jest.fn()} />);
    fireEvent.click(screen.getByText(/Watch Ad/i));
    expect(trackEvent).toHaveBeenCalledWith('ad_rewarded_started');
  });
});
