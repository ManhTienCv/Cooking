import { pool } from '../db/pool.js';

async function run() {
  try {
    await pool.query(`CREATE INDEX IF NOT EXISTS "idx_recipes_author_id" ON "recipes" ("author_id");`);
    await pool.query(`CREATE INDEX IF NOT EXISTS "idx_recipes_category_id" ON "recipes" ("category_id");`);
    await pool.query(`CREATE INDEX IF NOT EXISTS "idx_blog_posts_author_id" ON "blog_posts" ("author_id");`);
    await pool.query(`CREATE INDEX IF NOT EXISTS "idx_blog_posts_category_id" ON "blog_posts" ("category_id");`);
    await pool.query(`CREATE INDEX IF NOT EXISTS "idx_blog_comments_post_id" ON "blog_comments" ("post_id");`);

    try {
      await pool.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
      await pool.query(`CREATE INDEX IF NOT EXISTS "idx_recipes_title_trgm" ON "recipes" USING gin ("title" gin_trgm_ops);`);
      await pool.query(`CREATE INDEX IF NOT EXISTS "idx_recipes_ingredients_trgm" ON "recipes" USING gin ("ingredients" gin_trgm_ops);`);
      console.log('GIN indexes with pg_trgm created successfully.');
    } catch (err) {
      console.warn('Could not create pg_trgm extension or index (maybe not superuser). Falling back to B-tree or skipping.', err);
    }
    
    console.log('Indexes applied successfully');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
