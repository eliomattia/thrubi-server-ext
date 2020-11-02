const actions =     require("../services/services").actions;
const guest =       require("../services/services").guest;
const ua =          require("../services/userAccess").userAccess;
const u =           require("../services/services").user;
const country =     require("../services/services").country;
const ccy =         require("../services/services").ccy;
const p =           require("../services/services").population;
const ref =         require("../services/services").ref;
const m =           require("../services/services").member;
const wrap =        require("./finalize").wrap;

exports.guest = {
    subscribeNewsletter:        (req,res) => wrap(res,guest.subscribeNewsletter      (req.body.guestEmail)),
    submitSuggestion:           (req,res) => wrap(res,guest.submitSuggestion         (req.body.suggestionType,req.body.country,req.body.suggestionText)),
};

exports.actions = {
    log:                        (req,res) => wrap(res,actions.log                    (null,                 req.body.actionType,req.body.actionValue)),
    auth:                       (req,res) => wrap(res,actions.log                    (req.userData.userId,  req.body.actionType,req.body.actionValue)),
};

exports.userAccess = {
    listChannels:               (req,res) => wrap(res,ua.listChannels                ()),
    challengeBlockchainEthereum:(req,res) => wrap(res,ua.challengeBlockchainEthereum (                      req.body.ethAddress)),
    refresh:                    (req,res) => wrap(res,ua.refresh                     (                      req.body.refreshJwt)),
    logout:                     (req,res) => wrap(res,ua.logout                      (                      req.body.refreshJwt)),
    listUserChannels:           (req,res) => wrap(res,ua.listUserChannels            (req.userData.userId)),
    getPayChannel:              (req,res) => wrap(res,ua.getPayChannel               (req.userData.userId)),
    setPayChannel:              (req,res) => wrap(res,ua.setPayChannel               (req.userData.userId,  req.body.payChannel)),
    getReceiveChannel:          (req,res) => wrap(res,ua.getReceiveChannel           (req.userData.userId)),
    setReceiveChannel:          (req,res) => wrap(res,ua.setReceiveChannel           (req.userData.userId,  req.body.receiveChannel)),
    deleteChannel:              (req,res) => wrap(res,ua.deleteChannel               (req.userData.userId,  req.params.channelName)),
    createBlockchainEthereum:   (req,res) => wrap(res,ua.createBlockchainEthereum    (                      req.body.ethAddress,req.body.challengeSolution)),
    loginBlockchainEthereum:    (req,res) => wrap(res,ua.loginBlockchainEthereum     (                      req.body.ethAddress,req.body.challengeSolution)),
    addBlockchainEthereum:      (req,res) => wrap(res,ua.addBlockchainEthereum       (req.userData.userId,  req.body.ethAddress,req.body.challengeSolution)),
    updateBlockchainEthereum:   (req,res) => wrap(res,ua.updateBlockchainEthereum    (req.userData.userId,  req.body.ethAddress,req.body.challengeSolution)),
    createKeyboard:             (req,res) => wrap(res,ua.createKeyboard              (                      req.body.username,req.body.password)),
    loginKeyboard:              (req,res) => wrap(res,ua.loginKeyboard               (                      req.body.username,req.body.password)),
    addKeyboard:                (req,res) => wrap(res,ua.addKeyboard                 (req.userData.userId,  req.body.username,req.body.password)),
    updateKeyboard:             (req,res) => wrap(res,ua.updateKeyboard              (req.userData.userId,  req.body.username,req.body.password)),
    createFacebook:             (req,res) => wrap(res,ua.createFacebook              (                      req.body.facebookUserAccessToken)),
    loginFacebook:              (req,res) => wrap(res,ua.loginFacebook               (                      req.body.facebookUserAccessToken)),
    addFacebook:                (req,res) => wrap(res,ua.addFacebook                 (req.userData.userId,  req.body.facebookUserAccessToken)),
    updateFacebook:             (req,res) => wrap(res,ua.updateFacebook              (req.userData.userId,  req.body.facebookUserAccessToken)),
    createLinkedIn:             (req,res) => wrap(res,ua.createLinkedIn              (                      req.body.linkedInCode,req.body.linkedInState)),
    loginLinkedIn:              (req,res) => wrap(res,ua.loginLinkedIn               (                      req.body.linkedInCode,req.body.linkedInState)),
    addLinkedIn:                (req,res) => wrap(res,ua.addLinkedIn                 (req.userData.userId,  req.body.linkedInCode,req.body.linkedInState)),
    updateLinkedIn:             (req,res) => wrap(res,ua.updateLinkedIn              (req.userData.userId,  req.body.linkedInCode,req.body.linkedInState)),
    createGoogle:               (req,res) => wrap(res,ua.createGoogle                (                      req.body.googleCode)),
    loginGoogle:                (req,res) => wrap(res,ua.loginGoogle                 (                      req.body.googleCode)),
    addGoogle:                  (req,res) => wrap(res,ua.addGoogle                   (req.userData.userId,  req.body.googleCode)),
    updateGoogle:               (req,res) => wrap(res,ua.updateGoogle                (req.userData.userId,  req.body.googleCode)),
    tokenTwitter:               (req,res) => wrap(res,ua.tokenTwitter                ()),
    createTwitter:              (req,res) => wrap(res,ua.createTwitter               (                      req.body.twitterRequestToken,req.body.twitterOAuthVerifier)),
    loginTwitter:               (req,res) => wrap(res,ua.loginTwitter                (                      req.body.twitterRequestToken,req.body.twitterOAuthVerifier)),
    addTwitter:                 (req,res) => wrap(res,ua.addTwitter                  (req.userData.userId,  req.body.twitterRequestToken,req.body.twitterOAuthVerifier)),
    updateTwitter:              (req,res) => wrap(res,ua.updateTwitter               (req.userData.userId,  req.body.twitterRequestToken,req.body.twitterOAuthVerifier)),
};

exports.user = {
    read:                   (req,res) => wrap(res,u.read                    (req.userData.userId)),
    certify:                (req,res) => wrap(res,u.certify                 (req.userData.userId)),
    getFlags:               (req,res) => wrap(res,u.getFlags                (req.userData.userId)),
    n:                      (req,res) => wrap(res,u.n                       ()),
    close:                  (req,res) => wrap(res,u.close                   (req.userData.userId)),
    activate:               (req,res) => wrap(res,u.activate                (req.userData.userId)),
    deactivate:             (req,res) => wrap(res,u.deactivate              (req.userData.userId,req.body.activationState)),
    verifyEmail:            (req,res) => wrap(res,u.verifyEmail             (                    req.body.token)),
    fetchDetails:           (req,res) => wrap(res,u.fetchDetails            (req.userData.userId)),
    deleteDetails:          (req,res) => wrap(res,u.deleteDetails           (req.userData.userId,req.body.userDetails)),
    storeDetails:           (req,res) => wrap(res,u.storeDetails            (req.userData.userId,req.body.userDetails,req.body.overwrite)),
    signProfilePicture:     (req,res) => wrap(res,u.signPutProfilePicture   (req.userData.userId,req.body.fileName,req.body.fileType,req.body.fileSize)),
};

exports.country = {
    list:                   (req,res) => wrap(res,country.list()),
};

exports.ccy = {
    list:                   (req,res) => wrap(res,ccy.list()),
};

exports.population = {
    nCountry:               (req,res) => wrap(res,p.nCountry               ()),
    nCcy:                   (req,res) => wrap(res,p.nCcy                   ()),
    forUser:                (req,res) => wrap(res,p.forUser                (req.userData.userId)),
    thrubiPriceSilver:      (req,res) => wrap(res,p.thrubiPriceSilver      (req.params.populationId)),
    thrubiPriceSilverNext:  (req,res) => wrap(res,p.thrubiPriceSilverNext  (req.params.populationId)),
    readStats:              (req,res) => wrap(res,p.readStats              (req.params.populationId)),
    readConfig:             (req,res) => wrap(res,p.readConfig             (req.params.populationId)),
    exists:                 (req,res) => wrap(res,p.exists                 (req.params.countryId,req.params.ccyId)),
    create:                 (req,res) => wrap(res,p.create                 (req.params.countryId,req.params.ccyId)),
    delete:                 (req,res) => wrap(res,p.delete                 (req.params.populationId)),
    changeConfig:           (req,res) => wrap(res,p.changeConfig           (req.params.populationId,req.body.imit,req.body.brake,req.body.mincomeMultiplier,req.body.mincomeShifter,req.body.equalityMultiplier)),
};

exports.ref = {
    list:                   (req,res) => wrap(res,ref.list             ()),
    fetch:                  (req,res) => wrap(res,ref.fetch            (req.params.populationId)),
};

exports.member = {
    create:                 (req,res) => wrap(res,m.create         (req.userData.userId,req.params.populationId)),
    delete:                 (req,res) => wrap(res,m.delete         (req.userData.userId,req.params.populationId)),
    read:                   (req,res) => wrap(res,m.read           (req.userData.userId,req.params.populationId)),
    requestClaim:           (req,res) => wrap(res,m.claim          (req.userData.userId,req.params.populationId,req.params.ethAddress)),
    declareIncome:          (req,res) => wrap(res,m.declareIncome  (req.userData.userId,req.params.populationId,req.params.mCurrent)),
};
