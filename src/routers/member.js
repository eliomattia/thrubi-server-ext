const express = require("express");
const router  = express.Router();
const member = require("../controllers/controllers").member;

// Token authenticated endpoints
router.post("/create/:populationId",                            member.create);
router.post("/delete/:populationId",                            member.delete);
router.get ("/request/claim/:ethAddress/:populationId",         member.requestClaim);
router.post("/request/declareIncome/:populationId/:mCurrent",   member.declareIncome);
router.get ("/:populationId",                                   member.read);

module.exports = router;