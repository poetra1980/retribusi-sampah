const { query } = require('../config/database');

const findAll = async ({ actorUserId, actorRoleCode, action, entityTable, entityId, dateFrom, dateTo, limit, cursor, sort }) => {
  const conditions = [];
  const params = [];
  let p = 1;

  if (actorUserId) { conditions.push(`al.actor_user_id = $${p}`); params.push(actorUserId); p++; }
  if (actorRoleCode) { conditions.push(`al.actor_role_code = $${p}`); params.push(actorRoleCode); p++; }
  if (action) { conditions.push(`al.action = $${p}`); params.push(action); p++; }
  if (entityTable) { conditions.push(`al.entity_table = $${p}`); params.push(entityTable); p++; }
  if (entityId) { conditions.push(`al.entity_id = $${p}`); params.push(entityId); p++; }
  if (dateFrom) { conditions.push(`al.created_at >= $${p}::timestamptz`); params.push(dateFrom); p++; }
  if (dateTo) { conditions.push(`al.created_at <= $${p}::timestamptz`); params.push(dateTo); p++; }

  if (!dateFrom && !dateTo) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    conditions.push(`al.created_at >= $${p}::timestamptz`);
    params.push(thirtyDaysAgo.toISOString());
    p++;
  }

  let cursorCondition = '';
  if (cursor) {
    const [cursorDate, cursorId] = cursor.split('_');
    if (cursorDate && cursorId) {
      const op = sort === 'asc' ? '>' : '<';
      cursorCondition = `AND (al.created_at, al.id) ${op} ($${p}::timestamptz, $${p + 1}::uuid)`;
      params.push(cursorDate, cursorId);
      p += 2;
    }
  }

  const orderDir = sort === 'asc' ? 'ASC' : 'DESC';
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataQuery = `
    SELECT al.id, al.actor_user_id, al.actor_role_code, al.action,
           al.entity_table, al.entity_id, al.old_values, al.new_values,
           al.reason, al.ip_address, al.user_agent, al.request_id, al.created_at,
           u.full_name AS actor_name, u.username AS actor_username
    FROM audit_logs al
    LEFT JOIN users u ON u.id = al.actor_user_id
    ${whereClause} ${cursorCondition}
    ORDER BY al.created_at ${orderDir}, al.id ${orderDir}
    LIMIT $${p}
  `;
  params.push(limit + 1);

  const result = await query(dataQuery, params);
  const hasMore = result.rows.length > limit;
  const rows = hasMore ? result.rows.slice(0, limit) : result.rows;

  let nextCursor = null;
  if (hasMore && rows.length > 0) {
    const last = rows[rows.length - 1];
    nextCursor = `${last.created_at.toISOString()}_${last.id}`;
  }

  return { auditLogs: rows, nextCursor };
};

const findById = async (id) => {
  const result = await query(
    `SELECT al.id, al.actor_user_id, al.actor_role_code, al.action,
            al.entity_table, al.entity_id, al.old_values, al.new_values,
            al.reason, al.ip_address, al.user_agent, al.request_id, al.created_at,
            u.full_name AS actor_name, u.username AS actor_username
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.actor_user_id
     WHERE al.id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
};

const findByEntity = async ({ entityTable, entityId, limit, cursor }) => {
  const conditions = ['al.entity_table = $1', 'al.entity_id = $2'];
  const params = [entityTable, entityId];
  let p = 3;

  let cursorCondition = '';
  if (cursor) {
    const [cursorDate, cursorId] = cursor.split('_');
    if (cursorDate && cursorId) {
      cursorCondition = `AND (al.created_at, al.id) < ($${p}::timestamptz, $${p + 1}::uuid)`;
      params.push(cursorDate, cursorId);
      p += 2;
    }
  }

  const dataQuery = `
    SELECT al.id, al.actor_user_id, al.actor_role_code, al.action,
           al.entity_table, al.entity_id, al.old_values, al.new_values,
           al.reason, al.ip_address, al.user_agent, al.request_id, al.created_at,
           u.full_name AS actor_name, u.username AS actor_username
    FROM audit_logs al
    LEFT JOIN users u ON u.id = al.actor_user_id
    WHERE ${conditions.join(' AND ')} ${cursorCondition}
    ORDER BY al.created_at DESC, al.id DESC
    LIMIT $${p}
  `;
  params.push(limit + 1);

  const result = await query(dataQuery, params);
  const hasMore = result.rows.length > limit;
  const rows = hasMore ? result.rows.slice(0, limit) : result.rows;

  let nextCursor = null;
  if (hasMore && rows.length > 0) {
    const last = rows[rows.length - 1];
    nextCursor = `${last.created_at.toISOString()}_${last.id}`;
  }

  return { auditLogs: rows, nextCursor };
};

module.exports = { findAll, findById, findByEntity };
