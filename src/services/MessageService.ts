import {getDatabase} from '../database';
import type {DeletedMessage, MessageFilter} from '../types';

function rowToMessage(row: any): DeletedMessage {
  return {
    id: row.id,
    contactName: row.contact_name,
    messageText: row.message_text,
    groupName: row.group_name ?? null,
    isGroup: row.is_group === 1,
    timestamp: row.timestamp,
    isRead: row.is_read === 1,
    thumbnailBase64: row.thumbnail_base64 ?? null,
    createdAt: row.created_at,
    packageName: row.package_name ?? 'com.whatsapp',
  };
}

// ---------------------------------------------------------------------------
// Buffer operations — store every incoming message, mark deleted later
// ---------------------------------------------------------------------------

/** Buffer an incoming message. Returns the row id. */
export async function bufferMessage(
  msg: Omit<DeletedMessage, 'id'> & {notificationKey: string},
): Promise<number> {
  const db = await getDatabase();

  // Upsert: if a row with this notification_key exists, update its text
  // (WhatsApp reuses the same key when a notification is updated)
  const [existing] = await db.executeSql(
    'SELECT id FROM deleted_messages WHERE notification_key = ?',
    [msg.notificationKey],
  );

  if (existing.rows.length > 0) {
    const id = existing.rows.item(0).id;
    // Reset is_deleted=0: if the notification was reposted (regrouping),
    // the previous removal was NOT a deletion — it's still alive.
    await db.executeSql(
      'UPDATE deleted_messages SET message_text = ?, timestamp = ?, is_deleted = 0 WHERE id = ?',
      [msg.messageText, msg.timestamp, id],
    );
    return id;
  }

  const [result] = await db.executeSql(
    `INSERT INTO deleted_messages
       (contact_name, message_text, group_name, is_group, timestamp, is_read,
        thumbnail_base64, created_at, package_name, notification_key, is_deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      msg.contactName,
      msg.messageText,
      msg.groupName,
      msg.isGroup ? 1 : 0,
      msg.timestamp,
      msg.isRead ? 1 : 0,
      msg.thumbnailBase64,
      msg.createdAt,
      msg.packageName,
      msg.notificationKey,
    ],
  );
  return result.insertId;
}

/** Mark a buffered message as deleted by notification key. Returns true if found. */
export async function markDeleted(notificationKey: string): Promise<boolean> {
  const db = await getDatabase();
  const [result] = await db.executeSql(
    'UPDATE deleted_messages SET is_deleted = 1 WHERE notification_key = ? AND is_deleted = 0',
    [notificationKey],
  );
  return result.rowsAffected > 0;
}

/** Mark a buffered message as deleted by contact name (latest non-deleted). Returns true if found. */
export async function markDeletedByContact(
  contactName: string,
): Promise<boolean> {
  const db = await getDatabase();
  // Find the most recent buffered (non-deleted) message for this contact
  const [rows] = await db.executeSql(
    'SELECT id FROM deleted_messages WHERE contact_name = ? AND is_deleted = 0 ORDER BY timestamp DESC LIMIT 1',
    [contactName],
  );
  if (rows.rows.length === 0) {
    return false;
  }
  const id = rows.rows.item(0).id;
  await db.executeSql(
    'UPDATE deleted_messages SET is_deleted = 1 WHERE id = ?',
    [id],
  );
  return true;
}

/** Get the original buffered message for a notification key (before it was overwritten). */
export async function getBufferedMessage(
  notificationKey: string,
): Promise<DeletedMessage | null> {
  const db = await getDatabase();
  const [results] = await db.executeSql(
    'SELECT * FROM deleted_messages WHERE notification_key = ?',
    [notificationKey],
  );
  if (results.rows.length === 0) {
    return null;
  }
  return rowToMessage(results.rows.item(0));
}

/** Remove buffered (non-deleted) messages older than the given ms. */
export async function expireBuffer(maxAgeMs: number): Promise<number> {
  const db = await getDatabase();
  const cutoff = Date.now() - maxAgeMs;
  const [result] = await db.executeSql(
    'DELETE FROM deleted_messages WHERE is_deleted = 0 AND created_at < ?',
    [cutoff],
  );
  return result.rowsAffected;
}

// ---------------------------------------------------------------------------
// Legacy — direct store (used by persistOriginal fallback)
// ---------------------------------------------------------------------------

export async function storeMessage(
  msg: Omit<DeletedMessage, 'id'>,
): Promise<number> {
  const db = await getDatabase();
  const [result] = await db.executeSql(
    `INSERT INTO deleted_messages
       (contact_name, message_text, group_name, is_group, timestamp, is_read,
        thumbnail_base64, created_at, package_name, is_deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      msg.contactName,
      msg.messageText,
      msg.groupName,
      msg.isGroup ? 1 : 0,
      msg.timestamp,
      msg.isRead ? 1 : 0,
      msg.thumbnailBase64,
      msg.createdAt,
      msg.packageName,
    ],
  );
  return result.insertId;
}

// ---------------------------------------------------------------------------
// Read operations — UI-facing, only return is_deleted = 1
// ---------------------------------------------------------------------------

export async function getMessages(
  filter?: MessageFilter,
  packageName?: string,
): Promise<DeletedMessage[]> {
  const db = await getDatabase();
  const conditions: string[] = ['is_deleted = 1'];
  const params: any[] = [];

  if (packageName) {
    conditions.push('package_name = ?');
    params.push(packageName);
  }

  if (filter) {
    if (filter.searchQuery) {
      conditions.push('message_text LIKE ?');
      params.push(`%${filter.searchQuery}%`);
    }
    if (filter.contactName) {
      conditions.push('contact_name = ?');
      params.push(filter.contactName);
    }
    if (filter.dateFrom !== null && filter.dateFrom !== undefined) {
      conditions.push('timestamp >= ?');
      params.push(filter.dateFrom);
    }
    if (filter.dateTo !== null && filter.dateTo !== undefined) {
      conditions.push('timestamp <= ?');
      params.push(filter.dateTo);
    }
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const [results] = await db.executeSql(
    `SELECT * FROM deleted_messages ${whereClause} ORDER BY timestamp DESC`,
    params,
  );

  const messages: DeletedMessage[] = [];
  for (let i = 0; i < results.rows.length; i++) {
    messages.push(rowToMessage(results.rows.item(i)));
  }
  return messages;
}

export async function getMessagesByContact(
  contactName: string,
  packageName?: string,
): Promise<DeletedMessage[]> {
  const db = await getDatabase();
  const conditions = ['contact_name = ?', 'is_deleted = 1'];
  const params: any[] = [contactName];

  if (packageName) {
    conditions.push('package_name = ?');
    params.push(packageName);
  }

  const [results] = await db.executeSql(
    `SELECT * FROM deleted_messages WHERE ${conditions.join(' AND ')} ORDER BY timestamp ASC`,
    params,
  );

  const messages: DeletedMessage[] = [];
  for (let i = 0; i < results.rows.length; i++) {
    messages.push(rowToMessage(results.rows.item(i)));
  }
  return messages;
}

export async function getUniqueContacts(
  packageName?: string,
): Promise<{name: string; count: number; lastMessage: string}[]> {
  const db = await getDatabase();
  const conditions = ['is_deleted = 1'];
  const subConditions = ['d2.is_deleted = 1'];

  if (packageName) {
    conditions.push('package_name = ?');
    subConditions.push('d2.package_name = ?');
  }

  const params: any[] = packageName
    ? [packageName, packageName]
    : [];

  const [results] = await db.executeSql(
    `SELECT
       contact_name,
       COUNT(*) as count,
       (SELECT message_text FROM deleted_messages d2
        WHERE d2.contact_name = d1.contact_name AND ${subConditions.join(' AND ')}
        ORDER BY timestamp DESC LIMIT 1) as last_message
     FROM deleted_messages d1
     WHERE ${conditions.join(' AND ')}
     GROUP BY contact_name
     ORDER BY MAX(timestamp) DESC`,
    params,
  );

  const contacts: {name: string; count: number; lastMessage: string}[] = [];
  for (let i = 0; i < results.rows.length; i++) {
    const row = results.rows.item(i);
    contacts.push({
      name: row.contact_name,
      count: row.count,
      lastMessage: row.last_message ?? '',
    });
  }
  return contacts;
}

export async function markAsRead(id: number): Promise<void> {
  const db = await getDatabase();
  await db.executeSql('UPDATE deleted_messages SET is_read = 1 WHERE id = ?', [
    id,
  ]);
}

export async function deleteMessage(id: number): Promise<void> {
  const db = await getDatabase();
  await db.executeSql('DELETE FROM deleted_messages WHERE id = ?', [id]);
}

export async function deleteAllMessages(): Promise<void> {
  const db = await getDatabase();
  await db.executeSql('DELETE FROM deleted_messages WHERE is_deleted = 1');
}

export async function exportMessages(): Promise<string> {
  const db = await getDatabase();
  const [results] = await db.executeSql(
    'SELECT * FROM deleted_messages WHERE is_deleted = 1 ORDER BY timestamp ASC',
  );

  const lines: string[] = [];
  lines.push('=== Deleted Messages Export ===');
  lines.push(`Exported at: ${new Date().toLocaleString()}`);
  lines.push('');

  for (let i = 0; i < results.rows.length; i++) {
    const msg = rowToMessage(results.rows.item(i));
    const date = new Date(msg.timestamp).toLocaleString();
    const prefix = msg.isGroup
      ? `[${msg.groupName}] ${msg.contactName}`
      : msg.contactName;
    lines.push(`${date} - ${prefix}: ${msg.messageText}`);
  }

  return lines.join('\n');
}

/** Deletes confirmed-deleted messages older than the specified number of days. */
export async function autoExpire(days: number): Promise<number> {
  const db = await getDatabase();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const [result] = await db.executeSql(
    'DELETE FROM deleted_messages WHERE is_deleted = 1 AND created_at < ?',
    [cutoff],
  );
  return result.rowsAffected;
}
