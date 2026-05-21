import * as recipeRepo from '../repos/recipeRepo.js';
import { processImageBase64 } from '../lib/processImage.js';
import type { RecipeWithAuthor } from '../types/recipe.js';

export async function getFeaturedRecipes(limitRaw: unknown) {
  const limit = Math.min(50, Math.max(1, Number(limitRaw) || 6));
  const recipes = await recipeRepo.getFeaturedRecipes(limit);
  return { recipes };
}

export async function searchRecipes(query: {
  q?: unknown;
  category?: unknown;
  limit?: unknown;
  offset?: unknown;
  viewerId?: number | null;
}) {
  const search = query.q ? String(query.q).trim() || null : null;
  const category = query.category ? String(query.category) : null;
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 12));
  const offset = Math.max(0, Number(query.offset) || 0);
  const viewerId = query.viewerId ?? null;

  const [recipes, total] = await Promise.all([
    viewerId
      ? recipeRepo.searchRecipesWithViewer(search, category, viewerId, limit, offset)
      : recipeRepo.searchRecipes(search, category, limit, offset),
    viewerId
      ? recipeRepo.countSearchRecipesWithViewer(search, category, viewerId)
      : recipeRepo.countSearchRecipes(search, category),
  ]);

  return { recipes, total, limit, offset };
}

export async function getMyRecipes(userId: number, limitRaw: unknown, offsetRaw: unknown) {
  const limit = Math.min(100, Math.max(1, Number(limitRaw) || 20));
  const offset = Math.max(0, Number(offsetRaw) || 0);
  const [recipes, total] = await Promise.all([
    recipeRepo.getRecipesByAuthor(userId, limit, offset),
    recipeRepo.countRecipesByAuthor(userId),
  ]);
  return { recipes, total, limit, offset };
}

export async function getSavedRecipes(userId: number, limitRaw: unknown, offsetRaw: unknown) {
  const limit = Math.min(100, Math.max(1, Number(limitRaw) || 20));
  const offset = Math.max(0, Number(offsetRaw) || 0);
  const [recipes, total] = await Promise.all([
    recipeRepo.getSavedRecipesByUser(userId, limit, offset),
    recipeRepo.countSavedRecipesByUser(userId),
  ]);
  return { recipes, total, limit, offset };
}

export async function createRecipe(userId: number, body: Record<string, unknown>) {
  const title = String(body?.title ?? '').trim();
  const description = String(body?.description ?? '').trim() || null;
  const ingredients = String(body?.ingredients ?? '').trim();
  const instructions = String(body?.instructions ?? '').trim();
  const difficulty = String(body?.difficulty ?? 'Trung bình').trim() || 'Trung bình';
  const cookingTimeRaw = Number(body?.cooking_time);
  const servingsRaw = Number(body?.servings);
  const imageUrl = String(body?.image_url ?? '').trim() || null;
  const categoryId = Number(body?.category_id ?? 0);

  if (title.length < 3 || ingredients.length < 5 || instructions.length < 10 || !categoryId) {
    throw { status: 422, message: 'Dữ liệu công thức chưa hợp lệ.' };
  }

  const finalImageUrl = processImageBase64(imageUrl || null);

  const id = await recipeRepo.createRecipe({
    title,
    description,
    ingredients,
    instructions,
    difficulty,
    cookingTime: Number.isFinite(cookingTimeRaw) && cookingTimeRaw > 0 ? cookingTimeRaw : null,
    servings: Number.isFinite(servingsRaw) && servingsRaw > 0 ? servingsRaw : null,
    imageUrl: finalImageUrl,
    categoryId,
    authorId: userId,
  });

  if (!id) {
    throw { status: 400, message: 'Không thể tạo công thức.' };
  }

  return { id, status: 'pending' };
}

export async function toggleSaveRecipe(userId: number, recipeIdRaw: unknown) {
  const recipeId = Number(recipeIdRaw);
  if (!recipeId) {
    throw { status: 400, message: 'Mã công thức không hợp lệ' };
  }
  const saved = await recipeRepo.toggleSave(userId, recipeId);
  return { saved };
}

export async function fridgeSearch(ingredientsRaw: unknown, limitRaw: unknown, offsetRaw: unknown): Promise<{ recipes: RecipeWithAuthor[]; total: number; limit: number; offset: number }> {
  const q = String(ingredientsRaw || '');
  const ingredients = q.split(',').map(i => i.trim()).filter(Boolean);
  const limit = Math.min(50, Math.max(1, Number(limitRaw) || 12));
  const offset = Math.max(0, Number(offsetRaw) || 0);

  const { rows, total } = await recipeRepo.searchRecipesByIngredients(ingredients, limit, offset);
  return { recipes: rows, total, limit, offset };
}

export async function getRecipeDetail(idRaw: unknown, viewerId: number | null): Promise<{ recipe: RecipeWithAuthor; isSaved: boolean }> {
  const id = Number(idRaw);
  if (!id) {
    throw { status: 400, message: 'Mã không hợp lệ' };
  }
  const recipe = await recipeRepo.getRecipeById(id, viewerId);
  if (!recipe) {
    throw { status: 404, message: 'Không tìm thấy công thức.' };
  }
  let isSaved = false;
  if (viewerId) {
    isSaved = await recipeRepo.isSaved(viewerId, id);
  }
  return { recipe, isSaved };
}

export async function incrementRecipeViews(idRaw: unknown, userId: number | null) {
  const id = Number(idRaw);
  if (!id) {
    throw { status: 400, message: 'Mã không hợp lệ' };
  }
  const incremented = await recipeRepo.incrementViews(id, userId);
  return { incremented };
}

export async function updateRecipe(idRaw: unknown, userId: number, body: Record<string, unknown>) {
  const id = Number(idRaw);
  if (!id) throw { status: 400, message: 'Mã không hợp lệ' };

  const existing = await recipeRepo.getRecipeById(id, userId);
  if (!existing || existing.author_id !== userId) {
    throw { status: 403, message: 'Bạn không có quyền thực hiện thao tác này.' };
  }

  const title = body?.title !== undefined ? String(body.title).trim() : undefined;
  const description = body?.description !== undefined ? (String(body.description).trim() || null) : undefined;
  const ingredients = body?.ingredients !== undefined ? String(body.ingredients).trim() : undefined;
  const instructions = body?.instructions !== undefined ? String(body.instructions).trim() : undefined;
  const difficulty = body?.difficulty !== undefined ? String(body.difficulty).trim() : undefined;
  const cookingTimeRaw = body?.cooking_time !== undefined ? Number(body.cooking_time) : undefined;
  const servingsRaw = body?.servings !== undefined ? Number(body.servings) : undefined;
  const categoryId = body?.category_id !== undefined ? Number(body.category_id) : undefined;

  let imageUrl: string | null | undefined = undefined;
  if (body?.image_url) {
    imageUrl = processImageBase64(String(body.image_url).trim());
  }

  const ok = await recipeRepo.updateRecipe(id, userId, {
    title,
    description,
    ingredients,
    instructions,
    difficulty,
    cookingTime: cookingTimeRaw !== undefined ? (Number.isFinite(cookingTimeRaw) && cookingTimeRaw > 0 ? cookingTimeRaw : null) : undefined,
    servings: servingsRaw !== undefined ? (Number.isFinite(servingsRaw) && servingsRaw > 0 ? servingsRaw : null) : undefined,
    imageUrl,
    categoryId,
  });

  if (!ok) {
    throw { status: 400, message: 'Không thể cập nhật công thức.' };
  }
  return { success: true };
}

export async function deleteRecipe(idRaw: unknown, userId: number) {
  const id = Number(idRaw);
  if (!id) throw { status: 400, message: 'Mã không hợp lệ' };
  const recipe = await recipeRepo.getRecipeById(id, userId);
  if (!recipe || recipe.author_id !== userId) throw { status: 403, message: 'Bạn không có quyền thực hiện thao tác này.' };
  await recipeRepo.deleteRecipe(id);
  return { success: true };
}
