import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireCsrf } from '../middleware/csrf.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import * as ewalletService from '../services/ewalletService.js';

export const ewalletRouter = Router();

// Wallet Info
ewalletRouter.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const result = await ewalletService.getWallet(req.session.userId!);
  res.json(result);
}));

// Bank Accounts
ewalletRouter.get('/banks', requireAuth, asyncHandler(async (req, res) => {
  const result = await ewalletService.getBankAccounts(req.session.userId!);
  res.json(result);
}));

ewalletRouter.post('/banks', requireAuth, requireCsrf, asyncHandler(async (req, res) => {
  const result = await ewalletService.addBankAccount(req.session.userId!, req.body);
  res.json(result);
}));

ewalletRouter.delete('/banks/:id', requireAuth, requireCsrf, asyncHandler(async (req, res) => {
  const result = await ewalletService.deleteBankAccount(req.session.userId!, req.params.id as string);
  res.json(result);
}));

// OTP
ewalletRouter.post('/otp', requireAuth, requireCsrf, asyncHandler(async (req, res) => {
  const { action } = req.body;
  const result = await ewalletService.requestEwalletOtp(req.session.userId!, action);
  res.json(result);
}));

// Withdrawal
ewalletRouter.post('/withdraw', requireAuth, requireCsrf, asyncHandler(async (req, res) => {
  const result = await ewalletService.createWithdrawalRequest(req.session.userId!, req.body);
  res.json(result);
}));

// CookPay — Pay order with wallet balance
ewalletRouter.post('/pay-order', requireAuth, requireCsrf, asyncHandler(async (req, res) => {
  const orderId = Number(req.body.orderId);
  if (!orderId) {
    res.status(400).json({ message: 'orderId is required' });
    return;
  }
  const result = await ewalletService.payOrder(req.session.userId!, orderId);
  res.json(result);
}));

// MoMo Top-Up
ewalletRouter.post('/topup/momo', requireAuth, requireCsrf, asyncHandler(async (req, res) => {
  const amount = Number(req.body.amount);
  if (!amount || amount <= 0) {
    res.status(400).json({ message: 'Invalid amount' });
    return;
  }
  const result = await ewalletService.createMomoTopup(req.session.userId!, amount);
  res.json(result);
}));

// MoMo IPN Webhook (No CSRF or Auth required as MoMo servers call this directly)
ewalletRouter.post('/topup/momo-ipn', asyncHandler(async (req, res) => {
  const result = await ewalletService.processMomoIpn(req.body);
  res.status(200).json(result);
}));
