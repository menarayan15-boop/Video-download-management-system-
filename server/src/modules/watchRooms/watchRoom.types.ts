// Watch Room Types & Interfaces for Vyntra Real-Time Co-Watching

export type RoomVisibility = 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';
export type RoomStatus = 'LIVE' | 'SCHEDULED' | 'ENDED';
export type RoomRole = 'HOST' | 'MODERATOR' | 'PARTICIPANT';
export type ControllerPolicy = 'HOST_ONLY' | 'HOST_AND_MODS' | 'ALL';
export type PlaybackStatus = 'PLAYING' | 'PAUSED';

export interface WatchRoomMemberInfo {
  id: string;
  userId: string;
  username: string;
  avatarUrl?: string | null;
  role: RoomRole;
  isMuted: boolean;
  joinedAt: string;
  lastSeenAt: string;
  isOnline: boolean;
}

export interface WatchRoomMessageInfo {
  id: string;
  roomId: string;
  userId: string | null;
  username: string;
  avatarUrl?: string | null;
  message: string;
  isSystem: boolean;
  videoTimestamp?: number | null;
  createdAt: string;
}

export interface WatchRoomReactionEvent {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  avatarUrl?: string | null;
  reactionType: 'HEART' | 'JOY' | 'FIRE' | 'APPLAUSE' | 'SURPRISED';
  videoTimestamp?: number | null;
  createdAt: string;
}

export interface WatchRoomQuizInfo {
  id: string;
  roomId: string;
  createdBy: string;
  creatorName: string;
  question: string;
  options: string[];
  correctAnswer?: number; // Hidden from participants until revealed!
  triggerTimestamp?: number | null;
  timeLimitSeconds: number;
  status: 'ACTIVE' | 'REVEALED' | 'CLOSED';
  createdAt: string;
  revealedAt?: string | null;
  results?: {
    totalResponses: number;
    distribution: Record<number, number>;
    correctCount: number;
  };
}

export interface SharedPlaybackState {
  status: PlaybackStatus;
  position: number;
  rate: number;
  updatedAt: string;
  version: number;
  updatedBy: {
    id: string;
    username: string;
  };
}

export interface WatchRoomDetail {
  id: string;
  name: string;
  description?: string | null;
  visibility: RoomVisibility;
  status: RoomStatus;
  videoId: string;
  video: {
    id: string;
    title: string;
    thumbnailUrl: string;
    videoUrl?: string | null;
    embedUrl?: string | null;
    originalUrl?: string | null;
    provider: string;
    providerVideoId?: string | null;
    durationSeconds: number;
    creatorName?: string | null;
  };
  host: {
    id: string;
    username: string;
    avatarUrl?: string | null;
  };
  maxParticipants: number;
  participantCount: number;
  controllerPolicy: ControllerPolicy;
  chatEnabled: boolean;
  reactionsEnabled: boolean;
  quizEnabled: boolean;
  hasPassword?: boolean;
  code: string;
  inviteToken?: string;
  playback: SharedPlaybackState;
  userRole?: RoomRole;
  isMember?: boolean;
  scheduledAt?: string | null;
  createdAt: string;
}

// Real-Time Event Types dispatched via SSE
export type WatchRoomEventType =
  | 'INIT_STATE'
  | 'PLAYBACK_UPDATE'
  | 'CHAT_MESSAGE'
  | 'REACTION'
  | 'MEMBER_JOINED'
  | 'MEMBER_LEFT'
  | 'MEMBER_UPDATED'
  | 'QUIZ_STARTED'
  | 'QUIZ_REVEALED'
  | 'ROOM_POLICY_UPDATED'
  | 'ROOM_ENDED'
  | 'ERROR';

export interface WatchRoomEventPayload {
  type: WatchRoomEventType;
  roomId: string;
  data: any;
  timestamp: string;
}
