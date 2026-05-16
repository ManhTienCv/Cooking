import { pool } from '../db/pool.js';

export type SellerVerificationStatus = 'draft' | 'pending' | 'verified' | 'rejected' | 'suspended';
export type SellerBusinessType = 'individual' | 'household' | 'company';

export type SellerSettingsRow = {
  user_id: number;
  chat_enabled: boolean;
  order_notifications: boolean;
  account_notifications: boolean;
  marketing_notifications: boolean;
  profile_visible: boolean;
  show_phone: boolean;
  show_address: boolean;
  created_at: Date;
  updated_at: Date;
};

export type SellerProfileSettingsRow = {
  user_id: number;
  store_name: string;
  store_description: string | null;
  phone: string | null;
  address: string | null;
  is_verified: boolean;
  verification_status: SellerVerificationStatus;
  legal_name: string | null;
  business_type: SellerBusinessType;
  tax_code: string | null;
  identity_last4: string | null;
  verified_at: Date | null;
  rejection_reason: string | null;
  full_name: string;
  email: string;
};

export type SellerPayoutAccountRow = {
  id: number;
  seller_id: number;
  bank_name: string;
  account_name: string;
  account_number_encrypted: string;
  account_number_last4: string;
  is_default: boolean;
  verification_status: string;
  created_at: Date;
  updated_at: Date;
};

export type SellerSecurityChallengeRow = {
  id: number;
  user_id: number;
  purpose: string;
  otp_hash: string;
  expires_at: Date;
  attempt_count: number;
  consumed_at: Date | null;
};

export async function getUserPasswordAndEmail(userId: number): Promise<{ password_hash: string; email: string } | null> {
  const { rows } = await pool.query<{ password_hash: string; email: string }>(
    'SELECT password_hash, email FROM users WHERE id = $1 LIMIT 1',
    [userId]
  );
  return rows[0] ?? null;
}

export async function getSellerProfileSettings(userId: number): Promise<SellerProfileSettingsRow | null> {
  const { rows } = await pool.query<SellerProfileSettingsRow>(
    `SELECT
       sp.user_id,
       sp.store_name,
       sp.store_description,
       sp.phone,
       sp.address,
       sp.is_verified,
       CASE WHEN sp.is_verified THEN 'verified' ELSE COALESCE(svp.verification_status, 'draft') END AS verification_status,
       svp.legal_name,
       COALESCE(svp.business_type, 'individual') AS business_type,
       svp.tax_code,
       svp.identity_last4,
       svp.verified_at,
       svp.rejection_reason,
       u.full_name,
       u.email
     FROM seller_profiles sp
     JOIN users u ON u.id = sp.user_id
     LEFT JOIN seller_verification_profiles svp ON svp.user_id = sp.user_id
     WHERE sp.user_id = $1`,
    [userId]
  );
  return rows[0] ?? null;
}

export async function ensureSellerSettings(userId: number): Promise<SellerSettingsRow> {
  const { rows } = await pool.query<SellerSettingsRow>(
    `INSERT INTO seller_settings (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
     RETURNING *`,
    [userId]
  );
  return rows[0]!;
}

export async function updateStoreProfile(
  userId: number,
  data: { store_name: string; store_description: string | null; phone: string | null; address: string | null }
): Promise<SellerProfileSettingsRow | null> {
  await pool.query(
    `UPDATE seller_profiles
     SET store_name = $1,
         store_description = $2,
         phone = $3,
         address = $4,
         updated_at = NOW()
     WHERE user_id = $5`,
    [data.store_name, data.store_description, data.phone, data.address, userId]
  );
  return getSellerProfileSettings(userId);
}

export async function updateVerificationProfile(
  userId: number,
  data: {
    legal_name: string;
    business_type: SellerBusinessType;
    tax_code: string | null;
    identity_last4: string;
  }
): Promise<SellerProfileSettingsRow | null> {
  await pool.query(
    `INSERT INTO seller_verification_profiles (
       user_id, legal_name, business_type, tax_code, identity_last4,
       verification_status, verified_at, rejection_reason
     )
     VALUES ($5, $1, $2, $3, $4, 'pending', NULL, NULL)
     ON CONFLICT (user_id) DO UPDATE SET
       legal_name = EXCLUDED.legal_name,
       business_type = EXCLUDED.business_type,
       tax_code = EXCLUDED.tax_code,
       identity_last4 = EXCLUDED.identity_last4,
       verification_status = 'pending',
       verified_at = NULL,
       rejection_reason = NULL,
       updated_at = NOW()`,
    [data.legal_name, data.business_type, data.tax_code, data.identity_last4, userId]
  );
  await pool.query('UPDATE seller_profiles SET is_verified = FALSE, updated_at = NOW() WHERE user_id = $1', [userId]);
  return getSellerProfileSettings(userId);
}

export async function updatePreferences(
  userId: number,
  data: {
    chat_enabled: boolean;
    order_notifications: boolean;
    account_notifications: boolean;
    marketing_notifications: boolean;
    profile_visible: boolean;
    show_phone: boolean;
    show_address: boolean;
  }
): Promise<SellerSettingsRow> {
  const { rows } = await pool.query<SellerSettingsRow>(
    `INSERT INTO seller_settings (
       user_id, chat_enabled, order_notifications, account_notifications,
       marketing_notifications, profile_visible, show_phone, show_address
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (user_id) DO UPDATE SET
       chat_enabled = EXCLUDED.chat_enabled,
       order_notifications = EXCLUDED.order_notifications,
       account_notifications = EXCLUDED.account_notifications,
       marketing_notifications = EXCLUDED.marketing_notifications,
       profile_visible = EXCLUDED.profile_visible,
       show_phone = EXCLUDED.show_phone,
       show_address = EXCLUDED.show_address,
       updated_at = NOW()
     RETURNING *`,
    [
      userId,
      data.chat_enabled,
      data.order_notifications,
      data.account_notifications,
      data.marketing_notifications,
      data.profile_visible,
      data.show_phone,
      data.show_address,
    ]
  );
  return rows[0]!;
}

export async function listPayoutAccounts(userId: number): Promise<SellerPayoutAccountRow[]> {
  const { rows } = await pool.query<SellerPayoutAccountRow>(
    `SELECT *
     FROM seller_payout_accounts
     WHERE seller_id = $1
     ORDER BY is_default DESC, created_at DESC`,
    [userId]
  );
  return rows;
}

export async function createPayoutAccount(
  userId: number,
  data: { bank_name: string; account_name: string; account_number_encrypted: string; account_number_last4: string; is_default: boolean }
): Promise<SellerPayoutAccountRow> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (data.is_default) {
      await client.query('UPDATE seller_payout_accounts SET is_default = FALSE WHERE seller_id = $1', [userId]);
    }
    const existing = await client.query<{ total: number }>(
      'SELECT COUNT(*)::int AS total FROM seller_payout_accounts WHERE seller_id = $1',
      [userId]
    );
    const shouldDefault = data.is_default || Number(existing.rows[0]?.total ?? 0) === 0;
    const { rows } = await client.query<SellerPayoutAccountRow>(
      `INSERT INTO seller_payout_accounts (
         seller_id, bank_name, account_name, account_number_encrypted,
         account_number_last4, is_default
       )
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [userId, data.bank_name, data.account_name, data.account_number_encrypted, data.account_number_last4, shouldDefault]
    );
    await client.query('COMMIT');
    return rows[0]!;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deletePayoutAccount(userId: number, id: number): Promise<boolean> {
  const { rowCount } = await pool.query(
    'DELETE FROM seller_payout_accounts WHERE id = $1 AND seller_id = $2',
    [id, userId]
  );
  return (rowCount ?? 0) > 0;
}

export async function setDefaultPayoutAccount(userId: number, id: number): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const owned = await client.query('SELECT id FROM seller_payout_accounts WHERE id = $1 AND seller_id = $2', [id, userId]);
    if (owned.rows.length === 0) {
      await client.query('ROLLBACK');
      return false;
    }
    await client.query('UPDATE seller_payout_accounts SET is_default = FALSE WHERE seller_id = $1', [userId]);
    await client.query('UPDATE seller_payout_accounts SET is_default = TRUE, updated_at = NOW() WHERE id = $1 AND seller_id = $2', [
      id,
      userId,
    ]);
    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteOpenChallenges(userId: number, purpose: string): Promise<void> {
  await pool.query(
    'DELETE FROM seller_security_challenges WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL',
    [userId, purpose]
  );
}

export async function createSecurityChallenge(
  userId: number,
  purpose: string,
  otpHash: string,
  expiresAt: Date
): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO seller_security_challenges (user_id, purpose, otp_hash, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [userId, purpose, otpHash, expiresAt]
  );
  return rows[0]!.id;
}

export async function getLatestSecurityChallenge(
  userId: number,
  purpose: string
): Promise<SellerSecurityChallengeRow | null> {
  const { rows } = await pool.query<SellerSecurityChallengeRow>(
    `SELECT id, user_id, purpose, otp_hash, expires_at, attempt_count, consumed_at
     FROM seller_security_challenges
     WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, purpose]
  );
  return rows[0] ?? null;
}

export async function incrementChallengeAttempts(id: number, attempts: number): Promise<void> {
  await pool.query('UPDATE seller_security_challenges SET attempt_count = $1 WHERE id = $2', [attempts, id]);
}

export async function consumeChallenge(id: number): Promise<void> {
  await pool.query('UPDATE seller_security_challenges SET consumed_at = NOW() WHERE id = $1', [id]);
}
