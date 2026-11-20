import { AppNotification, NotificationType } from '../../src/types.js';
import { query } from '../db/pool.js';

export function mapNotificationRow(row: any): AppNotification {
  return {
    id: row.id,
    recipientRole: row.recipient_role,
    recipientId: row.recipient_id ? String(row.recipient_id) : null,
    orderId: row.order_id ? String(row.order_id) : null,
    agentId: row.agent_id ? String(row.agent_id) : null,
    type: row.type as NotificationType,
    title: row.title,
    message: row.message,
    amount: row.amount ? parseFloat(row.amount) : 0,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

export class NotificationRepository {
  async createNotification(data: {
    recipientRole: 'ADMIN' | 'DELIVERY_AGENT';
    recipientId?: string | number | null;
    orderId?: string | null;
    agentId?: string | null;
    type: NotificationType;
    title: string;
    message: string;
    amount?: number;
  }): Promise<AppNotification> {
    const res = await query(
      `INSERT INTO notifications (
         recipient_role, recipient_id, order_id, agent_id, type, title, message, amount, is_read, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, NOW())
       RETURNING *`,
      [
        data.recipientRole,
        data.recipientId ? String(data.recipientId) : null,
        data.orderId ? String(data.orderId) : null,
        data.agentId ? String(data.agentId) : null,
        data.type,
        data.title,
        data.message,
        data.amount || 0.0,
      ]
    );
    return mapNotificationRow(res.rows[0]);
  }

  async listForAdmin(limit = 50): Promise<AppNotification[]> {
    const res = await query(
      `SELECT * FROM notifications
       WHERE recipient_role = 'ADMIN'
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return res.rows.map(mapNotificationRow);
  }

  async listForAgent(agentId: string, limit = 50): Promise<AppNotification[]> {
    const res = await query(
      `SELECT * FROM notifications
       WHERE recipient_role = 'DELIVERY_AGENT'
         AND (recipient_id = $1 OR recipient_id IS NULL OR agent_id = $1)
       ORDER BY created_at DESC
       LIMIT $2`,
      [String(agentId), limit]
    );
    return res.rows.map(mapNotificationRow);
  }

  async markAsRead(id: number | string): Promise<boolean> {
    const res = await query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1`,
      [id]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async markAllAsReadForAdmin(): Promise<void> {
    await query(
      `UPDATE notifications SET is_read = TRUE WHERE recipient_role = 'ADMIN'`
    );
  }

  async markAllAsReadForAgent(agentId: string): Promise<void> {
    await query(
      `UPDATE notifications SET is_read = TRUE 
       WHERE recipient_role = 'DELIVERY_AGENT' 
         AND (recipient_id = $1 OR agent_id = $1)`,
      [String(agentId)]
    );
  }

  async getUnreadCountForAdmin(): Promise<number> {
    const res = await query(
      `SELECT COUNT(*) AS count FROM notifications
       WHERE recipient_role = 'ADMIN' AND is_read = FALSE`
    );
    return parseInt(res.rows[0]?.count || '0', 10);
  }

  async getUnreadCountForAgent(agentId: string): Promise<number> {
    const res = await query(
      `SELECT COUNT(*) AS count FROM notifications
       WHERE recipient_role = 'DELIVERY_AGENT' 
         AND (recipient_id = $1 OR recipient_id IS NULL OR agent_id = $1)
         AND is_read = FALSE`,
      [String(agentId)]
    );
    return parseInt(res.rows[0]?.count || '0', 10);
  }
}

export const notificationRepo = new NotificationRepository();
