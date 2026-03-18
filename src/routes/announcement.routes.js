// src/routes/announcement.routes.js
const express = require('express');
const router = express.Router();
const {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} = require('../controllers/announcement.controller');

const { authenticate } = require('../middleware/auth.middleware');

// Apply authentication
router.use(authenticate);

// CRUD routes
router.get('/', getAnnouncements);
router.post('/', createAnnouncement);
router.put('/:id', updateAnnouncement);
router.delete('/:id', deleteAnnouncement);

module.exports = router;
