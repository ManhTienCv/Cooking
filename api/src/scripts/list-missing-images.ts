import { pool } from '../db/pool.js';

type MissingImageRow = {
  id: number;
  title: string;
};

async function main(): Promise<void> {
  console.log('Looking for recipes and blog posts with missing images...');

  const { rows: missingRecipes } = await pool.query<MissingImageRow>(
    `SELECT id, title FROM recipes WHERE (image_url IS NULL OR trim(image_url) = '') ORDER BY id ASC LIMIT 100`
  );

  const { rows: missingBlogs } = await pool.query<MissingImageRow>(
    `SELECT id, title FROM blog_posts WHERE (image_url IS NULL OR trim(image_url) = '') ORDER BY id ASC LIMIT 100`
  );

  console.log('\nRecipes missing images:');
  if (missingRecipes.length === 0) console.log('  (none)');
  else missingRecipes.forEach((r) => console.log(`  [recipe] ${r.id} - ${r.title}`));

  console.log('\nBlog posts missing images:');
  if (missingBlogs.length === 0) console.log('  (none)');
  else missingBlogs.forEach((b) => console.log(`  [blog]   ${b.id} - ${b.title}`));

  await pool.end();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
