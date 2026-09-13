import { pool } from '../db/pool.js';

async function resetOrders() {
  console.log('--- Checking current order data ---');
  try {
    const orderCount = await pool.query('SELECT COUNT(*)::int AS count FROM orders');
    console.log(`Current orders count: ${orderCount.rows[0].count}`);

    const itemCount = await pool.query('SELECT COUNT(*)::int AS count FROM order_items');
    console.log(`Current order_items count: ${itemCount.rows[0].count}`);

    // Check FKs referencing orders
    const fkRes = await pool.query(`
      SELECT
        tc.table_name, kcu.column_name
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'orders';
    `);
    console.log('Tables referencing orders:', fkRes.rows);

    // Delete or truncate all order tables
    console.log('--- Truncating order tables ---');
    await pool.query('TRUNCATE TABLE order_transit_logs, order_items, orders RESTART IDENTITY CASCADE');
    console.log('Successfully truncated order_transit_logs, order_items, orders!');

    // Reset total_sold on products to 0
    await pool.query('UPDATE products SET total_sold = 0');
    console.log('Successfully reset total_sold on products to 0!');

    // Verify
    const verifyOrders = await pool.query('SELECT COUNT(*)::int AS count FROM orders');
    const verifyItems = await pool.query('SELECT COUNT(*)::int AS count FROM order_items');
    console.log(`After reset -> Orders: ${verifyOrders.rows[0].count}, Order Items: ${verifyItems.rows[0].count}`);
  } catch (err) {
    console.error('Error during reset orders:', err);
  } finally {
    await pool.end();
  }
}

resetOrders();
