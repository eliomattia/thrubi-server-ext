const express = require("express");
const router  = express.Router();
const user =        require("../controllers/controllers").user;

// Open endpoints
router.post("/email",   user.verifyEmail);

module.exports = router;