import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { openMessageStream } from '../lib/messageStream.js';
import * as messagesService from '../services/messagesService.js';

export const messagesRouter = Router();

messagesRouter.get('/conversations', requireAuth, asyncHandler(async (req, res) => {
  const result = await messagesService.listConversations(req.session.userId!);
  res.json({ success: true, ...result });
}));

messagesRouter.post('/conversations', requireAuth, asyncHandler(async (req, res) => {
  const result = await messagesService.startConversation(req.session.userId!, req.body);
  res.json({ success: true, ...result });
}));

messagesRouter.get('/conversations/:id/messages', requireAuth, asyncHandler(async (req, res) => {
  const result = await messagesService.getConversationMessages(
    req.session.userId!,
    req.params.id,
    req.query.limit,
    req.query.offset
  );
  res.json({ success: true, ...result });
}));

messagesRouter.post('/conversations/:id/messages', requireAuth, asyncHandler(async (req, res) => {
  const result = await messagesService.sendMessage(req.session.userId!, req.params.id, req.body);
  res.json({ success: true, ...result });
}));

messagesRouter.post('/conversations/:id/read', requireAuth, asyncHandler(async (req, res) => {
  const result = await messagesService.markConversationRead(req.session.userId!, req.params.id);
  res.json(result);
}));

messagesRouter.get('/stream', requireAuth, (req, res) => {
  const cleanup = openMessageStream(req.session.userId!, res);
  req.on('close', cleanup);
});
