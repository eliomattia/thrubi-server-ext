const express = require("express");
const router  = express.Router();
const population = require("../controllers/controllers").population;
const requireRole = require("../controllers/middlewares/auth").requireRole;
const AUTH_ROLE_USER  = require("../config/thrubi").THRUBI_ROLE_USER;
const AUTH_ROLE_ADMIN = require("../config/thrubi").THRUBI_ROLE_ADMIN;

// Token authenticated endpoints
router.get ("/forUser",                                 population.forUser);
router.get ("/thrubiPrice/silver/:populationId",        population.thrubiPriceSilver);
router.get ("/thrubiPrice/silver/next/:populationId",   population.thrubiPriceSilverNext);

// Admin token authenticated endpoints
router.post("/create/:countryId/:ccyId",    requireRole(AUTH_ROLE_ADMIN),population.create);
router.post("/delete/:populationId",        requireRole(AUTH_ROLE_ADMIN),population.delete);
router.get ("/stats/read/:populationId",    requireRole(AUTH_ROLE_ADMIN),population.readStats);
router.get ("/config/read/:populationId",   requireRole(AUTH_ROLE_ADMIN),population.readConfig);
router.post("/config/change/:populationId", requireRole(AUTH_ROLE_ADMIN),population.changeConfig);
router.get ("/exists/:countryId/:ccyId",    requireRole(AUTH_ROLE_ADMIN),population.exists);

module.exports = router;