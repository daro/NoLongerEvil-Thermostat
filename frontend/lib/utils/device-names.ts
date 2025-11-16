/**
 * Maps Nest where_id values to human-readable location names
 */
export const NEST_LOCATIONS: Record<string, string> = {
  "00000000-0000-0000-0000-000100000000": "Entryway",
  "00000000-0000-0000-0000-000100000001": "Basement",
  "00000000-0000-0000-0000-000100000002": "Hallway",
  "00000000-0000-0000-0000-000100000003": "Den",
  "00000000-0000-0000-0000-000100000004": "Attic",
  "00000000-0000-0000-0000-000100000005": "Master Bedroom",
  "00000000-0000-0000-0000-000100000006": "Downstairs",
  "00000000-0000-0000-0000-000100000007": "Garage",
  "00000000-0000-0000-0000-000100000009": "Bathroom",
  "00000000-0000-0000-0000-00010000000a": "Kitchen",
  "00000000-0000-0000-0000-00010000000b": "Family Room",
  "00000000-0000-0000-0000-00010000000c": "Living Room",
  "00000000-0000-0000-0000-00010000000d": "Bedroom",
  "00000000-0000-0000-0000-00010000000e": "Office",
  "00000000-0000-0000-0000-00010000000f": "Upstairs",
  "00000000-0000-0000-0000-000100000010": "Dining Room",
  "00000000-0000-0000-0000-000100000011": "Backyard",
  "00000000-0000-0000-0000-000100000012": "Driveway",
  "00000000-0000-0000-0000-000100000013": "Front Yard",
  "00000000-0000-0000-0000-000100000014": "Outside",
  "00000000-0000-0000-0000-000100000015": "Guest House",
  "00000000-0000-0000-0000-000100000016": "Shed",
  "00000000-0000-0000-0000-000100000017": "Deck",
  "00000000-0000-0000-0000-000100000018": "Patio",
  "00000000-0000-0000-0000-00010000001a": "Guest Room",
  "00000000-0000-0000-0000-00010000001b": "Front Door",
  "00000000-0000-0000-0000-00010000001c": "Side Door",
  "00000000-0000-0000-0000-00010000001d": "Back Door",
};

/**
 * Get human-readable location name from where_id
 */
export function getWhereIdName(whereId: string | null | undefined): string | null {
  if (!whereId || typeof whereId !== 'string') return null;
  return NEST_LOCATIONS[whereId] || null;
}

/**
 * Resolve device display name with fallback priority:
 * 1. Custom user-set name
 * 2. shared.name (e.g., "Hallway")
 * 3. device.where_id converted to human name
 * 4. "Thermostat" (fallback)
 */
export function resolveDeviceName(
  customName: string | undefined,
  sharedName: string | null | undefined,
  whereId: string | null | undefined
): string {
  // Priority 1: Custom name
  if (customName && typeof customName === 'string' && customName.trim().length > 0) {
    return customName.trim();
  }

  // Priority 2: Shared name
  if (sharedName && typeof sharedName === 'string' && sharedName.trim().length > 0) {
    return sharedName.trim();
  }

  // Priority 3: where_id location
  const locationName = getWhereIdName(whereId);
  if (locationName) {
    return locationName;
  }

  // Priority 4: Fallback
  return "Thermostat";
}
