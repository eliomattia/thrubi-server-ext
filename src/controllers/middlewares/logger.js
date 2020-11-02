exports.logRequest = (req,res,next) => {
    if (req.method!=="OPTIONS") console.log((new Date().toUTCString())+" - "+req.url);
    next();
};