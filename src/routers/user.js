const express = require("express");
const router  = express.Router();
const user = require("../controllers/controllers").user;

// Token authenticated endpoints
router.post("/activate",            user.activate);
router.post("/deactivate",          user.deactivate);
router.post("/certify",             user.certify);
router.get ("/details/fetch",       user.fetchDetails);
router.post("/details/delete",      user.deleteDetails);
router.post("/details/store",       user.storeDetails);
router.post("/profilePicture/sign", user.signProfilePicture);
router.post("/close",               user.close);
router.get ("/getFlags",            user.getFlags);

module.exports = router;