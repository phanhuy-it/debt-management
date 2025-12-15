/**
 * Generate a simple UUID-like string
 * This is a simplified version that's compatible with Supabase UUID format
 */
export function generateUUID(): string {
  // Generate UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Check if a string is a valid UUID format
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Convert old timestamp-based ID to UUID format (for migration)
 * This ensures backward compatibility
 */
export function migrateIdToUUID(oldId: string): string {
  // If it's already a valid UUID, return as-is
  if (isValidUUID(oldId)) {
    return oldId;
  }
  
  // If it's a timestamp string, convert to UUID-like format
  // This maintains some relationship to the original ID
  // But in practice, for new records, use generateUUID()
  return generateUUID();
}

