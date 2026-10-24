import { Router } from 'express';
import { authenticate, requireAuth } from '../../middleware/auth.js';
import {
  createRoom,
  getPublicRooms,
  getUserRooms,
  getRoomById,
  resolveInvite,
  joinRoom,
  leaveRoom,
  updatePlayback,
  sendChatMessage,
  sendReaction,
  createQuiz,
  submitQuizResponse,
  revealQuiz,
  kickMember,
  toggleMuteMember,
  updateRole,
  updatePolicy,
  endRoom,
  streamRoomEvents,
} from './watchRoom.controller.js';

const router = Router();

// Public / Discovery
router.get('/', authenticate, getPublicRooms);
router.get('/my-rooms', authenticate, requireAuth, getUserRooms);
router.get('/join/:codeOrToken', authenticate, resolveInvite);
router.get('/:id', authenticate, getRoomById);

// Real-Time Event Stream (SSE)
router.get('/:id/stream', authenticate, streamRoomEvents);

// Room Actions
router.post('/', authenticate, requireAuth, createRoom);
router.post('/:id/join', authenticate, requireAuth, joinRoom);
router.post('/:id/leave', authenticate, requireAuth, leaveRoom);
router.post('/:id/playback', authenticate, requireAuth, updatePlayback);
router.post('/:id/messages', authenticate, requireAuth, sendChatMessage);
router.post('/:id/reactions', authenticate, requireAuth, sendReaction);

// Synchronized Quizzes
router.post('/:id/quizzes', authenticate, requireAuth, createQuiz);
router.post('/:id/quizzes/:quizId/submit', authenticate, requireAuth, submitQuizResponse);
router.post('/:id/quizzes/:quizId/reveal', authenticate, requireAuth, revealQuiz);

// Host Moderation Controls
router.post('/:id/members/:memberId/kick', authenticate, requireAuth, kickMember);
router.post('/:id/members/:memberId/mute', authenticate, requireAuth, toggleMuteMember);
router.post('/:id/members/:memberId/role', authenticate, requireAuth, updateRole);
router.post('/:id/policy', authenticate, requireAuth, updatePolicy);
router.post('/:id/end', authenticate, requireAuth, endRoom);

export default router;
