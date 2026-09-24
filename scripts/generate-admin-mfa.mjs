import { createHmac, randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32(buffer) {
  let bits = '';
  for (const byte of buffer) bits += byte.toString(2).padStart(8, '0');

  let encoded = '';
  for (let index = 0; index < bits.length; index += 5) {
    encoded += alphabet[Number.parseInt(bits.slice(index, index + 5).padEnd(5, '0'), 2)];
  }
  return encoded;
}

export function totpAt(secret, counter) {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', secret).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return code.toString().padStart(6, '0');
}

function main() {
  const brand = process.env.NEXT_PUBLIC_STOREFRONT_BRAND || 'Storefront';
  const account = process.env.STOREFRONT_ADMIN_ACCOUNT || 'admin';
  const totpBytes = randomBytes(20);
  const totpSecret = base32(totpBytes);
  const sessionSecret = randomBytes(32).toString('hex');
  const label = encodeURIComponent(`${brand}:${account}`);
  const issuer = encodeURIComponent(brand);

  console.log(`STOREFRONT_ADMIN_SECRET=${sessionSecret}`);
  console.log(`STOREFRONT_ADMIN_TOTP_SECRET=${totpSecret}`);
  console.log(
    `Authenticator URI=otpauth://totp/${label}?secret=${totpSecret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`,
  );
  console.log(`Expected current 6-digit code=${totpAt(totpBytes, Math.floor(Date.now() / 30_000))}`);
  console.log(`Generated at=${new Date().toISOString()}`);
  console.log('');
  console.log('Keep these values private. Generate a new set if they appear in a screenshot or chat.');
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
