import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CalendarClient } from './calendar-client.js';
import type { OAuth2Client } from 'google-auth-library';

// Create a minimal mock auth client (parseDateTime doesn't use it)
const mockAuth = {} as OAuth2Client;

// Mock googleapis to avoid actual API initialization
vi.mock('googleapis', () => ({
  google: {
    calendar: () => ({
      calendarList: { list: vi.fn() },
      events: { list: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(), get: vi.fn() },
    }),
  },
}));

describe('CalendarClient.parseDateTime', () => {
  const client = new CalendarClient(mockAuth);

  describe('with fake timers', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2025, 5, 15, 8, 0, 0));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('parses time with am/pm suffix', () => {
      const result = client.parseDateTime('2pm');
      const date = new Date(result);
      expect(date.getHours()).toBe(14);
      expect(date.getMinutes()).toBe(0);
    });

    it('parses time with minutes and am/pm suffix', () => {
      const result = client.parseDateTime('3:30pm');
      const date = new Date(result);
      expect(date.getHours()).toBe(15);
      expect(date.getMinutes()).toBe(30);
    });

    it('parses "tomorrow" with time', () => {
      const result = client.parseDateTime('tomorrow 2pm');
      const date = new Date(result);
      expect(date.getDate()).toBe(16);
      expect(date.getHours()).toBe(14);
    });

    it('parses "today" with time', () => {
      const result = client.parseDateTime('today 10:30am');
      const date = new Date(result);
      expect(date.getDate()).toBe(15);
      expect(date.getHours()).toBe(10);
      expect(date.getMinutes()).toBe(30);
    });

    it('handles 12am correctly (midnight)', () => {
      const result = client.parseDateTime('12am');
      const date = new Date(result);
      expect(date.getHours()).toBe(0);
    });

    it('handles 12pm correctly (noon)', () => {
      const result = client.parseDateTime('12pm');
      const date = new Date(result);
      expect(date.getHours()).toBe(12);
    });
  });

  it('parses ISO 8601 format', () => {
    const result = client.parseDateTime('2025-01-15T10:00:00Z');
    expect(result).toBe('2025-01-15T10:00:00.000Z');
  });

  it('parses ISO 8601 format with timezone offset', () => {
    const result = client.parseDateTime('2025-06-15T10:00:00-05:00');
    expect(result).toBe('2025-06-15T15:00:00.000Z');
  });

  it('parses "YYYY-MM-DD HH:MM" format', () => {
    const result = client.parseDateTime('2025-01-15 10:00');
    const date = new Date(result);
    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(0); // January
    expect(date.getDate()).toBe(15);
  });

  it('throws on unparseable input', () => {
    expect(() => client.parseDateTime('not-a-date')).toThrow('Unable to parse date/time');
  });
});

describe('CalendarClient.parseEvent', () => {
  const client = new CalendarClient(mockAuth);

  it('parses a complete event', () => {
    const rawEvent = {
      id: 'ev123',
      summary: 'Team Standup',
      description: 'Daily sync',
      start: { dateTime: '2025-01-15T10:00:00Z' },
      end: { dateTime: '2025-01-15T10:30:00Z' },
      location: 'Room A',
      attendees: [{ email: 'alice@test.com' }, { email: 'bob@test.com' }],
      status: 'confirmed',
    };

    const result = client.parseEvent(rawEvent, 'primary');
    expect(result).toEqual({
      id: 'ev123',
      calendarId: 'primary',
      summary: 'Team Standup',
      description: 'Daily sync',
      start: '2025-01-15T10:00:00Z',
      end: '2025-01-15T10:30:00Z',
      location: 'Room A',
      attendees: ['alice@test.com', 'bob@test.com'],
      status: 'confirmed',
    });
  });

  it('handles missing fields with defaults', () => {
    const rawEvent = {
      start: { date: '2025-01-15' },
      end: { date: '2025-01-16' },
    };

    const result = client.parseEvent(rawEvent, 'cal1');
    expect(result.id).toBe('');
    expect(result.summary).toBe('(No title)');
    expect(result.start).toBe('2025-01-15');
    expect(result.attendees).toEqual([]);
    expect(result.status).toBe('confirmed');
  });

  it('filters empty attendee emails', () => {
    const rawEvent = {
      start: { dateTime: '2025-01-15T10:00:00Z' },
      end: { dateTime: '2025-01-15T11:00:00Z' },
      attendees: [{ email: 'valid@test.com' }, { email: '' }, {}],
    };

    const result = client.parseEvent(rawEvent, 'primary');
    expect(result.attendees).toEqual(['valid@test.com']);
  });
});
