import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';
import { registerCalendarCommands } from './calendar.js';
import { getActiveProfile } from '../lib/config.js';
import { formatCalendarList, formatEventList } from '../lib/output.js';

// Mock all dependencies that commands use
vi.mock('../lib/auth.js', () => ({
  getAuthenticatedClient: vi.fn().mockResolvedValue({}),
}));

vi.mock('../lib/config.js', () => ({
  getActiveProfile: vi.fn().mockReturnValue('test-profile'),
}));

vi.mock('../lib/output.js', () => ({
  formatCalendarList: vi.fn().mockReturnValue('formatted-calendars'),
  formatEventList: vi.fn().mockReturnValue('formatted-events'),
  print: vi.fn(),
  printSuccess: vi.fn(),
  printError: vi.fn(),
}));

vi.mock('../lib/calendar-client.js', () => ({
  CalendarClient: class MockCalendarClient {
    listCalendars = vi.fn().mockResolvedValue([]);
    listEvents = vi.fn().mockResolvedValue([]);
    search = vi.fn().mockResolvedValue([]);
  },
}));

describe('calendar commands - global options via optsWithGlobals', () => {
  let program: Command;

  beforeEach(() => {
    vi.mocked(getActiveProfile).mockClear();
    vi.mocked(formatCalendarList).mockClear();
    vi.mocked(formatEventList).mockClear();

    program = new Command();
    program.option('--profile <name>', 'Profile to use');
    program.option('--format <type>', 'Output format');
    registerCalendarCommands(program);
  });

  it('passes global --profile flag to calendar list', async () => {
    await program.parseAsync(['node', 'test', '--profile', 'work', 'calendar', 'list']);

    expect(getActiveProfile).toHaveBeenCalledWith('work');
  });

  it('passes global --format flag to calendar list', async () => {
    await program.parseAsync(['node', 'test', '--format', 'json', 'calendar', 'list']);

    expect(formatCalendarList).toHaveBeenCalledWith(expect.anything(), 'json');
  });

  it('defaults format to table when --format is not specified', async () => {
    await program.parseAsync(['node', 'test', 'calendar', 'list']);

    expect(formatCalendarList).toHaveBeenCalledWith(expect.anything(), 'table');
  });

  it('passes global --profile flag to calendar events', async () => {
    await program.parseAsync(['node', 'test', '--profile', 'personal', 'calendar', 'events']);

    expect(getActiveProfile).toHaveBeenCalledWith('personal');
  });

  it('passes global --format flag to calendar events', async () => {
    await program.parseAsync(['node', 'test', '--format', 'text', 'calendar', 'events']);

    expect(formatEventList).toHaveBeenCalledWith(expect.anything(), 'text');
  });
});
