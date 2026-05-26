const express = require('express');
const router = express.Router();
const { chatWithPlanner, generateItinerary, checkPrice, getSuggestionsList, streamChat } = require('../controllers/aiController');

// POST /api/ai/chat         — Multi-turn chat with history
router.post('/chat', chatWithPlanner);

// POST /api/ai/itinerary    — Generate structured itinerary JSON
router.post('/itinerary', generateItinerary);

// POST /api/ai/price-check  — Price transparency check
router.post('/price-check', checkPrice);

// GET  /api/ai/suggest      — Get popular suggestions list
router.get('/suggest', getSuggestionsList);

// POST /api/ai/stream       — SSE streaming chat
router.post('/stream', streamChat);

module.exports = router;
