import { pool } from './src/db/pool.js';
async function main() {
  const res = await pool.query(`
    SELECT column_name, data_type, character_maximum_length 
    FROM information_schema.columns 
    WHERE table_name = 'seller_profiles'
  `);
  console.log(res.rows);
  process.exit(0);
}
main();
