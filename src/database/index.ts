import SQLite, {SQLiteDatabase} from 'react-native-sqlite-storage';
import {CREATE_MESSAGES_TABLE, CREATE_INDEXES} from './migrations';

SQLite.enablePromise(true);

const DATABASE_NAME = 'statussaver.db';

let dbInstance: SQLiteDatabase | null = null;

async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.executeSql(CREATE_MESSAGES_TABLE);
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
