export const LEGACY_KEYS = {
  body: 'bttd_body_stats', protein: 'bttd_protein_log_v1', calories: 'bttd_calorie_log_v1',
  vitaminD3: 'bttd_vitamin_d3_log_v1', creatine: 'bttd_creatine_log_v1',
  legs: 'bttd_game_legs_v1', schedule: 'bttd_schedule', dyno: 'bttd_dyno_v1',
};
export const DEFAULT_BODY = { heightInches: 77, weightLbs: 222, age: 47, goal: 'lean', activityFactor: 1.55 };
export const MAP_FIELDS = new Set(['body', 'protein', 'calories', 'vitaminD3', 'creatine', 'legs', 'schedule', 'preferences', 'weeklyGoals', 'court', 'foodEntries', 'foodFavorites']);
export const accountKey = (userId, key) => `bttd:user:${userId}:${key}`;
export function readJSON(key, fallback) {
  try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; }
  catch { return fallback; }
}
export function writeJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
export function unpack(records, field, fallback) {
  if (!MAP_FIELDS.has(field)) return records[field] ?? fallback;
  const result = { ...fallback };
  for (const [key, value] of Object.entries(records)) {
    if (key.startsWith(`${field}:`)) {
      const subkey = key.slice(field.length + 1);
      if (value === null) delete result[subkey]; else result[subkey] = value;
    }
  }
  return result;
}
export function changesFor(records, field, value, fallback = {}) {
  if (!MAP_FIELDS.has(field)) return { [field]: value };
  const old = unpack(records, field, fallback);
  return Object.fromEntries([...new Set([...Object.keys(old), ...Object.keys(value)])]
    .filter(key => JSON.stringify(old[key]) !== JSON.stringify(value[key]))
    .map(key => [`${field}:${key}`, value[key] ?? null]));
}
export function legacyRecords(existing) {
  const imported = {};
  for (const [field, key] of Object.entries(LEGACY_KEYS)) {
    const value = readJSON(key, null);
    if (value === null) continue;
    const entries = MAP_FIELDS.has(field) && typeof value === 'object' && !Array.isArray(value)
      ? Object.entries(value).map(([k,v]) => [`${field}:${k}`, v])
      : MAP_FIELDS.has(field) ? [] : [[field, value]];
    for (const [k,v] of entries) if (!(k in existing)) imported[k] = v;
  }
  return imported;
}
