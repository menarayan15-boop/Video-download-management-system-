import { Router } from 'express';
import {
  getVideoBookmarks,
  createVideoBookmark,
  deleteVideoBookmark,
  getVideoNotes,
  createVideoNote,
  updateVideoNote,
  deleteVideoNote,
  getStudyHelper,
} from './learning.controller.js';
import { authenticate, requireAuth } from '../../middleware/auth.js';

const router = Router();

// Bookmarks (private to authenticated user)
router.get('/:videoId/bookmarks', authenticate, requireAuth, getVideoBookmarks);
router.post('/:videoId/bookmarks', authenticate, requireAuth, createVideoBookmark);
router.delete('/:videoId/bookmarks/:bookmarkId', authenticate, requireAuth, deleteVideoBookmark);

// Notes (private to authenticated user)
router.get('/:videoId/notes', authenticate, requireAuth, getVideoNotes);
router.post('/:videoId/notes', authenticate, requireAuth, createVideoNote);
router.patch('/:videoId/notes/:noteId', authenticate, requireAuth, updateVideoNote);
router.delete('/:videoId/notes/:noteId', authenticate, requireAuth, deleteVideoNote);

// Study Helper & Takeaways (public/authenticated)
router.get('/:videoId/study-helper', authenticate, getStudyHelper);

export default router;
