import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

async function test() {
  const conn = await pool.connect();
  try {
    const nutritionJson = JSON.stringify({ calories: 400, protein: 15, carbs: 40, fat: 10 });
    const { rows } = await conn.query("INSERT INTO health_plans (user_id, name, start_date, end_date) VALUES (1, 'test', '2026-05-10', '2026-05-10') RETURNING id");
    const planId = rows[0].id;
    console.log('Created plan', planId);

    try {
      await conn.query(
        'INSERT INTO plan_meals (plan_id, date, meal_type, recipe_id, recipe_name, note, is_custom, nutrition_info) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)',
        [planId, '2026-05-10', 'breakfast', '', 'Test meal', '', false, nutritionJson]
      );
      console.log('INSERT SUCCESS');
    } catch(err) {
      console.error('INSERT ERROR:', err);
    }
    
    // Check what dates are returned
    const getRes = await conn.query('SELECT * FROM plan_meals WHERE plan_id = $1', [planId]);
    console.log('Meals returned:', getRes.rows);
    
  } catch (err) {
    console.error('MAIN ERROR', err);
  } finally {
    conn.release();
    pool.end();
  }
}
test();
