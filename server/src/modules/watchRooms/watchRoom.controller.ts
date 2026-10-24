import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../middleware/auth.js';
import { watchRoomService } from './watchRoom.service.js';

// Validation Schemas
const createRoomSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  videoId: z.string().min(1),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'INVITE_ONLY']).default('PUBLIC'),
  maxParticipants: z.number().int().min(2).max(100).default(20),
  controllerPolicy: z.enum(['HOST_ONLY', 'HOST_AND_MODS', 'ALL']).default('HOST_ONLY'),
  chatEnabled: z.boolean().default(true),
  reactionsEnabled: z.boolean().default(true),
  quizEnabled: z.boolean().default(false),
  scheduledAt: z.string().optional(),
  password: z.string().min(4).max(50).optional(),
});

const updatePlaybackSchema = z.object({
  status: z.enum(['PLAYING', 'PAUSED']),
  position: z.number().min(0),
  rate: z.number().min(0.5).max(2.0).default(1.0),
});

const sendMessageSchema = z.object({
  message: z.string().min(1).max(500),
  videoTimestamp: z.number().optional(),
});

const sendReactionSchema = z.object({
  reactionType: z.enum(['HEART', 'JOY', 'FIRE', 'APPLAUSE', 'SURPRISED']),
  videoTimestamp: z.number().optional(),
});

const createQuizSchema = z.object({
  question: z.string().min(3).max(300),
  options: z.array(z.string().min(1).max(150)).min(2).max(6),
  correctAnswer: z.number().int().min(0),
  timeLimitSeconds: z.number().int().min(10).max(120).default(30),
  triggerTimestamp: z.number().optional(),
});

export const createRoom = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = createRoomSchema.parse(req.body);
    const hostUser = {
      id: req.user!.id,
      username: req.user!.username,
      avatarUrl: (req.user as any).avatarUrl || null,
    };

    const room = await watchRoomService.createRoom({
      hostUser,
      ...validated,
    });

    res.status(201).json({
      success: true,
      data: room,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
};

export const getPublicRooms = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const search = req.query.search as string | undefined;
    const rooms = watchRoomService.getPublicRooms({ search });
    res.json({
      success: true,
      data: rooms,
    });
  } catch (err) {
    next(err);
  }
};

export const getUserRooms = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rooms = watchRoomService.getUserRooms(req.user!.id);
    res.json({
      success: true,
      data: rooms,
    });
  } catch (err) {
    next(err);
  }
};

export const getRoomById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const room = watchRoomService.getRoomDetail(id, userId);

    if (!room) {
      res.status(404).json({ success: false, error: 'Watch Room not found' });
      return;
    }

    res.json({
      success: true,
      data: room,
    });
  } catch (err) {
    next(err);
  }
};

export const resolveInvite = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { codeOrToken } = req.params;
    const roomId = watchRoomService.resolveCodeOrToken(codeOrToken);

    if (!roomId) {
      res.status(404).json({ success: false, error: 'Invalid or expired room code/invite' });
      return;
    }

    const room = watchRoomService.getRoomDetail(roomId, req.user?.id);
    res.json({
      success: true,
      data: {
        roomId,
        room,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const joinRoom = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { password, token } = req.body;

    const user = {
      id: req.user!.id,
      username: req.user!.username,
      avatarUrl: (req.user as any).avatarUrl || null,
    };

    const result = watchRoomService.joinRoom({
      roomId: id,
      user,
      password,
      token,
    });

    if (!result.success) {
      res.status(403).json({ success: false, error: result.error });
      return;
    }

    res.json({
      success: true,
      data: result.room,
    });
  } catch (err) {
    next(err);
  }
};

export const leaveRoom = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const success = watchRoomService.leaveRoom(id, req.user!.id);
    res.json({ success });
  } catch (err) {
    next(err);
  }
};

export const updatePlayback = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const validated = updatePlaybackSchema.parse(req.body);

    const result = watchRoomService.updatePlayback({
      roomId: id,
      userId: req.user!.id,
      username: req.user!.username,
      ...validated,
    });

    if (!result.success) {
      res.status(403).json({ success: false, error: result.error });
      return;
    }

    res.json({
      success: true,
      data: result.playback,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Invalid playback parameters' });
      return;
    }
    next(err);
  }
};

export const sendChatMessage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const validated = sendMessageSchema.parse(req.body);

    const result = watchRoomService.sendMessage({
      roomId: id,
      userId: req.user!.id,
      username: req.user!.username,
      avatarUrl: (req.user as any).avatarUrl || null,
      ...validated,
    });

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    res.status(201).json({
      success: true,
      data: result.message,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors[0]?.message || 'Invalid message' });
      return;
    }
    next(err);
  }
};

export const sendReaction = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const validated = sendReactionSchema.parse(req.body);

    const sent = watchRoomService.sendReaction({
      roomId: id,
      userId: req.user!.id,
      username: req.user!.username,
      avatarUrl: (req.user as any).avatarUrl || null,
      ...validated,
    });

    res.json({ success: sent });
  } catch (err) {
    next(err);
  }
};

export const createQuiz = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const validated = createQuizSchema.parse(req.body);

    const result = watchRoomService.createQuiz({
      roomId: id,
      userId: req.user!.id,
      username: req.user!.username,
      ...validated,
    });

    if (!result.success) {
      res.status(403).json({ success: false, error: result.error });
      return;
    }

    res.status(201).json({
      success: true,
      data: result.quiz,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors[0]?.message || 'Invalid quiz parameters' });
      return;
    }
    next(err);
  }
};

export const submitQuizResponse = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, quizId } = req.params;
    const { selectedAnswer } = req.body;

    if (typeof selectedAnswer !== 'number') {
      res.status(400).json({ success: false, error: 'selectedAnswer must be a number' });
      return;
    }

    const result = watchRoomService.submitQuizResponse({
      roomId: id,
      quizId,
      userId: req.user!.id,
      selectedAnswer,
    });

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const revealQuiz = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, quizId } = req.params;
    const result = watchRoomService.revealQuiz({
      roomId: id,
      quizId,
      userId: req.user!.id,
    });

    if (!result.success) {
      res.status(403).json({ success: false, error: result.error });
      return;
    }

    res.json({
      success: true,
      data: result.results,
    });
  } catch (err) {
    next(err);
  }
};

export const kickMember = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, memberId } = req.params;
    const success = watchRoomService.kickMember(id, req.user!.id, memberId);
    res.json({ success });
  } catch (err) {
    next(err);
  }
};

export const toggleMuteMember = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, memberId } = req.params;
    const success = watchRoomService.toggleMuteMember(id, req.user!.id, memberId);
    res.json({ success });
  } catch (err) {
    next(err);
  }
};

export const updateRole = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, memberId } = req.params;
    const { role } = req.body;
    const success = watchRoomService.updateMemberRole(id, req.user!.id, memberId, role);
    res.json({ success });
  } catch (err) {
    next(err);
  }
};

export const updatePolicy = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { policy } = req.body;
    const success = watchRoomService.updateControllerPolicy(id, req.user!.id, policy);
    res.json({ success });
  } catch (err) {
    next(err);
  }
};

export const endRoom = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const success = watchRoomService.endRoom(id, req.user!.id);
    res.json({ success });
  } catch (err) {
    next(err);
  }
};

// ── SSE Real-Time Event Stream Endpoint ──────────────────────────────────────
export const streamRoomEvents = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || `guest_${Math.random().toString(36).substring(2, 7)}`;
    const username = req.user?.username || `Guest ${userId.slice(-4)}`;

    watchRoomService.subscribeToRoom(id, userId, username, res);
  } catch (err) {
    next(err);
  }
};
