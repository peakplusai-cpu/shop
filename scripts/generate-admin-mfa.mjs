import { randomBytes } from 'node:crypto';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32(buffer) {
  let bits = '';
  for (const byte of buffer) bits += byte.toString(2).padStart(8, '0');

  let encoded = '';
  for (let index = 0; index < bits.length; index += 5) {
    encoded += alphabet[Number.parseInt(bits.slice(index, index + 5).padEnd(5, '0'), 2)];
  }
  return encoded;
}

const brand = process.env.NEXT_PUBLIC_STOREFRONT_BRAND || 'Storefront';
const account = process.env.STOREFRONT_ADMIN_ACCOUNT || 'admin';
const totpSecret = base32(randomBytes(20));
const sessionSecret = randomBytes(32).toString('hex');
const label = encodeURIComponent(`${brand}:${account}`);
const issuer = encodeURIComponent(brand);

console.log(`STOREFRONT_ADMIN_SECRET=${sessionSecret}`);
console.log(`STOREFRONT_ADMIN_TOTP_SECRET=${totpSecret}`);
console.log(
  `Authenticator URI=otpauth://totp/${label}?secret=${totpSecret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`,
);
