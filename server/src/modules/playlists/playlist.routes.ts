import { Router } from 'express';
import {
  getMyPlaylists,
  createPlaylist,
  getPlaylistById,
  updatePlaylist,
  deletePlaylist,
  addPlaylistItem,
  removePlaylistItem,
  reorderPlaylistItems,
} from './playlist.controller.js';
import { authenticate, requireAuth } from '../../middleware/auth.js';

const router = Router();

// Playlists collection
router.get('/', authenticate, requireAuth, getMyPlaylists);
router.post('/', authenticate, requireAuth, createPlaylist);

// Single playlist (allows token query or public access if !isPrivate)
router.get('/:id', authenticate, getPlaylistById);
router.patch('/:id', authenticate, requireAuth, updatePlaylist);
router.delete('/:id', authenticate, requireAuth, deletePlaylist);

// Playlist items
router.post('/:id/items', authenticate, requireAuth, addPlaylistItem);
router.delete('/:id/items/:videoId', authenticate, requireAuth, removePlaylistItem);
router.put('/:id/reorder', authenticate, requireAuth, reorderPlaylistItems);

export default router;
