import crypto from 'crypto';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.PII_DATABASE_URL });

let _key: Buffer | undefined;
function getKey(): Buffer {
  if (_key) return _key;
  const raw = process.env.PERSONAL_DETAILS_ENCRYPTION_KEY;
  if (!raw) {
    console.error('[personal-details] WARNING: PERSONAL_DETAILS_ENCRYPTION_KEY not set. Using insecure dev key.');
    return (_key = Buffer.alloc(32, 'dev-key-do-not-use-in-production!!'));
  }
  if (raw.length !== 64) throw new Error('PERSONAL_DETAILS_ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
  return (_key = Buffer.from(raw, 'hex'));
}

interface EncryptedField {
  iv: string;
  ciphertext: string;
  auth_tag: string;
}

export function encryptField(value: unknown): EncryptedField {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
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
  const key = getKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(encrypted.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(encrypted.auth_tag, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, 'hex')),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString('utf8'));
}

export async function initStore(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customer_personal_details (
      customer_id    TEXT PRIMARY KEY,
      schema_version TEXT NOT NULL DEFAULT '1.0.0',
      fields         JSONB NOT NULL DEFAULT '{}',
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function saveFields(customerId: string, fields: Record<string, unknown>): Promise<void> {
  const encryptedFields: Record<string, EncryptedField> = {};
  for (const [key, value] of Object.entries(fields)) {
    encryptedFields[key] = encryptField(value);
  }
  await pool.query(
    `INSERT INTO customer_personal_details (customer_id, fields)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (customer_id) DO UPDATE
     SET fields     = customer_personal_details.fields || $2::jsonb,
         updated_at = NOW()`,
    [customerId, JSON.stringify(encryptedFields)]
  );
}

export async function loadFields(customerId: string): Promise<Record<string, unknown>> {
  const { rows } = await pool.query<{ fields: Record<string, EncryptedField> }>(
    'SELECT fields FROM customer_personal_details WHERE customer_id = $1',
    [customerId]
  );
  if (!rows.length) return {};
  const result: Record<string, unknown> = {};
  for (const [key, encrypted] of Object.entries(rows[0].fields)) {
    result[key] = decryptField(encrypted);
  }
  return result;
}

