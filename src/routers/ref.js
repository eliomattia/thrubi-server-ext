const express = require("express");
const router  = express.Router();
const ref = require("../controllers/controllers").ref;

// Public endpoints
router.get("/list",ref.list);
router.get("/fetch/:populationId",ref.fetch);

module.exports = router;