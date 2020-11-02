const express = require("express");
const router  = express.Router();
const auth = require("../controllers/controllers").userAccess;

// Open access endpoint
router.post("/challenge/blockchainEthereum",    auth.challengeBlockchainEthereum);  // return challenge token with hashed version
router.get ("/listChannels",                    auth.listChannels);                 // return channels (names and modes)

// Web3/Eth signature (challenge token) bearing endpoints
router.post("/create/blockchainEthereum",       auth.createBlockchainEthereum);     // return access and refresh token
router.post("/login/blockchainEthereum",        auth.loginBlockchainEthereum);      // return access and refresh token

// Username/password bearing endpoints
router.post("/create/keyboard",                 auth.createKeyboard);               // return access and refresh token
router.post("/login/keyboard",                  auth.loginKeyboard);                // return access and refresh token

// Facebook auth bearing endpoints
router.post("/create/facebook",                 auth.createFacebook);               // return access and refresh token
router.post("/login/facebook",                  auth.loginFacebook);                // return access and refresh token

// LinkedIn OAuth2 bearing endpoints
router.post("/create/linkedIn",                 auth.createLinkedIn);               // return access and refresh token
router.post("/login/linkedIn",                  auth.loginLinkedIn);                // return access and refresh token

// Google OAuth2 bearing endpoints
router.post("/create/google",                   auth.createGoogle);                 // return access and refresh token
router.post("/login/google",                    auth.loginGoogle);                  // return access and refresh token

// Twitter open access endpoint
router.get ("/token/twitter",                   auth.tokenTwitter);                  // return Twitter access token
// Twitter OAuth bearing endpoints
router.post("/create/twitter",                  auth.createTwitter);                 // return access and refresh token
router.post("/login/twitter",                   auth.loginTwitter);                  // return access and refresh token

// Refresh token bearing endpoints
router.post("/refresh",                         auth.refresh);                      // return access token
router.post("/logout",                          auth.logout);                       // delete refresh token

module.exports = router;