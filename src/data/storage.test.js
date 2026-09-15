import { accountKey, changesFor, unpack, legacyRecords } from './storage';
beforeEach(() => localStorage.clear());
test('separates two accounts on one device', () => {
  expect(accountKey('alice','cloud')).not.toBe(accountKey('bob','cloud'));
  expect(accountKey('alice','workout-draft')).not.toBe(accountKey('bob','workout-draft'));
});
test('updating one day does not overwrite another device’s different day', () => {
  const old = { 'protein:2026-09-14': 120 };
  const changes = changesFor(old, 'protein', { '2026-09-14': 120, '2026-09-15': 150 });
  expect(changes).toEqual({ 'protein:2026-09-15': 150 });
  expect(unpack({ ...old, 'protein:2026-09-13': 100, ...changes },'protein',{}))
    .toEqual({ '2026-09-13': 100, '2026-09-14': 120, '2026-09-15': 150 });
});
test('deletion tombstones prevent old imported entries returning', () => {
  localStorage.setItem('bttd_protein_log_v1',JSON.stringify({ '2026-09-15': 150 }));
  const removed = changesFor({ 'protein:2026-09-15': 150 },'protein',{});
  expect(removed).toEqual({ 'protein:2026-09-15': null });
  expect(legacyRecords(removed)).toEqual({});
});
test('legacy import preserves existing cloud values and imports only missing fields', () => {
  localStorage.setItem('bttd_body_stats', JSON.stringify({ age: 47, weightLbs: 220 }));
  expect(legacyRecords({ 'body:weightLbs': 210 })).toEqual({ 'body:age': 47 });
});
