import { canMerge, mergeResult } from '../merge';

describe('merge rules', () => {
  test('1 + 2 ⇒ 3', () => {
    expect(canMerge(1, 2)).toBe(true);
    expect(mergeResult(1, 2)).toBe(3);
  });

  test('2 + 1 ⇒ 3 (order independent)', () => {
    expect(canMerge(2, 1)).toBe(true);
    expect(mergeResult(2, 1)).toBe(3);
  });

  test('3 + 3 ⇒ 6', () => {
    expect(canMerge(3, 3)).toBe(true);
    expect(mergeResult(3, 3)).toBe(6);
  });

  test('6 + 6 ⇒ 12', () => {
    expect(canMerge(6, 6)).toBe(true);
    expect(mergeResult(6, 6)).toBe(12);
  });

  test('12 + 12 ⇒ 24', () => {
    expect(canMerge(12, 12)).toBe(true);
    expect(mergeResult(12, 12)).toBe(24);
  });

  test('48 + 48 ⇒ 96', () => {
    expect(canMerge(48, 48)).toBe(true);
    expect(mergeResult(48, 48)).toBe(96);
  });

  test('1 + 1 does NOT merge', () => {
    expect(canMerge(1, 1)).toBe(false);
  });

  test('2 + 2 does NOT merge', () => {
    expect(canMerge(2, 2)).toBe(false);
  });

  test('1 + 3 does NOT merge', () => {
    expect(canMerge(1, 3)).toBe(false);
  });

  test('2 + 3 does NOT merge', () => {
    expect(canMerge(2, 3)).toBe(false);
  });

  test('3 + 6 does NOT merge (unequal ≥ 3)', () => {
    expect(canMerge(3, 6)).toBe(false);
  });

  test('6 + 12 does NOT merge', () => {
    expect(canMerge(6, 12)).toBe(false);
  });

  test('empty cells (0) never merge', () => {
    expect(canMerge(0, 0)).toBe(false);
    expect(canMerge(0, 1)).toBe(false);
    expect(canMerge(3, 0)).toBe(false);
  });
});
