/** ドット区切りの旧形式を優先し、存在しなければ入れ子形式を読む。 */
export function getSetting(config: unknown, keyPath: string): unknown {
  if (!config || typeof config !== 'object') return undefined;
  const record = config as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(record, keyPath)) return record[keyPath];

  let cursor: unknown = config;
  for (const part of keyPath.split('.')) {
    if (!cursor || typeof cursor !== 'object' || !Object.prototype.hasOwnProperty.call(cursor, part)) {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return cursor;
}
