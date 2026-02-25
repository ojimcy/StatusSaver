export const CREATE_MESSAGES_TABLE = `
  CREATE TABLE IF NOT EXISTS deleted_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_name TEXT NOT NULL,
    message_text TEXT NOT NULL,
    group_name TEXT,
    is_group INTEGER DEFAULT 0,
    timestamp INTEGER NOT NULL,
    is_read INTEGER DEFAULT 0,
    thumbnail_base64 TEXT,
    created_at INTEGER NOT NULL,
    package_name TEXT DEFAULT 'com.whatsapp'
  );
`;

export const CREATE_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_contact ON deleted_messages(contact_name);',
  'CREATE INDEX IF NOT EXISTS idx_timestamp ON deleted_messages(timestamp);',
];
