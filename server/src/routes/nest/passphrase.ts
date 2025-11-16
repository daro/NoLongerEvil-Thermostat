/**
 * /nest/passphrase Route Handler
 * Entry key generation for device pairing
 */

import { IncomingMessage, ServerResponse } from 'http';
import { ConvexService } from '../../services/ConvexService';
import { environment } from '../../config/environment';

/**
 * Handle GET /nest/passphrase
 * Generate entry key for device pairing
 */
export async function handlePassphrase(
  _req: IncomingMessage,
  res: ServerResponse,
  serial: string,
  convex: ConvexService
): Promise<void> {
  const ttl = environment.ENTRY_KEY_TTL_SECONDS;

  const convexKey = await convex.generateEntryKey(serial, ttl);

  if (!convexKey) {
    console.error(`[Passphrase] Failed to generate entry key for ${serial} - Convex unavailable`);
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Entry key service unavailable' }));
    return;
  }

  console.log(`[Passphrase] Generated entry key for ${serial}: ${convexKey.code})`);

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      value: convexKey.code,
      expires: convexKey.expiresAt,
    })
  );
}
