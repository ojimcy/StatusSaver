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

export async function storeMessage(
  msg: Omit<DeletedMessage, 'id'>,
): Promise<number> {
  const db = await getDatabase();
  const [result] = await db.executeSql(
    `INSERT INTO deleted_messages
       (contact_name, message_text, group_name, is_group, timestamp, is_read, thumbnail_base64, created_at, package_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

export async function getMessages(
  filter?: MessageFilter,
  packageName?: string,
): Promise<DeletedMessage[]> {
  const db = await getDatabase();
  const conditions: string[] = [];
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

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

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
  const conditions = ['contact_name = ?'];
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
  const whereClause = packageName ? 'WHERE package_name = ?' : '';
  const subWhereClause = packageName
    ? 'AND d2.package_name = ?'
    : '';
  const params: any[] = packageName
    ? [packageName, packageName]
    : [];

  const [results] = await db.executeSql(
    `SELECT
       contact_name,
       COUNT(*) as count,
       (SELECT message_text FROM deleted_messages d2
        WHERE d2.contact_name = d1.contact_name ${subWhereClause}
        ORDER BY timestamp DESC LIMIT 1) as last_message
     FROM deleted_messages d1
     ${whereClause}
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
  await db.executeSql('DELETE FROM deleted_messages');
}

export async function exportMessages(): Promise<string> {
  const db = await getDatabase();
  const [results] = await db.executeSql(
    'SELECT * FROM deleted_messages ORDER BY timestamp ASC',
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

/** Deletes messages older than the specified number of days. Returns count deleted. */
export async function autoExpire(days: number): Promise<number> {
  const db = await getDatabase();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const [result] = await db.executeSql(
    'DELETE FROM deleted_messages WHERE created_at < ?',
    [cutoff],
  );
  return result.rowsAffected;
}
