const messageBook = require("../../config/message").messageBook;
const wrap = require("../finalize").wrap;

// Note this is a standard controller (req,res), not a standard middleware (req,res,next), not an error middleware (err,req,res,next)
exports.endpointNotFound = (req,res) => {
    wrap(res,Promise.reject(messageBook.errorMessage.ENDPOINT_NOT_FOUND));
};