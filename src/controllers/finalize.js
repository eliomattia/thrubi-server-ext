const messageBook = require("../config/message").messageBook;

const finalize = (res,packet) => {
    if (packet.error) {
        if (!packet.error.code) {console.error(packet); packet.error = messageBook.errorMessage.INTERNAL_UNKNOWN;}
        const code = packet.error.code;
        packet.result=null;
        packet.error=packet.error.message;
        res.status(code).json(packet);
    } else {
        packet.error=null;
        res.status(messageBook.successMessage.SUCCESS.code).json(packet);
    }
};

exports.wrap = (res,promise) => promise.then(result => finalize(res,{result})).catch(error => finalize(res,{error}));
