import * as messagesRepo from '../repos/messagesRepo.js';
import * as marketplaceRepo from '../repos/marketplaceRepo.js';
import { emitToUsers } from '../lib/messageStream.js';

export async function listConversations(userId: number) {
  const conversations = await messagesRepo.listConversationsForUser(userId);
  return { conversations };
}

export async function startConversation(userId: number, body: Record<string, unknown>) {
  const productIdRaw = body?.product_id ?? null;
  const sellerIdRaw = body?.seller_id ?? null;

  const productId = productIdRaw ? Number(productIdRaw) : null;
  let sellerId = sellerIdRaw ? Number(sellerIdRaw) : 0;

  if (productId) {
    const product = await marketplaceRepo.getProductById(productId);
    if (!product) throw { status: 404, message: 'Sản phẩm không tồn tại.' };
    sellerId = product.seller_id;
  }

  if (!sellerId) throw { status: 400, message: 'Thiếu thông tin cửa hàng.' };
  if (sellerId === userId) throw { status: 400, message: 'Không thể nhắn tin cho chính mình.' };

  const seller = await messagesRepo.getUserById(sellerId);
  if (!seller) throw { status: 404, message: 'Cửa hàng không tồn tại.' };

  let conversation = await messagesRepo.getConversationForBuyerSeller(userId, sellerId, productId);
  if (!conversation) {
    conversation = await messagesRepo.createConversation(userId, sellerId, productId, null);
  }

  const summary = await messagesRepo.getConversationSummaryById(conversation.id, userId);
  return { conversation: summary ?? conversation };
}

export async function getConversationMessages(
  userId: number,
  conversationIdRaw: unknown,
  limitRaw: unknown,
  offsetRaw: unknown
) {
  const conversationId = Number(conversationIdRaw);
  if (!conversationId) throw { status: 400, message: 'Invalid conversation ID.' };

  const conversation = await messagesRepo.getConversationById(conversationId);
  if (!conversation) throw { status: 404, message: 'Cuộc trò chuyện không tồn tại.' };
  if (conversation.buyer_id !== userId && conversation.seller_id !== userId) {
    throw { status: 403, message: 'Không có quyền truy cập cuộc trò chuyện này.' };
  }

  const limit = Math.min(100, Math.max(1, Number(limitRaw) || 50));
  const offset = Math.max(0, Number(offsetRaw) || 0);

  const messages = await messagesRepo.getMessages(conversationId, limit, offset);
  await messagesRepo.markConversationRead(conversationId, userId);
  return { messages, limit, offset };
}

export async function sendMessage(
  userId: number,
  conversationIdRaw: unknown,
  body: Record<string, unknown>
) {
  const conversationId = Number(conversationIdRaw);
  if (!conversationId) throw { status: 400, message: 'Invalid conversation ID.' };

  const messageText = String(body?.message ?? '').trim();
  if (!messageText) throw { status: 422, message: 'Tin nhắn trống.' };
  if (messageText.length > 2000) throw { status: 422, message: 'Tin nhắn quá dài.' };

  const conversation = await messagesRepo.getConversationById(conversationId);
  if (!conversation) throw { status: 404, message: 'Cuộc trò chuyện không tồn tại.' };
  if (conversation.buyer_id !== userId && conversation.seller_id !== userId) {
    throw { status: 403, message: 'Không có quyền gửi tin nhắn.' };
  }

  const senderRole = conversation.buyer_id === userId ? 'buyer' : 'seller';
  const message = await messagesRepo.createMessage(conversationId, userId, senderRole, messageText);
  await messagesRepo.markConversationRead(conversationId, userId);

  emitToUsers([conversation.buyer_id, conversation.seller_id], 'message', {
    conversationId,
    message,
  });

  return { message };
}

export async function markConversationRead(userId: number, conversationIdRaw: unknown) {
  const conversationId = Number(conversationIdRaw);
  if (!conversationId) throw { status: 400, message: 'Invalid conversation ID.' };

  const conversation = await messagesRepo.getConversationById(conversationId);
  if (!conversation) throw { status: 404, message: 'Cuộc trò chuyện không tồn tại.' };
  if (conversation.buyer_id !== userId && conversation.seller_id !== userId) {
    throw { status: 403, message: 'Không có quyền cập nhật cuộc trò chuyện này.' };
  }

  await messagesRepo.markConversationRead(conversationId, userId);
  return { success: true };
}
