import crypto from 'crypto';
import { Response } from 'express';
import prisma from '../../database/client.js';
import {
  WatchRoomDetail,
  WatchRoomMemberInfo,
  WatchRoomMessageInfo,
  WatchRoomReactionEvent,
  WatchRoomQuizInfo,
  SharedPlaybackState,
  WatchRoomEventType,
  WatchRoomEventPayload,
  RoomRole,
  ControllerPolicy,
  RoomVisibility,
} from './watchRoom.types.js';

// In-Memory Real-Time State Representation
interface ActiveRoomState {
  detail: WatchRoomDetail;
  members: Map<string, WatchRoomMemberInfo>;
  messages: WatchRoomMessageInfo[];
  quizzes: Map<string, WatchRoomQuizInfo>;
  quizResponses: Map<string, Map<string, { selectedAnswer: number; isCorrect: boolean }>>; // quizId -> userId -> response
  activeConnections: Set<{
    connectionId: string;
    userId: string;
    res: Response;
  }>;
}

class WatchRoomService {
  private rooms: Map<string, ActiveRoomState> = new Map();
  private codeToRoomId: Map<string, string> = new Map();
  private tokenToRoomId: Map<string, string> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start global SSE heartbeat every 20 seconds
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeatToAll();
    }, 20000);
  }

  // ── Helper: Generate Room Code and Token ──────────────────────────────────
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'VY-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private generateInviteToken(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  // ── Real-Time Event Dispatcher (SSE) ──────────────────────────────────────
  public broadcastToRoom(roomId: string, type: WatchRoomEventType, data: any) {
    const room = this.rooms.get(roomId);
    if (!room || room.activeConnections.size === 0) return;

    const payload: WatchRoomEventPayload = {
      type,
      roomId,
      data,
      timestamp: new Date().toISOString(),
    };

    const sseMessage = `event: message\ndata: ${JSON.stringify(payload)}\n\n`;

    room.activeConnections.forEach((conn) => {
      try {
        conn.res.write(sseMessage);
      } catch (err) {
        // Connection dead, will be cleaned up
        room.activeConnections.delete(conn);
      }
    });
  }

  private sendHeartbeatToAll() {
    this.rooms.forEach((room) => {
      room.activeConnections.forEach((conn) => {
        try {
          conn.res.write(`: heartbeat\n\n`);
        } catch {
          room.activeConnections.delete(conn);
        }
      });
    });
  }

  // ── Subscribe to Real-Time SSE Stream ────────────────────────────────────
  public subscribeToRoom(roomId: string, userId: string, username: string, res: Response) {
    const room = this.rooms.get(roomId);
    if (!room) {
      res.status(404).json({ success: false, error: 'Room not found' });
      return;
    }

    // Set HTTP Headers for SSE stream
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx proxy buffering
    res.flushHeaders?.();

    const connectionId = `conn_${Math.random().toString(36).substring(2, 9)}`;
    const connection = { connectionId, userId, res };
    room.activeConnections.add(connection);

    // Mark member as online
    const member = room.members.get(userId);
    if (member) {
      member.isOnline = true;
      member.lastSeenAt = new Date().toISOString();
      this.broadcastToRoom(roomId, 'MEMBER_UPDATED', member);
    }

    // Send initial snapshot payload to client
    const initPayload: WatchRoomEventPayload = {
      type: 'INIT_STATE',
      roomId,
      data: {
        room: room.detail,
        playback: room.detail.playback,
        members: Array.from(room.members.values()),
        messages: room.messages.slice(-50),
        activeQuiz: Array.from(room.quizzes.values()).find((q) => q.status === 'ACTIVE') || null,
      },
      timestamp: new Date().toISOString(),
    };
    res.write(`event: message\ndata: ${JSON.stringify(initPayload)}\n\n`);

    // Clean up on disconnect
    res.on('close', () => {
      room.activeConnections.delete(connection);
      if (member) {
        // Check if user has other tabs/connections open
        const hasOtherConn = Array.from(room.activeConnections).some((c) => c.userId === userId);
        if (!hasOtherConn) {
          member.isOnline = false;
          member.lastSeenAt = new Date().toISOString();
          this.broadcastToRoom(roomId, 'MEMBER_UPDATED', member);
        }
      }
    });
  }

  // ── Create Room ──────────────────────────────────────────────────────────
  public async createRoom(params: {
    hostUser: { id: string; username: string; avatarUrl?: string | null };
    name: string;
    description?: string;
    videoId: string;
    visibility: RoomVisibility;
    maxParticipants?: number;
    controllerPolicy?: ControllerPolicy;
    chatEnabled?: boolean;
    reactionsEnabled?: boolean;
    quizEnabled?: boolean;
    scheduledAt?: string;
    password?: string;
  }): Promise<WatchRoomDetail> {
    const {
      hostUser,
      name,
      description,
      videoId,
      visibility = 'PUBLIC',
      maxParticipants = 20,
      controllerPolicy = 'HOST_ONLY',
      chatEnabled = true,
      reactionsEnabled = true,
      quizEnabled = false,
      scheduledAt,
      password,
    } = params;

    // Fetch video from DB or seed catalog
    let videoData: any = null;
    try {
      videoData = await prisma.video.findUnique({
        where: { id: videoId },
        select: {
          id: true,
          title: true,
          thumbnailUrl: true,
          videoUrl: true,
          embedUrl: true,
          originalUrl: true,
          provider: true,
          providerVideoId: true,
          durationSeconds: true,
          creatorName: true,
        },
      });
    } catch {}

    if (!videoData) {
      // Fallback video catalog item
      videoData = {
        id: videoId,
        title: 'Artificial Intelligence & Neural Networks',
        thumbnailUrl: 'https://i.ytimg.com/vi/1TmUwRALJW0/maxresdefault.jpg',
        videoUrl: null,
        embedUrl: 'https://www.youtube.com/embed/1TmUwRALJW0',
        originalUrl: 'https://www.youtube.com/watch?v=1TmUwRALJW0',
        provider: 'YOUTUBE',
        providerVideoId: '1TmUwRALJW0',
        durationSeconds: 520,
        creatorName: 'Gate Smashers',
      };
    }

    const roomId = crypto.randomUUID();
    const code = this.generateRoomCode();
    const inviteToken = this.generateInviteToken();

    const playback: SharedPlaybackState = {
      status: 'PAUSED',
      position: 0,
      rate: 1.0,
      updatedAt: new Date().toISOString(),
      version: 1,
      updatedBy: {
        id: hostUser.id,
        username: hostUser.username,
      },
    };

    const detail: WatchRoomDetail = {
      id: roomId,
      name,
      description: description || null,
      visibility,
      status: 'LIVE',
      videoId,
      video: videoData,
      host: hostUser,
      maxParticipants: Math.min(100, Math.max(2, maxParticipants)),
      participantCount: 1,
      controllerPolicy,
      chatEnabled,
      reactionsEnabled,
      quizEnabled,
      hasPassword: Boolean(password),
      code,
      inviteToken,
      playback,
      userRole: 'HOST',
      isMember: true,
      scheduledAt: scheduledAt || null,
      createdAt: new Date().toISOString(),
    };

    // Initialize Host Member
    const hostMember: WatchRoomMemberInfo = {
      id: crypto.randomUUID(),
      userId: hostUser.id,
      username: hostUser.username,
      avatarUrl: hostUser.avatarUrl,
      role: 'HOST',
      isMuted: false,
      joinedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      isOnline: true,
    };

    const members = new Map<string, WatchRoomMemberInfo>();
    members.set(hostUser.id, hostMember);

    // Initial system message
    const initialMessage: WatchRoomMessageInfo = {
      id: crypto.randomUUID(),
      roomId,
      userId: null,
      username: 'System',
      avatarUrl: null,
      message: `Room created by ${hostUser.username}. Welcome to Vyntra Watch Rooms!`,
      isSystem: true,
      videoTimestamp: 0,
      createdAt: new Date().toISOString(),
    };

    const activeState: ActiveRoomState = {
      detail,
      members,
      messages: [initialMessage],
      quizzes: new Map(),
      quizResponses: new Map(),
      activeConnections: new Set(),
    };

    this.rooms.set(roomId, activeState);
    this.codeToRoomId.set(code.toUpperCase(), roomId);
    this.tokenToRoomId.set(inviteToken, roomId);

    // Persist to Neon PostgreSQL asynchronously
    prisma.watchRoom
      ?.create({
        data: {
          id: roomId,
          hostUserId: hostUser.id,
          name,
          description,
          visibility: visibility as any,
          videoId,
          videoSource: videoData.provider || 'VYNTRA',
          maxParticipants: detail.maxParticipants,
          controllerPolicy: controllerPolicy as any,
          chatEnabled,
          reactionsEnabled,
          quizEnabled,
          passwordHash: password ? crypto.createHash('sha256').update(password).digest('hex') : null,
          invites: {
            create: {
              tokenHash: crypto.createHash('sha256').update(inviteToken).digest('hex'),
              code: code.toUpperCase(),
              createdBy: hostUser.id,
            },
          },
          members: {
            create: {
              userId: hostUser.id,
              role: 'HOST' as any,
            },
          },
        },
      })
      .catch((err) => {
        console.warn('[Vyntra WatchRooms] DB persistence note (using memory cluster):', err.message);
      });

    return detail;
  }

  // ── Get Public Rooms ─────────────────────────────────────────────────────
  public getPublicRooms(params?: {
    search?: string;
    topic?: string;
  }): WatchRoomDetail[] {
    const list: WatchRoomDetail[] = [];

    this.rooms.forEach((room) => {
      if (room.detail.visibility === 'PUBLIC' && room.detail.status !== 'ENDED') {
        const item = {
          ...room.detail,
          participantCount: room.members.size,
        };

        if (params?.search) {
          const q = params.search.toLowerCase();
          const matches =
            item.name.toLowerCase().includes(q) ||
            item.video.title.toLowerCase().includes(q) ||
            item.host.username.toLowerCase().includes(q);
          if (!matches) return;
        }

        list.push(item);
      }
    });

    return list.sort((a, b) => b.participantCount - a.participantCount);
  }

  // ── Get User's Rooms ─────────────────────────────────────────────────────
  public getUserRooms(userId: string): WatchRoomDetail[] {
    const list: WatchRoomDetail[] = [];

    this.rooms.forEach((room) => {
      const isMember = room.members.has(userId);
      const isHost = room.detail.host.id === userId;
      if ((isMember || isHost) && room.detail.status !== 'ENDED') {
        list.push({
          ...room.detail,
          participantCount: room.members.size,
          userRole: isHost ? 'HOST' : room.members.get(userId)?.role || 'PARTICIPANT',
          isMember: true,
        });
      }
    });

    return list;
  }

  // ── Get Room Detail ──────────────────────────────────────────────────────
  public getRoomDetail(roomId: string, userId?: string): WatchRoomDetail | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const isMember = userId ? room.members.has(userId) : false;
    const member = userId ? room.members.get(userId) : null;

    return {
      ...room.detail,
      participantCount: room.members.size,
      userRole: member?.role || undefined,
      isMember,
    };
  }

  // ── Resolve Code or Invite Token ─────────────────────────────────────────
  public resolveCodeOrToken(codeOrToken: string): string | null {
    const clean = codeOrToken.trim().toUpperCase();
    if (this.codeToRoomId.has(clean)) {
      return this.codeToRoomId.get(clean)!;
    }
    const token = codeOrToken.trim();
    if (this.tokenToRoomId.has(token)) {
      return this.tokenToRoomId.get(token)!;
    }
    return null;
  }

  // ── Join Room ────────────────────────────────────────────────────────────
  public joinRoom(params: {
    roomId: string;
    user: { id: string; username: string; avatarUrl?: string | null };
    password?: string;
    token?: string;
  }): { success: boolean; error?: string; room?: WatchRoomDetail } {
    const { roomId, user, password, token } = params;
    const room = this.rooms.get(roomId);

    if (!room) {
      return { success: false, error: 'Watch Room not found or has ended.' };
    }

    if (room.detail.status === 'ENDED') {
      return { success: false, error: 'This Watch Room has ended.' };
    }

    // Check capacity
    if (room.members.size >= room.detail.maxParticipants && !room.members.has(user.id)) {
      return { success: false, error: 'Watch Room has reached its maximum participant limit.' };
    }

    // Check access rules
    if (room.detail.visibility === 'PRIVATE' || room.detail.visibility === 'INVITE_ONLY') {
      const isAlreadyMember = room.members.has(user.id);
      const isHost = room.detail.host.id === user.id;
      const hasValidToken = token && room.detail.inviteToken === token;

      if (!isAlreadyMember && !isHost && !hasValidToken) {
        return {
          success: false,
          error: 'This is a private room. You need a valid invitation link to join.',
        };
      }
    }

    // Add or restore member
    let member = room.members.get(user.id);
    if (!member) {
      member = {
        id: crypto.randomUUID(),
        userId: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        role: user.id === room.detail.host.id ? 'HOST' : 'PARTICIPANT',
        isMuted: false,
        joinedAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        isOnline: true,
      };
      room.members.set(user.id, member);
      room.detail.participantCount = room.members.size;

      // Broadcast join system message
      const joinMsg: WatchRoomMessageInfo = {
        id: crypto.randomUUID(),
        roomId,
        userId: null,
        username: 'System',
        avatarUrl: null,
        message: `${user.username} joined the room`,
        isSystem: true,
        videoTimestamp: room.detail.playback.position,
        createdAt: new Date().toISOString(),
      };
      room.messages.push(joinMsg);

      this.broadcastToRoom(roomId, 'MEMBER_JOINED', member);
      this.broadcastToRoom(roomId, 'CHAT_MESSAGE', joinMsg);
    } else {
      member.isOnline = true;
      member.lastSeenAt = new Date().toISOString();
      this.broadcastToRoom(roomId, 'MEMBER_UPDATED', member);
    }

    return {
      success: true,
      room: {
        ...room.detail,
        userRole: member.role,
        isMember: true,
      },
    };
  }

  // ── Leave Room ───────────────────────────────────────────────────────────
  public leaveRoom(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const member = room.members.get(userId);
    if (!member) return false;

    room.members.delete(userId);
    room.detail.participantCount = room.members.size;

    // Disconnect active connection if open
    room.activeConnections.forEach((conn) => {
      if (conn.userId === userId) {
        try {
          conn.res.end();
        } catch {}
        room.activeConnections.delete(conn);
      }
    });

    const leaveMsg: WatchRoomMessageInfo = {
      id: crypto.randomUUID(),
      roomId,
      userId: null,
      username: 'System',
      avatarUrl: null,
      message: `${member.username} left the room`,
      isSystem: true,
      videoTimestamp: room.detail.playback.position,
      createdAt: new Date().toISOString(),
    };
    room.messages.push(leaveMsg);

    this.broadcastToRoom(roomId, 'MEMBER_LEFT', { userId, username: member.username });
    this.broadcastToRoom(roomId, 'CHAT_MESSAGE', leaveMsg);

    // If host left, transfer host role to first available moderator or member
    if (member.role === 'HOST' && room.members.size > 0) {
      const nextHost = Array.from(room.members.values())[0];
      nextHost.role = 'HOST';
      room.detail.host = {
        id: nextHost.userId,
        username: nextHost.username,
        avatarUrl: nextHost.avatarUrl,
      };
      this.broadcastToRoom(roomId, 'MEMBER_UPDATED', nextHost);
    }

    return true;
  }

  // ── Update Synchronized Playback ─────────────────────────────────────────
  public updatePlayback(params: {
    roomId: string;
    userId: string;
    username: string;
    status: 'PLAYING' | 'PAUSED';
    position: number;
    rate?: number;
  }): { success: boolean; error?: string; playback?: SharedPlaybackState } {
    const { roomId, userId, username, status, position, rate = 1.0 } = params;
    const room = this.rooms.get(roomId);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    const member = room.members.get(userId);
    if (!member) {
      return { success: false, error: 'You are not a member of this room' };
    }

    // Verify playback control permission based on room policy
    const policy = room.detail.controllerPolicy;
    const canControl =
      member.role === 'HOST' ||
      (policy === 'HOST_AND_MODS' && member.role === 'MODERATOR') ||
      policy === 'ALL';

    if (!canControl) {
      return {
        success: false,
        error: 'Only the host or room moderators have playback control permissions in this room.',
      };
    }

    const newVersion = (room.detail.playback.version || 0) + 1;
    const updatedPlayback: SharedPlaybackState = {
      status,
      position: Math.max(0, position),
      rate: Math.min(2.0, Math.max(0.5, rate)),
      updatedAt: new Date().toISOString(),
      version: newVersion,
      updatedBy: {
        id: userId,
        username,
      },
    };

    room.detail.playback = updatedPlayback;

    // Broadcast playback change immediately to all members
    this.broadcastToRoom(roomId, 'PLAYBACK_UPDATE', updatedPlayback);

    return { success: true, playback: updatedPlayback };
  }

  // ── Send Chat Message ────────────────────────────────────────────────────
  public sendMessage(params: {
    roomId: string;
    userId: string;
    username: string;
    avatarUrl?: string | null;
    message: string;
    videoTimestamp?: number;
  }): { success: boolean; error?: string; message?: WatchRoomMessageInfo } {
    const { roomId, userId, username, avatarUrl, message, videoTimestamp } = params;
    const room = this.rooms.get(roomId);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (!room.detail.chatEnabled) {
      return { success: false, error: 'Chat is disabled in this room' };
    }

    const member = room.members.get(userId);
    if (member?.isMuted) {
      return { success: false, error: 'You are muted by the host in this room' };
    }

    const trimmed = message.trim();
    if (!trimmed) {
      return { success: false, error: 'Message cannot be empty' };
    }

    if (trimmed.length > 500) {
      return { success: false, error: 'Message exceeds maximum length of 500 characters' };
    }

    const newMsg: WatchRoomMessageInfo = {
      id: crypto.randomUUID(),
      roomId,
      userId,
      username,
      avatarUrl: avatarUrl || null,
      message: trimmed,
      isSystem: false,
      videoTimestamp: typeof videoTimestamp === 'number' ? Math.round(videoTimestamp) : null,
      createdAt: new Date().toISOString(),
    };

    room.messages.push(newMsg);
    // Limit memory history to 200 items
    if (room.messages.length > 200) {
      room.messages.splice(0, room.messages.length - 200);
    }

    this.broadcastToRoom(roomId, 'CHAT_MESSAGE', newMsg);

    return { success: true, message: newMsg };
  }

  // ── Send Reaction ────────────────────────────────────────────────────────
  public sendReaction(params: {
    roomId: string;
    userId: string;
    username: string;
    avatarUrl?: string | null;
    reactionType: 'HEART' | 'JOY' | 'FIRE' | 'APPLAUSE' | 'SURPRISED';
    videoTimestamp?: number;
  }): boolean {
    const { roomId, userId, username, avatarUrl, reactionType, videoTimestamp } = params;
    const room = this.rooms.get(roomId);
    if (!room || !room.detail.reactionsEnabled) return false;

    const event: WatchRoomReactionEvent = {
      id: crypto.randomUUID(),
      roomId,
      userId,
      username,
      avatarUrl: avatarUrl || null,
      reactionType,
      videoTimestamp: typeof videoTimestamp === 'number' ? Math.round(videoTimestamp) : null,
      createdAt: new Date().toISOString(),
    };

    this.broadcastToRoom(roomId, 'REACTION', event);
    return true;
  }

  // ── Synchronized Quizzes ─────────────────────────────────────────────────
  public createQuiz(params: {
    roomId: string;
    userId: string;
    username: string;
    question: string;
    options: string[];
    correctAnswer: number;
    timeLimitSeconds?: number;
    triggerTimestamp?: number;
  }): { success: boolean; error?: string; quiz?: WatchRoomQuizInfo } {
    const { roomId, userId, username, question, options, correctAnswer, timeLimitSeconds = 30, triggerTimestamp } = params;
    const room = this.rooms.get(roomId);

    if (!room) return { success: false, error: 'Room not found' };

    const member = room.members.get(userId);
    if (!member || (member.role !== 'HOST' && member.role !== 'MODERATOR')) {
      return { success: false, error: 'Only the host or moderators can create quizzes' };
    }

    if (!question.trim()) return { success: false, error: 'Question is required' };
    if (!Array.isArray(options) || options.length < 2) return { success: false, error: 'Provide at least 2 choices' };
    if (correctAnswer < 0 || correctAnswer >= options.length) return { success: false, error: 'Invalid correct choice' };

    const quizId = crypto.randomUUID();
    const quiz: WatchRoomQuizInfo = {
      id: quizId,
      roomId,
      createdBy: userId,
      creatorName: username,
      question: question.trim(),
      options: options.map((o) => o.trim()),
      correctAnswer, // kept server-side until reveal!
      triggerTimestamp: triggerTimestamp || room.detail.playback.position,
      timeLimitSeconds: Math.min(120, Math.max(10, timeLimitSeconds)),
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    room.quizzes.set(quizId, quiz);
    room.quizResponses.set(quizId, new Map());

    // Broadcast quiz start without revealing the answer to participants!
    const clientQuiz: WatchRoomQuizInfo = {
      ...quiz,
      correctAnswer: undefined,
    };
    this.broadcastToRoom(roomId, 'QUIZ_STARTED', clientQuiz);

    return { success: true, quiz };
  }

  public submitQuizResponse(params: {
    roomId: string;
    quizId: string;
    userId: string;
    selectedAnswer: number;
  }): { success: boolean; error?: string } {
    const { roomId, quizId, userId, selectedAnswer } = params;
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found' };

    const quiz = room.quizzes.get(quizId);
    if (!quiz || quiz.status !== 'ACTIVE') {
      return { success: false, error: 'Quiz is not active' };
    }

    let responses = room.quizResponses.get(quizId);
    if (!responses) {
      responses = new Map();
      room.quizResponses.set(quizId, responses);
    }

    if (responses.has(userId)) {
      return { success: false, error: 'You have already submitted an answer for this quiz' };
    }

    const isCorrect = selectedAnswer === quiz.correctAnswer;
    responses.set(userId, { selectedAnswer, isCorrect });

    return { success: true };
  }

  public revealQuiz(params: {
    roomId: string;
    quizId: string;
    userId: string;
  }): { success: boolean; error?: string; results?: any } {
    const { roomId, quizId, userId } = params;
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found' };

    const member = room.members.get(userId);
    if (!member || (member.role !== 'HOST' && member.role !== 'MODERATOR')) {
      return { success: false, error: 'Only the host or moderators can reveal quiz results' };
    }

    const quiz = room.quizzes.get(quizId);
    if (!quiz) return { success: false, error: 'Quiz not found' };

    quiz.status = 'REVEALED';
    quiz.revealedAt = new Date().toISOString();

    const responses = room.quizResponses.get(quizId) || new Map();
    const distribution: Record<number, number> = {};
    quiz.options.forEach((_, idx) => (distribution[idx] = 0));

    let correctCount = 0;
    responses.forEach((resp) => {
      distribution[resp.selectedAnswer] = (distribution[resp.selectedAnswer] || 0) + 1;
      if (resp.isCorrect) correctCount++;
    });

    const results = {
      totalResponses: responses.size,
      distribution,
      correctCount,
      correctAnswer: quiz.correctAnswer,
    };

    quiz.results = results;

    this.broadcastToRoom(roomId, 'QUIZ_REVEALED', {
      quizId,
      correctAnswer: quiz.correctAnswer,
      results,
    });

    return { success: true, results };
  }

  // ── Moderation Controls ──────────────────────────────────────────────────
  public updateMemberRole(roomId: string, hostUserId: string, targetUserId: string, newRole: RoomRole): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.detail.host.id !== hostUserId) return false;

    const target = room.members.get(targetUserId);
    if (!target || target.role === 'HOST') return false;

    target.role = newRole;
    this.broadcastToRoom(roomId, 'MEMBER_UPDATED', target);
    return true;
  }

  public toggleMuteMember(roomId: string, hostUserId: string, targetUserId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.detail.host.id !== hostUserId) return false;

    const target = room.members.get(targetUserId);
    if (!target || target.role === 'HOST') return false;

    target.isMuted = !target.isMuted;
    this.broadcastToRoom(roomId, 'MEMBER_UPDATED', target);
    return true;
  }

  public kickMember(roomId: string, hostUserId: string, targetUserId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.detail.host.id !== hostUserId) return false;

    return this.leaveRoom(roomId, targetUserId);
  }

  public updateControllerPolicy(roomId: string, hostUserId: string, policy: ControllerPolicy): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.detail.host.id !== hostUserId) return false;

    room.detail.controllerPolicy = policy;
    this.broadcastToRoom(roomId, 'ROOM_POLICY_UPDATED', { policy });
    return true;
  }

  public endRoom(roomId: string, hostUserId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.detail.host.id !== hostUserId) return false;

    room.detail.status = 'ENDED';
    this.broadcastToRoom(roomId, 'ROOM_ENDED', { message: 'The host has ended this Watch Room.' });

    // Close all connections
    room.activeConnections.forEach((conn) => {
      try {
        conn.res.end();
      } catch {}
    });
    room.activeConnections.clear();

    return true;
  }
}

export const watchRoomService = new WatchRoomService();
