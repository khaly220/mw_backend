const express = require('express');
const { liveSessionController } = require('../controllers/liveSession.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// Match the frontend calls exactly:
router.get('/scheduled', authenticate, liveSessionController.getScheduled);
router.post('/schedule', authenticate, liveSessionController.create); // POST /api/live-sessions/schedule
router.post('/start', authenticate, liveSessionController.start);    // POST /api/live-sessions/start
router.patch('/end/:id', authenticate, liveSessionController.end);   // PATCH /api/live-sessions/end/:id
// routes/liveSession.routes.js
router.get('/discovery', authenticate, liveSessionController.getDiscovery);

module.exports = router;