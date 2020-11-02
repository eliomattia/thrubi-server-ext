const express = require("express");
const router  = express.Router();
const guest = require("../controllers/controllers").guest;

// Admin token authenticated endpoints
router.post("/subscribeNewsletter", guest.subscribeNewsletter);
router.post("/submitSuggestion",    guest.submitSuggestion);

module.exports = router;