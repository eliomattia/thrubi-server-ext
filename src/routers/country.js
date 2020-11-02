const express = require("express");
const router  = express.Router();
const country = require("../controllers/controllers").country;
const requireRole = require("../controllers/middlewares/auth").requireRole;
const AUTH_ROLE_USER  = require("../config/thrubi").THRUBI_ROLE_USER;
const AUTH_ROLE_ADMIN = require("../config/thrubi").THRUBI_ROLE_ADMIN;

// Admin token authenticated endpoints
router.get ("/list",requireRole(AUTH_ROLE_ADMIN),country.list);

module.exports = router;