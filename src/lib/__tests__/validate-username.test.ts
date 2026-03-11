import { validateUsername } from '../validate-username';

describe('validateUsername', () => {
  it('accepts valid usernames', () => {
    expect(validateUsername('abc').valid).toBe(true);
    expect(validateUsername('user_name').valid).toBe(true);
    expect(validateUsername('User123').valid).toBe(true);
    expect(validateUsername('a'.repeat(16)).valid).toBe(true);
  });

  it('rejects too short', () => {
    expect(validateUsername('ab').valid).toBe(false);
    expect(validateUsername('a').valid).toBe(false);
    expect(validateUsername('').valid).toBe(false);
  });

  it('rejects too long', () => {
    expect(validateUsername('a'.repeat(17)).valid).toBe(false);
  });

  it('rejects when not starting with letter', () => {
    expect(validateUsername('1user').valid).toBe(false);
    expect(validateUsername('_user').valid).toBe(false);
  });

  it('rejects invalid characters', () => {
    expect(validateUsername('user-name').valid).toBe(false);
    expect(validateUsername('user name').valid).toBe(false);
    expect(validateUsername('user@x').valid).toBe(false);
  });

  it('rejects blocked words', () => {
    expect(validateUsername('admin').valid).toBe(false);
    expect(validateUsername('dailydiffs').valid).toBe(false);
    expect(validateUsername('official').valid).toBe(false);
  });

  it('rejects prompt-injection-like patterns', () => {
    expect(validateUsername('ignoreme').valid).toBe(false);
    expect(validateUsername('system').valid).toBe(false);
  });
});
