import SQLite, {SQLiteDatabase} from 'react-native-sqlite-storage';
import {CREATE_MESSAGES_TABLE, CREATE_INDEXES} from './migrations';

SQLite.enablePromise(true);

const DATABASE_NAME = 'statussaver.db';

let dbInstance: SQLiteDatabase | null = null;

async function runMigrations(db: SQLiteDatabase): Promise<void> {
  // Ensure meta table exists for tracking migration version
  await db.executeSql(
    'CREATE TABLE IF NOT EXISTS _meta (key TEXT PRIMARY KEY, value TEXT);',
  );

  await db.executeSql(CREATE_MESSAGES_TABLE);

  // Migration v1: clear messages that were captured before the deleted-only filter
  const [vResult] = await db.executeSql(
    "SELECT value FROM _meta WHERE key = 'schema_version';",
  );
  const currentVersion =
    vResult.rows.length > 0 ? parseInt(vResult.rows.item(0).value, 10) : 0;

  if (currentVersion < 2) {
    // v1+v2: wipe all messages captured before the deleted-only + summary filters
    await db.executeSql('DELETE FROM deleted_messages;');
  }

  if (currentVersion < 3) {
    // v3: add package_name column for variant filtering
    try {
      await db.executeSql(
        "ALTER TABLE deleted_messages ADD COLUMN package_name TEXT DEFAULT 'com.whatsapp';",
      );
    } catch {
      // Column may already exist if table was freshly created
    }
  }

  if (currentVersion < 5) {
    // v5: clear previous data; now using debounced removal + text detection
    await db.executeSql('DELETE FROM deleted_messages;');
  }

  if (currentVersion < 6) {
    // v6: add notification_key + is_deleted columns for DB-backed message buffer
    try {
      await db.executeSql(
        'ALTER TABLE deleted_messages ADD COLUMN notification_key TEXT;',
      );
    } catch {
      // Column may already exist
    }
    try {
      await db.executeSql(
        'ALTER TABLE deleted_messages ADD COLUMN is_deleted INTEGER DEFAULT 0;',
      );
    } catch {
      // Column may already exist
    }
    // Clear old data — fresh start with new detection approach
    await db.executeSql('DELETE FROM deleted_messages;');
  }

  if (currentVersion < 7) {
    // v7: clean up system notifications that were captured before native filters
    await db.executeSql(
      "DELETE FROM deleted_messages WHERE message_text IN ('Checking for new messages', 'Downloading messages') OR contact_name IN ('WhatsApp', 'WhatsApp Business', 'WA Business');",
    );
  }

  if (currentVersion < 8) {
    // v8: wipe all data — recency-based removal filtering replaces old detection logic
    await db.executeSql('DELETE FROM deleted_messages;');
  }

  await db.executeSql(
    "INSERT OR REPLACE INTO _meta (key, value) VALUES ('schema_version', '8');",
  );

  // Create indexes after all migrations (columns must exist first)
  for (const indexSql of CREATE_INDEXES) {
    await db.executeSql(indexSql);
  }
}

export async function getDatabase(): Promise<SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  const db = await SQLite.openDatabase({
    name: DATABASE_NAME,
    location: 'default',
  });

  await runMigrations(db);
  dbInstance = db;
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
}
