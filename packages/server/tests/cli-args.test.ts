import { describe, it, expect } from 'vitest';
import { parseArgs, shouldOpenBrowser } from '../src/cli-args.js';

describe('parseArgs', () => {
  it('domyślnie: realny tryb, port 8123, open=auto, bez help', () => {
    expect(parseArgs([])).toEqual({ port: 8123, demo: false, open: 'auto', help: false });
  });

  it('--open wymusza otwarcie (always), --demo, --port <n>', () => {
    expect(parseArgs(['--demo', '--open', '--port', '9000'])).toEqual({
      port: 9000, demo: true, open: 'always', help: false,
    });
  });

  it('--no-open wyłącza otwarcie (never)', () => {
    expect(parseArgs(['--no-open']).open).toBe('never');
  });

  it('obsługuje --port=9001 i -p 9002', () => {
    expect(parseArgs(['--port=9001']).port).toBe(9001);
    expect(parseArgs(['-p', '9002']).port).toBe(9002);
  });

  it('obsługuje -h / --help', () => {
    expect(parseArgs(['-h']).help).toBe(true);
    expect(parseArgs(['--help']).help).toBe(true);
  });

  it('rzuca na nieprawidłowy port', () => {
    expect(() => parseArgs(['--port', 'abc'])).toThrow();
    expect(() => parseArgs(['--port', '99999'])).toThrow();
  });

  it('rzuca na nieznaną opcję', () => {
    expect(() => parseArgs(['--cos'])).toThrow(/Nieznana opcja/);
  });

  it('rzuca gdy --port/-p bez wartości', () => {
    expect(() => parseArgs(['-p'])).toThrow();
    expect(() => parseArgs(['--port'])).toThrow();
    expect(() => parseArgs(['--port='])).toThrow();
  });
});

describe('shouldOpenBrowser', () => {
  it('always: zawsze true (nawet w CI / bez TTY)', () => {
    expect(shouldOpenBrowser('always', { ci: true, isTTY: false })).toBe(true);
    expect(shouldOpenBrowser('always', { ci: false, isTTY: true })).toBe(true);
  });

  it('never: zawsze false (nawet interaktywnie)', () => {
    expect(shouldOpenBrowser('never', { ci: false, isTTY: true })).toBe(false);
  });

  it('auto: otwiera tylko interaktywnie (nie CI i jest TTY)', () => {
    expect(shouldOpenBrowser('auto', { ci: false, isTTY: true })).toBe(true);
    expect(shouldOpenBrowser('auto', { ci: true, isTTY: true })).toBe(false);
    expect(shouldOpenBrowser('auto', { ci: false, isTTY: false })).toBe(false);
    expect(shouldOpenBrowser('auto', { ci: true, isTTY: false })).toBe(false);
  });
});
