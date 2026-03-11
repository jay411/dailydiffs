import { render, screen, waitFor } from '@testing-library/react';
import Home from '../page';

describe('Home page', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ profile: null }),
      } as Response)
    ) as jest.Mock;
  });

  it('renders title and play button', async () => {
    render(<Home />);
    expect(screen.getByRole('heading', { name: /dailydiffs/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /play today's puzzle/i })).toHaveAttribute('href', '/play/1');
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/me');
    });
  });
});
