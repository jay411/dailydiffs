import { render, screen } from '@testing-library/react';
import Home from '../page';

describe('Home page', () => {
  it('renders title and play button', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { name: /dailydiffs/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /play today's puzzle/i })).toHaveAttribute('href', '/play/1');
  });
});
