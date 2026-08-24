import { keccak256 } from 'ethereum-cryptography/keccak.js';
import { utf8ToBytes, hexToBytes, bytesToHex } from 'ethereum-cryptography/utils.js';

export function erc7201Location(id: string): string {
  const a = keccak256(utf8ToBytes(id));
  const b = BigInt('0x' + bytesToHex(a)) - 1n;
  const c = hexToBytes(b.toString(16).padStart(64, '0'));
  const d = keccak256(c);
  d[31] = 0;
  return '0x' + bytesToHex(d);
}

// Derives the location of a slot at `offset` words past `location`.
export function offsetLocation(location: string, offset: number): string {
  const value = BigInt(location) + BigInt(offset);
  return '0x' + value.toString(16).padStart(64, '0');
}
