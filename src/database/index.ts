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
  for (const indexSql of CREATE_INDEXES) {
    await db.executeSql(indexSql);
  }

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
    await db.executeSql(
      "INSERT OR REPLACE INTO _meta (key, value) VALUES ('schema_version', '3');",
    );
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
