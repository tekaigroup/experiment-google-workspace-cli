import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatOutput,
  formatEmailList,
  formatCalendarList,
  formatEventList,
  formatFileList,
  formatProfileList,
  formatDate,
  formatSize,
  getMimeTypeLabel,
} from './output.js';
import type {
  EmailMessage,
  Calendar,
  CalendarEvent,
  DriveFile,
} from '../types/index.js';

describe('formatSize', () => {
  it('returns "0 B" for 0 bytes', () => {
    expect(formatSize(0)).toBe('0 B');
  });

  it('formats bytes correctly', () => {
    expect(formatSize(500)).toBe('500 B');
  });

  it('formats kilobytes correctly', () => {
    expect(formatSize(1024)).toBe('1 KB');
    expect(formatSize(1536)).toBe('1.5 KB');
  });

  it('formats megabytes correctly', () => {
    expect(formatSize(1048576)).toBe('1 MB');
    expect(formatSize(5242880)).toBe('5 MB');
  });

  it('formats gigabytes correctly', () => {
    expect(formatSize(1073741824)).toBe('1 GB');
  });

  it('formats terabytes correctly', () => {
    expect(formatSize(1099511627776)).toBe('1 TB');
  });
});

describe('getMimeTypeLabel', () => {
  it('maps Google Apps MIME types', () => {
    expect(getMimeTypeLabel('application/vnd.google-apps.folder')).toBe('Folder');
    expect(getMimeTypeLabel('application/vnd.google-apps.document')).toBe('Google Doc');
    expect(getMimeTypeLabel('application/vnd.google-apps.spreadsheet')).toBe('Google Sheet');
    expect(getMimeTypeLabel('application/vnd.google-apps.presentation')).toBe('Google Slides');
    expect(getMimeTypeLabel('application/vnd.google-apps.form')).toBe('Google Form');
  });

  it('maps common MIME types', () => {
    expect(getMimeTypeLabel('application/pdf')).toBe('PDF');
    expect(getMimeTypeLabel('image/png')).toBe('PNG Image');
    expect(getMimeTypeLabel('image/jpeg')).toBe('JPEG Image');
    expect(getMimeTypeLabel('text/plain')).toBe('Text File');
    expect(getMimeTypeLabel('application/zip')).toBe('ZIP Archive');
  });

  it('extracts subtype for unknown MIME types', () => {
    expect(getMimeTypeLabel('application/xml')).toBe('XML');
    expect(getMimeTypeLabel('text/csv')).toBe('CSV');
  });
});

describe('formatDate', () => {
  let realDate: typeof Date;

  beforeEach(() => {
    realDate = globalThis.Date;
  });

  afterEach(() => {
    globalThis.Date = realDate;
    vi.restoreAllMocks();
  });

  it('returns the original string for invalid dates', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });

  it('formats dates from previous years with full date', () => {
    // Mock "now" to be 2026-03-14
    const mockNow = new Date(2026, 2, 14, 12, 0, 0);
    vi.setSystemTime(mockNow);

    const result = formatDate('2024-06-15T10:00:00Z');
    expect(result).toContain('Jun');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('formats dates from this year without the year', () => {
    const mockNow = new Date(2026, 2, 14, 12, 0, 0);
    vi.setSystemTime(mockNow);

    const result = formatDate('2026-01-15T10:00:00Z');
    expect(result).toContain('Jan');
    expect(result).toContain('15');
    expect(result).not.toContain('2026');
  });
});

describe('formatOutput', () => {
  const data = [
    { name: 'Alice', age: 30 },
    { name: 'Bob', age: 25 },
  ];

  it('formats as JSON', () => {
    const result = formatOutput(data, 'json');
    expect(JSON.parse(result)).toEqual(data);
  });

  it('returns "No data to display" for empty arrays in table format', () => {
    expect(formatOutput([], 'table')).toBe('No data to display');
  });

  it('formats a table with headers from object keys', () => {
    const result = formatOutput(data, 'table');
    expect(result).toContain('Alice');
    expect(result).toContain('Bob');
  });

  it('formats non-arrays as JSON in table mode', () => {
    const result = formatOutput({ key: 'val' }, 'table');
    expect(JSON.parse(result)).toEqual({ key: 'val' });
  });

  it('formats text as newline-separated JSON strings', () => {
    const result = formatOutput(data, 'text');
    const lines = result.split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0])).toEqual(data[0]);
  });

  it('formats non-array text as string', () => {
    expect(formatOutput('hello', 'text')).toBe('hello');
  });
});

describe('formatEmailList', () => {
  const emails: EmailMessage[] = [
    {
      id: '1',
      threadId: 't1',
      subject: 'Test Subject',
      from: 'alice@example.com',
      to: 'bob@example.com',
      date: '2024-01-15T10:00:00Z',
      snippet: 'Hello',
      labels: ['INBOX'],
      isUnread: true,
    },
  ];

  it('returns "No emails found" for empty list', () => {
    expect(formatEmailList([], 'json')).toBe('No emails found');
  });

  it('formats as JSON', () => {
    const result = formatEmailList(emails, 'json');
    expect(JSON.parse(result)).toEqual(emails);
  });

  it('formats as text with unread indicator', () => {
    const result = formatEmailList(emails, 'text');
    expect(result).toContain('[UNREAD]');
    expect(result).toContain('alice@example.com');
    expect(result).toContain('Test Subject');
  });

  it('formats as text without unread indicator for read emails', () => {
    const readEmails = [{ ...emails[0], isUnread: false }];
    const result = formatEmailList(readEmails, 'text');
    expect(result).not.toContain('[UNREAD]');
  });
});

describe('formatCalendarList', () => {
  const calendars: Calendar[] = [
    {
      id: 'cal1',
      summary: 'Work Calendar',
      primary: true,
      accessRole: 'owner',
    },
    {
      id: 'cal2',
      summary: 'Personal',
      primary: false,
      accessRole: 'reader',
    },
  ];

  it('returns "No calendars found" for empty list', () => {
    expect(formatCalendarList([], 'json')).toBe('No calendars found');
  });

  it('formats as JSON', () => {
    const result = formatCalendarList(calendars, 'json');
    expect(JSON.parse(result)).toEqual(calendars);
  });

  it('formats as text with primary indicator', () => {
    const result = formatCalendarList(calendars, 'text');
    expect(result).toContain('[PRIMARY]');
    expect(result).toContain('Work Calendar');
    expect(result).toContain('Personal');
  });
});

describe('formatEventList', () => {
  const events: CalendarEvent[] = [
    {
      id: 'ev1',
      calendarId: 'primary',
      summary: 'Team Meeting',
      start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T11:00:00Z',
      location: 'Room 101',
      status: 'confirmed',
    },
  ];

  it('returns "No events found" for empty list', () => {
    expect(formatEventList([], 'json')).toBe('No events found');
  });

  it('formats as JSON', () => {
    const result = formatEventList(events, 'json');
    expect(JSON.parse(result)).toEqual(events);
  });

  it('formats as text with location', () => {
    const result = formatEventList(events, 'text');
    expect(result).toContain('Team Meeting');
    expect(result).toContain('Room 101');
  });

  it('formats events without location', () => {
    const noLocation = [{ ...events[0], location: undefined }];
    const result = formatEventList(noLocation, 'text');
    expect(result).toContain('Team Meeting');
    expect(result).not.toContain('@');
  });
});

describe('formatFileList', () => {
  const files: DriveFile[] = [
    {
      id: 'f1',
      name: 'document.pdf',
      mimeType: 'application/pdf',
      size: '1048576',
      modifiedTime: '2024-01-15T10:00:00Z',
    },
  ];

  it('returns "No files found" for empty list', () => {
    expect(formatFileList([], 'json')).toBe('No files found');
  });

  it('formats as JSON', () => {
    const result = formatFileList(files, 'json');
    expect(JSON.parse(result)).toEqual(files);
  });

  it('formats as text with size', () => {
    const result = formatFileList(files, 'text');
    expect(result).toContain('document.pdf');
    expect(result).toContain('1 MB');
  });
});

describe('formatProfileList', () => {
  const profiles = [
    { name: 'work', email: 'work@example.com', isDefault: true },
    { name: 'personal', email: undefined, isDefault: false },
  ];

  it('returns "No profiles found" for empty list', () => {
    expect(formatProfileList([], 'json')).toBe('No profiles found');
  });

  it('formats as JSON', () => {
    const result = formatProfileList(profiles, 'json');
    expect(JSON.parse(result)).toEqual(profiles);
  });

  it('formats as text with default indicator', () => {
    const result = formatProfileList(profiles, 'text');
    expect(result).toContain('work');
    expect(result).toContain('(default)');
    expect(result).toContain('personal');
  });
});
