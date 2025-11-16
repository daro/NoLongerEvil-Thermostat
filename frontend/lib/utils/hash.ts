/**
 * Creates a SHA1 hash of the serial number combined with the PIN.
 * This matches the Nest thermostat's PIN hashing algorithm.
 * Based on Ghidra analysis: nlHash::HashPin(pin, serial, output)
 * Note: Despite the parameter order, the actual concatenation appears to be serial + pin
 */
export async function hashPin(pin: string, serial: string): Promise<string> {
  // Try serial + pin order (reversed from parameter order)
  const combined = serial + pin;

  // Convert string to bytes
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);

  // Use SHA-1 (firmware has SHA1_Init, SHA1_Update, SHA1_Final)
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);

  // Convert to lowercase hex string (standard format)
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}
