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
    package_name TEXT DEFAULT 'com.whatsapp',
    notification_key TEXT,
    is_deleted INTEGER DEFAULT 0
  );
`;

export const CREATE_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_contact ON deleted_messages(contact_name);',
  'CREATE INDEX IF NOT EXISTS idx_timestamp ON deleted_messages(timestamp);',
  'CREATE INDEX IF NOT EXISTS idx_notification_key ON deleted_messages(notification_key);',
  'CREATE INDEX IF NOT EXISTS idx_is_deleted ON deleted_messages(is_deleted);',
];
