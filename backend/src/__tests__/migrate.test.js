import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';

// Mock the db module used by migrate.js
const mockQuery = jest.fn();

jest.unstable_mockModule('../db/index.js', () => ({
  db: {
    query: mockQuery,
  },
}));

const { migrate } = await import('../db/migrate.js');

describe('DB migrate runner', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    // Default: resolve with empty rows
    mockQuery.mockResolvedValue({ rows: [] });
  });

  test('applies schema and migrations and records them', async () => {
    // Ensure migrations dir exists and has at least one file
    const migrationsDir = path.join(process.cwd(), 'backend', 'src', 'db', 'migrations');
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));
    expect(files.length).toBeGreaterThan(0);

    // Run migrate
    await migrate();

    // Expect schema.sql executed at least once
    expect(mockQuery.mock.calls.length).toBeGreaterThanOrEqual(2);

    // One of the calls should create migration_history
    const createdMigrationTable = mockQuery.mock.calls.some(call => call[0] && call[0].toString().includes('migration_history'));
    expect(createdMigrationTable).toBe(true);

    // For each migration file, migrate should SELECT then INSERT into migration_history
    const insertCalled = mockQuery.mock.calls.some(call => call[0] && call[0].toString().includes('INSERT INTO migration_history'));
    expect(insertCalled).toBe(true);
  });
});
