const express = require("express");
const router  = express.Router();
const user =        require("../controllers/controllers").user;
const population =  require("../controllers/controllers").population;
const traffic =     require("../models/db").traffic;

const printIp = async (req,res,next) => {
    // await traffic.logIp(req.connection.remoteAddress);
    next();
};

// Open endpoints
router.get ("/nUser",   printIp, user.n);
router.get ("/nCountry",         population.nCountry);
router.get ("/nCcy",             population.nCcy);

module.exports = router;