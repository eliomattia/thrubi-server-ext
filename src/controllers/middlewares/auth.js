const auth = require("../../services/userAccess").userAccess;
const messageBook = require("../../config/message").messageBook;
const wrap = require("../finalize").wrap;

exports.authenticated = (req,res,next) => {
    let accessJwt = req.headers["x-access-token"];
    try {
        if (accessJwt && accessJwt.startsWith("Bearer")) accessJwt=accessJwt.split(" ")[1];
        auth.verifyJwt(accessJwt,process.env.JWT_ACCESS_SECRET)
            .then(verifyResponse => {
                if (req.userData) wrap(res,Promise.reject(messageBook.errorMessage.NOT_AUTHORIZED_USERDATA_SPIKE));
                req.userData=verifyResponse;
                next();
            })
            .catch(error => {wrap(res,Promise.reject(messageBook.errorMessage.NOT_AUTHORIZED));});
    } catch (error) {
        wrap(res,Promise.reject(messageBook.errorMessage.INTERNAL_AUTHENTICATION));
    }
};

exports.requireRole = userRole => (req,res,next) => {
    if (req.userData.userRole!==userRole) {
        wrap(res,Promise.reject(messageBook.errorMessage.FORBIDDEN));
    } else {
        auth.getUserRole(req.userData.userId)
            .then(dbRole => dbRole===userRole)
            .then(hasRole => {if (hasRole) next(); else wrap(res,Promise.reject(messageBook.errorMessage.FORBIDDEN));});
    }
};

