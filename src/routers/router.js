const path          = require("path");
const serveFavicon  = require("serve-favicon");
const express       = require("express");
const router        = express.Router();
const guest         = require("./guest");
const actions       = require("./actions");
const auth          = require("./auth");
const user          = require("./user");
const userAccess    = require("./userAccess");
const population    = require("./population");
const member        = require("./member");
const country       = require("./country");
const ccy           = require("./ccy");
const stats         = require("./stats");
const verify        = require("./verify");
const ref           = require("./ref");
const ignoreOptions         = require("../controllers/middlewares/options").ignoreOptions;
const authenticated         = require("../controllers/middlewares/auth").authenticated;
const endpointNotFound      = require("../controllers/middlewares/error").endpointNotFound;

router.use(serveFavicon(path.join(__dirname,"../..","public","logo.png")));

// Preflight OPTIONS filtering
router.options("/*",ignoreOptions);

// Guest endpoints
router.use("/guest",                        guest);

// Actions logger
router.use("/actions",                      actions);

// Authorization router
router.use("/auth",                         auth);

// Application routers
router.use("/stats",                        stats);
router.use("/verify",                       verify);
router.use("/ref",                          ref);
router.use("/user",         authenticated,  user);
router.use("/userAccess",   authenticated,  userAccess);
router.use("/population",   authenticated,  population);
router.use("/member",       authenticated,  member);
router.use("/country",      authenticated,  country);
router.use("/ccy",          authenticated,  ccy);

// Endpoint not found controller
router.use(endpointNotFound);

module.exports = router;