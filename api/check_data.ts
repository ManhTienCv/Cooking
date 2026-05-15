import { pool } from './src/db/pool.js';
async function main() {
  const res = await pool.query('SELECT user_id, store_name, is_verified FROM seller_profiles');
  console.log(res.rows);
  process.exit(0);
}
main();
