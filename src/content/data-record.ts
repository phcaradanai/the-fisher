export type DataRecord = Record<string, unknown>;

export function isDataRecord(value: unknown): value is DataRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
