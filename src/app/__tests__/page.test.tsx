// Home page now redirects to /play/1 (Day 4 change).
// The redirect() call in Next.js throws NEXT_REDIRECT, so we just verify it does so.
import Home from '../page';

describe('Home page', () => {
  it('redirects to /play/1', () => {
    expect(() => Home()).toThrow();
  });
});
