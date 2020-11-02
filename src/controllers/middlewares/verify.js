const user = require("../../services/services").user;
const messageBook = require("../../config/message").messageBook;
const wrap = require("../finalize").wrap;

exports.hasOpenAccount = (req,res,next) => {
    user.isClosed(req.userData.userId)
        .then (JSON.stringify).then(JSON.parse).then(packet => packet.isClosed)
        .then (isClosed => {
            if (isClosed) wrap(res,Promise.reject(messageBook.errorMessage.ACCOUNT_CLOSED));
            next();
        })
        .catch(() => {wrap(res,Promise.reject(messageBook.errorMessage.INTERNAL_VERIFY_MIDDLEWARE));});
};

exports.hasActiveAccount = (req,res,next) => {
    user.getDeactivated(req.userData.userId)
        .then (JSON.stringify).then(JSON.parse).then(packet => packet.deactivated)
        .then (deactivated => {
            if (deactivated) wrap(res,Promise.reject(messageBook.errorMessage.ACCOUNT_DEACTIVATED));
            next();
        })
        .catch(() => {wrap(res,Promise.reject(messageBook.errorMessage.INTERNAL_VERIFY_MIDDLEWARE));});
};
