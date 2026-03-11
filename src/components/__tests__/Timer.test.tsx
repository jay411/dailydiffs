import { render, screen } from '@testing-library/react';
import { Timer } from '../Timer';

describe('Timer', () => {
  it('formats seconds as MM:SS', () => {
    render(<Timer seconds={0} />);
    expect(screen.getByText('00:00')).toBeInTheDocument();
  });

  it('formats 65 seconds as 01:05', () => {
    render(<Timer seconds={65} />);
    expect(screen.getByText('01:05')).toBeInTheDocument();
  });

  it('formats 3661 seconds as 61:01', () => {
    render(<Timer seconds={3661} />);
    expect(screen.getByText('61:01')).toBeInTheDocument();
  });
});
