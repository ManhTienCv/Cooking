import { pool } from './src/db/pool.js';
async function main() {
  await pool.query(`
    ALTER TABLE seller_profiles
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
  `);
  console.log("Added status column to seller_profiles");
  
  // Set existing sellers to 'approved' if they are already verified or just to be safe
  await pool.query(`
    UPDATE seller_profiles SET status = 'approved' WHERE status = 'pending';
  `);
  console.log("Updated existing sellers to approved");

  process.exit(0);
}
main();
