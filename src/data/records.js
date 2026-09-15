// Keep every page: Supabase's response cap must never become a lifetime total.
export async function fetchAll(client, table, userId, order, signal) {
  const rows = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    let query = client.from(table).select('*').eq('user_id', userId)
      .order(order, { ascending: false });
    if (order !== 'id' && order !== 'key') query = query.order('id', { ascending: false });
    query = query.range(offset, offset + pageSize - 1);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;
    if (error) throw error;
    if (!data) throw new Error('The server did not return your records.');
    rows.push(...data);
    if (data.length < pageSize) return rows;
  }
}

export async function mutateRecord(client, userId, table, operation, payload, id) {
  let query = client.from(table);
  if (operation === 'insert') query = query.insert({ ...payload, user_id: userId });
  else query = query[operation](...(operation === 'update' ? [payload] : []))
    .eq('id', id).eq('user_id', userId);
  const { data, error } = await query.select().single();
  if (error) throw error;
  if (!data) throw new Error('This entry changed or is no longer available. Refresh and try again.');
  return data;
}

export function restorePayload(row, table) {
  const copy = { ...row };
  if (table !== 'cardio_sessions') delete copy.id;
  delete copy.endpoint; // generated column, when restoring a push subscription
  return copy;
}
