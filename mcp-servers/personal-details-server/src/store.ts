import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const STORE_PATH = process.env.PERSONAL_DETAILS_PATH
  || path.resolve(process.cwd(), '../../data/personal-details');

function getKey(): Buffer {
  const raw = process.env.PERSONAL_DETAILS_ENCRYPTION_KEY;
  if (!raw) {
    console.error('[personal-details] WARNING: PERSONAL_DETAILS_ENCRYPTION_KEY not set. Using insecure dev key.');
    return Buffer.alloc(32, 'dev-key-do-not-use-in-production!!');
  }
  if (raw.length !== 64) throw new Error('PERSONAL_DETAILS_ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
  return Buffer.from(raw, 'hex');
}

const KEY = getKey();

interface EncryptedField {
  iv: string;
  ciphertext: string;
  auth_tag: string;
}

interface PersonalDetailsFile {
  customer_id: string;
  schema_version: string;
  created_at: string;
  updated_at: string;
  fields: Record<string, EncryptedField>;
}

export function encryptField(value: unknown): EncryptedField {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const plaintext = JSON.stringify(value);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const auth_tag = cipher.getAuthTag();
  return {
    iv: iv.toString('hex'),
    ciphertext: ciphertext.toString('hex'),
    auth_tag: auth_tag.toString('hex'),
  };
}

export function decryptField(encrypted: EncryptedField): unknown {
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, Buffer.from(encrypted.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(encrypted.auth_tag, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, 'hex')),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString('utf8'));
}

export function saveFields(customerId: string, fields: Record<string, unknown>): void {
  fs.mkdirSync(STORE_PATH, { recursive: true });
  const filePath = path.join(STORE_PATH, `${customerId}.json`);
  let profile: PersonalDetailsFile;
  if (fs.existsSync(filePath)) {
    profile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } else {
    profile = {
      customer_id: customerId,
      schema_version: '1.0.0',
      created_at: new Date().toISOString(),
      updated_at: '',
      fields: {},
    };
  }
  for (const [key, value] of Object.entries(fields)) {
    profile.fields[key] = encryptField(value);
  }
  profile.updated_at = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(profile, null, 2));
}

export function loadFields(customerId: string): Record<string, unknown> {
  const filePath = path.join(STORE_PATH, `${customerId}.json`);
  if (!fs.existsSync(filePath)) return {};
  const profile: PersonalDetailsFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const result: Record<string, unknown> = {};
  for (const [key, encrypted] of Object.entries(profile.fields)) {
    result[key] = decryptField(encrypted);
  }
  return result;
}

export function customerExists(customerId: string): boolean {
  return fs.existsSync(path.join(STORE_PATH, `${customerId}.json`));
}
