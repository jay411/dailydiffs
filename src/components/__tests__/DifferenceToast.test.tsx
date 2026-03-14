import { render, screen } from '@testing-library/react';
import { DifferenceToast } from '../DifferenceToast';

describe('DifferenceToast', () => {
  it('renders nothing when message is null', () => {
    const { container } = render(<DifferenceToast message={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the difference description when message is provided', () => {
    render(<DifferenceToast message="Napkin is different color" />);
    expect(screen.getByRole('status')).toHaveTextContent(/Napkin is different color/);
    expect(screen.getByRole('status')).toHaveTextContent('✓');
  });
});
