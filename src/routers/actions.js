const express = require("express");
const router  = express.Router();
const actions = require("../controllers/controllers").actions;
const authenticated         = require("../controllers/middlewares/auth").authenticated;

// Admin token authenticated endpoints
router.post("/log",                 actions.log);
router.post("/auth", authenticated, actions.auth);

module.exports = router;