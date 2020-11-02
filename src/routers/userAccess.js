const express = require("express");
const router  = express.Router();
const userAccess = require("../controllers/controllers").userAccess;

// Token authenticated endpoints
router.get ("/listUserChannels",            userAccess.listUserChannels);
router.get ("/getPayChannel",               userAccess.getPayChannel);
router.post("/setPayChannel",               userAccess.setPayChannel);
router.get ("/getReceiveChannel",           userAccess.getReceiveChannel);
router.post("/setReceiveChannel",           userAccess.setReceiveChannel);
router.post("/delete/:channelName",         userAccess.deleteChannel);
router.post("/add/keyboard",                userAccess.addKeyboard);
router.post("/update/keyboard",             userAccess.updateKeyboard);
router.post("/add/blockchainEthereum",      userAccess.addBlockchainEthereum);
router.post("/update/blockchainEthereum",   userAccess.updateBlockchainEthereum);
router.post("/add/facebook",                userAccess.addFacebook);
router.post("/update/facebook",             userAccess.updateFacebook);
router.post("/add/linkedIn",                userAccess.addLinkedIn);
router.post("/update/linkedIn",             userAccess.updateLinkedIn);
router.post("/add/google",                  userAccess.addGoogle);
router.post("/update/google",               userAccess.updateGoogle);
router.post("/add/twitter",                 userAccess.addTwitter);
router.post("/update/twitter",              userAccess.updateTwitter);

module.exports = router;