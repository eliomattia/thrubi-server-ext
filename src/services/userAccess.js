const bcrypt        = require("bcrypt");
const jwt           = require("jsonwebtoken");
const db            = require("../models/db");
const eth           = require("../models/eth");
const http          = require("../models/http");
const thrubiConfig  = require("../config/thrubi");
const twitter = require("../models/twitter");
const storeDetails  = require("./services").user.storeDetails;
const access        = require("../config/access").access;
const messageBook   = require("../config/message").messageBook;


// -----------------
// Channel functions
// -----------------

const channelIsForLogin   = channelMode =>  Math.abs(channelMode)     %2;  //last bit
const channelIsForPay     = channelMode => (Math.abs(channelMode)>>1) %2;  //second-to-last bit

// ----------------------
// Authorization services
// ----------------------

let validRefreshJwt = [];

const releaseChallengeJwt = ethAddress => {
    const options = {issuer:process.env.JWT_ISSUER,expiresIn:process.env.JWT_ETH_CHALLENGE_EXPIRY_TIME,};
    return Promise.resolve()
        .then(()            => jwt.sign({ethAddress},process.env.JWT_ETH_CHALLENGE_SECRET,options))
        .then(challengeJwt  => ({challengeJwt,hashedJwt:eth.hashMessage(challengeJwt)}));
};

const releaseSessionJwt = (userId,userAuth,secret,expires) => {
    let options = {issuer:process.env.JWT_ISSUER,};
    if (expires) options.expiresIn = process.env.JWT_ACCESS_EXPIRY_TIME;
    return Promise.resolve()
        .then(()            => jwt.sign({userId,userAuth},secret,options));
};

const verifyJwt = (token,secret) => {
    return Promise.resolve()
        .then (()           => jwt.verify(token,secret))
        .catch(error        => {throw messageBook.errorMessage.MODIFIED_JWT;});
};

const generateSessionTokens = async userData => {
    const accessJwt = await releaseSessionJwt(userData.userId,userData.userRole,process.env.JWT_ACCESS_SECRET,true);
    const refreshJwt = await releaseSessionJwt(userData.userId,userData.userRole,process.env.JWT_REFRESH_SECRET,false);
    validRefreshJwt.push(refreshJwt);
    return {accessJwt,accessJwtExpiry:process.env.JWT_ACCESS_EXPIRY_TIME_MS,refreshJwt};
};


const authorizeLogin = async userData => {
    const tokens = await generateSessionTokens(userData);
    return {
        accessJwt:          tokens.accessJwt,
        accessJwtExpiry:    tokens.accessJwtExpiry,
        refreshJwt:         tokens.refreshJwt,
        userId:             userData.userId,
        userRole:           userData.userRole,
        payChannel:         userData.payChannel,     // to be discussed whether pay/receive channels should stay out of login
        receiveChannel:     userData.receiveChannel, // to be discussed whether pay/receive channels should stay out of login
    };
};

const authorizeNew                  = userId                => {
    return authorizeLogin({userId,userRole:thrubiConfig.THRUBI_ROLE_USER});
};

const invalidateSessionToken        = refreshJwt            => {
    validRefreshJwt = validRefreshJwt.filter(jwt => jwt!==refreshJwt);
};

const invalidateUserSessionTokens   = async refreshJwt      => {
    const logoutUser = await verifyJwt(refreshJwt,process.env.JWT_REFRESH_SECRET).then(result => result.userId);
    const checkArray = await Promise.all(validRefreshJwt.map(jwt => verifyJwt(jwt,process.env.JWT_REFRESH_SECRET).then(result => result.userId).then(userId => ({jwt,includeJwt:userId!==logoutUser}))));
    validRefreshJwt = checkArray.map(jwtDuple => jwtDuple.includeJwt?jwtDuple.jwt:null).filter(jwt => jwt!==null);
};

// ----------------------------------------------------------------------
// Blockchain/Ethereum verification, via ethereumjs-util encryption tools
// ----------------------------------------------------------------------
const verifyBlockchainEthereum = (ethAddress,challengeSolution) => {
    let challengeJwt =  challengeSolution.challengeJwt;
    let hashedJwt =     challengeSolution.hashedJwt;
    let signedMessage = challengeSolution.signedMessage;
    return Promise.resolve()
        .then(()                => verifyJwt(challengeJwt,process.env.JWT_ETH_CHALLENGE_SECRET))
        .then(()                => {if (hashedJwt!==eth.hashMessage(challengeJwt)) throw messageBook.errorMessage.MODIFIED_HASH;})
        .then(()                => eth.recoverAddress(hashedJwt,signedMessage))
        .then(recoveredAddress  => (recoveredAddress.toLowerCase() !== ethAddress.toLowerCase()))
        .then(nonMatching       => {if (nonMatching) throw messageBook.errorMessage.ETH_ADDRESS_NOT_OWN;});
};

// ------------------------------------------
// Keyboard verification, via encrypt/decrypt
// ------------------------------------------

const hashPassword = password => {
    return new Promise((resolve,reject) => {
        const callback = (err,hash) => {if (err) reject(messageBook.errorMessage.HASHING_ERROR); else resolve(hash);};
        bcrypt.hash(password,parseInt(process.env.BCRYPT_HASH_ROUNDS),callback);
    });
};

const verifyPassword = (hashedPassword,passwordToHash) => {
    return Promise.resolve()
        .then(() => hashedPassword).then(JSON.stringify).then(JSON.parse).then(result => result.accessValue)
        .then(hashedPw => new Promise((resolve,reject) => {
            const callback = (err,matching) => {
                if (err) reject(messageBook.errorMessage.HASH_VERIFICATION_ERROR);
                if (!matching) reject(messageBook.errorMessage.WRONG_PASSWORD);
                else resolve(matching);
            };
            bcrypt.compare(passwordToHash,hashedPw,callback);
        }));
};

// --------------
// Login services
// --------------

const verifyAccessValueTaken = (channelName,accessName,accessValue) => {
    return Promise.resolve()
        .then (()           => db.userAccess.existsAccess(channelName,accessName,accessValue))
        .then (JSON.stringify).then(JSON.parse).then(result => result.existsAccess)
        .then (existsAccess => {if (existsAccess) throw messageBook.errorMessage.ACCESS_VALUE_TAKEN;})
};

const createUser = (userId) => {
    return Promise.resolve()
        .then (()           => db.user.nextUserId())
        .then (JSON.stringify).then(JSON.parse).then(result => {userId.value=result.nextUserId;})
        .then (()           => db.user.create(userId.value));
};

const loginUser = (userId,channelName,accessName,accessValue) => {
    return Promise.resolve()
        .then (()           => db.userAccess.login(channelName,accessName,accessValue))
        .then (JSON.stringify).then(JSON.parse).then(result => userId.value=result.userId)
        .then (()           => db.userAccess.loginLast(userId.value))
        .then (()           => db.userAccess.loginTrack(userId.value,channelName,accessValue))
        .then (()           => db.user.read(userId.value))
        .then (JSON.stringify).then(JSON.parse).then(userData => userData)
        .catch(error        => {if (error===messageBook.errorMessage.DB_ELEMENT_NOT_FOUND) throw messageBook.errorMessage.USER_NOT_FOUND; else throw error;});
};

const addOrUpdateAccess = async (userId,channelName,accessName,accessValue) => {
    const hasAccess = await db.userAccess.hasAccess(userId,channelName,accessName).then(JSON.stringify).then(JSON.parse).then(result => result.hasAccess);
    if (hasAccess) {
        const currentAccessValue = await db.userAccess.getAccess(userId,channelName,accessName).then(JSON.stringify).then(JSON.parse).then(result => result.accessValue);
        if (accessValue!==currentAccessValue) return await db.userAccess.updateAccess(userId,channelName,accessName,accessValue);
    } else {
        return await db.userAccess.addAccess(userId,channelName,accessName,accessValue);
    }
};

// -------
// EXPORTS
// -------

exports.userAccess = {
    verifyJwt,
    challengeBlockchainEthereum:    ethAddress                  =>  {
        return Promise.resolve()
            .then(()            => releaseChallengeJwt(ethAddress));
    },
    refresh:                async refreshJwt                  => {
        if (!validRefreshJwt.includes(refreshJwt)) throw messageBook.errorMessage.USER_LOGGED_OUT;
        const verifyResponse = await verifyJwt(refreshJwt,process.env.JWT_REFRESH_SECRET);
        if (!verifyResponse) throw messageBook.errorMessage.INVALID_REFRESH_TOKEN;
        await invalidateSessionToken(refreshJwt);
        return await generateSessionTokens(verifyResponse);
    },
    logout: invalidateUserSessionTokens,
    getUserRole:            userId                          =>  db.userAccess.getUserRole(userId),
    listChannels:           ()                              =>  db.userAccess.listChannels(),
    listUserChannels:       userId                          =>  db.userAccess.listUserChannels(userId),
    getPayChannel:          userId                          =>  db.userAccess.getPayChannel(userId),
    setPayChannel:          async (userId,payChannel)       =>  {
        const channel = await db.userAccess.getChannel(payChannel).then(JSON.stringify).then(JSON.parse);
        if (channel.channelId===access.channelId.notAvailable) {
            await db.userAccess.setPayChannel(userId,channel.channelId);
            return payChannel;
        } else if (channelIsForPay(channel.channelMode)) {
            const hasChannel = await db.userAccess.hasChannel(userId,payChannel).then(JSON.stringify).then(JSON.parse).then(result => result.hasChannel);
            if (hasChannel) {
                await db.userAccess.setPayChannel(userId,channel.channelId);
                return payChannel;
            } else {
                throw messageBook.errorMessage.CHANNEL_NOT_AVAILABLE;
            }
        } else {
            throw messageBook.errorMessage.NOT_A_PAY_CHANNEL;
        }
    },
    getReceiveChannel:      userId                          =>  db.userAccess.getReceiveChannel(userId),
    setReceiveChannel:      async (userId,receiveChannel)   =>  {
        const channel = await db.userAccess.getChannel(receiveChannel).then(JSON.stringify).then(JSON.parse);
        if (channel.channelId===access.channelId.notAvailable) {
            await db.userAccess.setReceiveChannel(userId,channel.channelId);
            return receiveChannel;
        } else if (channelIsForPay(channel.channelMode)) {
            const hasChannel = await db.userAccess.hasChannel(userId,receiveChannel).then(JSON.stringify).then(JSON.parse).then(result => result.hasChannel);
            if (hasChannel) {
                await db.userAccess.setReceiveChannel(userId,channel.channelId);
                return receiveChannel;
            } else {
                throw messageBook.errorMessage.CHANNEL_NOT_AVAILABLE;
            }
        } else {
            throw messageBook.errorMessage.NOT_A_PAY_CHANNEL;
        }
    },
    deleteChannel:          (userId,channelName)            => {
        return Promise.resolve()
            .then(() => db.userAccess.nLoginChannels(userId))
            .then(JSON.stringify).then(JSON.parse).then(result => result.nChannels)
            .then(nLoginChannels => {if (nLoginChannels<2) throw messageBook.errorMessage.USER_ONLY_HAS_ONE_CHANNEL;})
            .then(() => db.userAccess.deleteChannel(userId,channelName));
    },
    createBlockchainEthereum:       (ethAddress,challengeSolution)  => {
        let userId = {};
        return Promise.resolve()
            .then (()           => verifyBlockchainEthereum(ethAddress,challengeSolution))
            .then (()           => verifyAccessValueTaken(access.channelName.blockchainEthereum,access.accessName.ethAddress,ethAddress))
            .then (()           => createUser(userId))
            .then (()           => db.userAccess.addAccess(userId.value,access.channelName.blockchainEthereum,access.accessName.ethAddress,ethAddress))
            .then (()           => db.userAccess.setPayChannel(userId.value,access.channelName.blockchainEthereum))
            .then (()           => db.userAccess.setReceiveChannel(userId.value,access.channelName.blockchainEthereum))
            .then (()           => authorizeNew(userId.value));
    },
    loginBlockchainEthereum:        (ethAddress,challengeSolution)          =>  {
        let userId = {};
        return Promise.resolve()
            .then (()           => verifyBlockchainEthereum(ethAddress,challengeSolution))
            .then (()           => loginUser(userId,access.channelName.blockchainEthereum,access.accessName.ethAddress,ethAddress))
            .then (userData     => authorizeLogin(userData));
    },
    addBlockchainEthereum:          (userId,ethAddress,challengeSolution)   =>  {
        return Promise.resolve()
            .then (()           => verifyBlockchainEthereum(ethAddress,challengeSolution))
            .then (()           => verifyAccessValueTaken(access.channelName.blockchainEthereum,access.accessName.ethAddress,ethAddress))
            .then (()           => addOrUpdateAccess(userId,access.channelName.blockchainEthereum,access.accessName.ethAddress,ethAddress));
    },
    updateBlockchainEthereum:       (userId,ethAddress,challengeSolution)   =>  {
        return Promise.resolve()
            .then (()           => verifyBlockchainEthereum(ethAddress,challengeSolution))
            .then (()           => verifyAccessValueTaken(access.channelName.blockchainEthereum,access.accessName.ethAddress,ethAddress))
            .then (()           => addOrUpdateAccess(userId,access.channelName.blockchainEthereum,access.accessName.ethAddress,ethAddress));
    },
    createKeyboard:                 (username,password)                     => {
        let userId = {};
        return Promise.resolve()
            .then (()           => verifyAccessValueTaken(access.channelName.keyboard,access.accessName.username,username))
            .then (()           => createUser(userId))
            .then (()           => hashPassword(password))
            .then (hashedPw     => db.userAccess.addAccess(userId.value,access.channelName.keyboard,access.accessName.password,hashedPw))
            .then (()           => db.userAccess.addAccess(userId.value,access.channelName.keyboard,access.accessName.username,username))
            .then (()           => authorizeNew(userId.value));
    },
    loginKeyboard:                  (username,password)                     => {
        let userId = {};
        let userData;
        return Promise.resolve()
            .then (()           => loginUser(userId,access.channelName.keyboard,access.accessName.username,username))
            .then (data         => userData=data)
            .then (()           => db.userAccess.getAccess(userId.value,access.channelName.keyboard,access.accessName.password))
            .then (hashedPw     => verifyPassword(hashedPw,password))
            .then (()           => authorizeLogin(userData));
    },
    addKeyboard:                    (userId,username,password)              => {
        return Promise.resolve()
            .then (()           => verifyAccessValueTaken(access.channelName.keyboard,access.accessName.username,username))
            .then (()           => hashPassword(password))
            .then (hashedPw     => addOrUpdateAccess(userId,access.channelName.keyboard,access.accessName.password,hashedPw))
            .then (()           => addOrUpdateAccess(userId,access.channelName.keyboard,access.accessName.username,username));
    },
    updateKeyboard:                 (userId,username,password)              => {
        return Promise.resolve()
            .then (()           => verifyAccessValueTaken(access.channelName.keyboard,access.accessName.username,username))
            .then (()           => hashPassword(password))
            .then (hashedPw     => addOrUpdateAccess(userId,access.channelName.keyboard,access.accessName.password,hashedPw))
            .then (()           => addOrUpdateAccess(userId,access.channelName.keyboard,access.accessName.username,username));
    },
    createFacebook:                 (facebookUserAccessToken)                => {
        let userId = {};
        let facebookUserId = {};
        return Promise.resolve()
            .then (()           => http.validateFacebookUserAccessToken(facebookUserAccessToken,facebookUserId))
            .then (()           => verifyAccessValueTaken(access.channelName.facebook,access.accessName.facebookUserId,facebookUserId.value))
            .then (()           => createUser(userId))
            .then (()           => db.userAccess.addAccess(userId.value,access.channelName.facebook,access.accessName.facebookUserId,facebookUserId.value))
            .then (()           => authorizeNew(userId.value));
    },
    loginFacebook:                  (facebookUserAccessToken)                 => {
        let userId = {};
        let facebookUserId = {};
        return Promise.resolve()
            .then (()           => http.validateFacebookUserAccessToken(facebookUserAccessToken,facebookUserId))
            .then (()           => loginUser(userId,access.channelName.facebook,access.accessName.facebookUserId,facebookUserId.value))
            .then (userData     => authorizeLogin(userData));
    },
    addFacebook:                    (userId,facebookUserAccessToken)           => {
        let facebookUserId = {};
        return Promise.resolve()
            .then (()           => http.validateFacebookUserAccessToken(facebookUserAccessToken,facebookUserId))
            .then (()           => verifyAccessValueTaken(access.channelName.facebook,access.accessName.facebookUserId,facebookUserId.value))
            .then (()           => addOrUpdateAccess(userId,access.channelName.facebook,access.accessName.facebookUserId,facebookUserId.value));
    },
    updateFacebook:                 (userId,facebookUserAccessToken)           => {
        let facebookUserId = {};
        return Promise.resolve()
            .then (()           => http.validateFacebookUserAccessToken(facebookUserAccessToken,facebookUserId))
            .then (()           => verifyAccessValueTaken(access.channelName.facebook,access.accessName.facebookUserId,facebookUserId.value))
            .then (()           => addOrUpdateAccess(userId,access.channelName.facebook,access.accessName.facebookUserId,facebookUserId.value));
    },
    createLinkedIn:                 (linkedInCode,linkedInState)                => {
        let userId = {};
        let linkedInAccessData = {};
        return Promise.resolve()
            .then (()           => http.validateLinkedInCode(linkedInCode,linkedInState))
            .then (token        => http.fetchLinkedInData(token,linkedInAccessData))
            .then (()           => verifyAccessValueTaken(access.channelName.linkedIn,access.accessName.linkedInUserId,linkedInAccessData.value.linkedInUserId))
            .then (()           => createUser(userId))
            .then (()           => db.userAccess.addAccess(userId.value,access.channelName.linkedIn,access.accessName.linkedInUserId,linkedInAccessData.value.linkedInUserId))
            .then (()           => storeDetails(userId.value,linkedInAccessData.value.userDetails,false))
            .then (()           => authorizeNew(userId.value));
    },
    loginLinkedIn:                  (linkedInCode,linkedInState)                => {
        let userId = {};
        let userData;
        let linkedInAccessData = {};
        return Promise.resolve()
            .then (()           => http.validateLinkedInCode(linkedInCode,linkedInState))
            .then (token        => http.fetchLinkedInData(token,linkedInAccessData))
            .then (()           => loginUser(userId,access.channelName.linkedIn,access.accessName.linkedInUserId,linkedInAccessData.value.linkedInUserId))
            .then (data         => userData=data)
            .then (()           => storeDetails(userId.value,linkedInAccessData.value.userDetails,false))
            .then (()           => authorizeLogin(userData));
    },
    addLinkedIn:                    (userId,linkedInCode,linkedInState)         => {
        let linkedInAccessData = {};
        return Promise.resolve()
            .then (()           => http.validateLinkedInCode(linkedInCode,linkedInState))
            .then (token        => http.fetchLinkedInData(token,linkedInAccessData))
            .then (()           => verifyAccessValueTaken(access.channelName.linkedIn,access.accessName.linkedInUserId,linkedInAccessData.value.linkedInUserId))
            .then (()           => addOrUpdateAccess(userId,access.channelName.linkedIn,access.accessName.linkedInUserId,linkedInAccessData.value.linkedInUserId))
            .then (()           => storeDetails(userId,linkedInAccessData.value.userDetails,false));
    },
    updateLinkedIn:                 (userId,linkedInCode,linkedInState)         => {
        let linkedInAccessData = {};
        return Promise.resolve()
            .then (()           => http.validateLinkedInCode(linkedInCode,linkedInState))
            .then (token        => http.fetchLinkedInData(token,linkedInAccessData))
            .then (()           => verifyAccessValueTaken(access.channelName.linkedIn,access.accessName.linkedInUserId,linkedInAccessData.value.linkedInUserId))
            .then (()           => addOrUpdateAccess(userId,access.channelName.linkedIn,access.accessName.linkedInUserId,linkedInAccessData.value.linkedInUserId))
            .then (()           => storeDetails(userId,linkedInAccessData.value.userDetails,false));
    },
    createGoogle:                   googleCode                                  => {
        let userId = {};
        let googleAccessData = {};
        return Promise.resolve()
            .then (()           => http.validateGoogleCode(googleCode))
            .then (token        => http.fetchGoogleData(token,googleAccessData))
            .then (()           => verifyAccessValueTaken(access.channelName.google,access.accessName.googleUserId,googleAccessData.value.googleUserId))
            .then (()           => createUser(userId))
            .then (()           => db.userAccess.addAccess(userId.value,access.channelName.google,access.accessName.googleUserId,googleAccessData.value.googleUserId))
            .then (()           => storeDetails(userId.value,googleAccessData.value.userDetails,false))
            .then (()           => authorizeNew(userId.value));
    },
    loginGoogle:                    googleCode                                  => {
        let userId = {};
        let userData;
        let googleAccessData = {};
        return Promise.resolve()
            .then (()           => http.validateGoogleCode(googleCode))
            .then (token        => http.fetchGoogleData(token,googleAccessData))
            .then (()           => loginUser(userId,access.channelName.google,access.accessName.googleUserId,googleAccessData.value.googleUserId))
            .then (data         => userData=data)
            .then (()           => storeDetails(userId.value,googleAccessData.value.userDetails,false))
            .then (()           => authorizeLogin(userData));
    },
    addGoogle:                      (userId,googleCode)                         => {
        let googleAccessData = {};
        return Promise.resolve()
            .then (()           => http.validateGoogleCode(googleCode))
            .then (token        => http.fetchGoogleData(token,googleAccessData))
            .then (()           => verifyAccessValueTaken(access.channelName.google,access.accessName.googleUserId,googleAccessData.value.googleUserId))
            .then (()           => addOrUpdateAccess(userId,access.channelName.google,access.accessName.googleUserId,googleAccessData.value.googleUserId))
            .then (()           => storeDetails(userId,googleAccessData.value.userDetails,false));
    },
    updateGoogle:                   (userId,googleCode)                         => {
        let googleAccessData = {};
        return Promise.resolve()
            .then (()           => http.validateGoogleCode(googleCode))
            .then (token        => http.fetchGoogleData(token,googleAccessData))
            .then (()           => verifyAccessValueTaken(access.channelName.google,access.accessName.googleUserId,googleAccessData.value.googleUserId))
            .then (()           => addOrUpdateAccess(userId,access.channelName.google,access.accessName.googleUserId,googleAccessData.value.googleUserId))
            .then (()           => storeDetails(userId.value,googleAccessData.value.userDetails,false));
    },
    tokenTwitter:                   ()                                          => {
        return Promise.resolve()
            .then (()           => twitter.getTwitterRequestToken());
    },
    createTwitter:                  (twitterRequestToken,twitterOAuthVerifier)   => {
        let userId = {};
        let twitterAccessData = {};
        return Promise.resolve()
            .then (()           => twitter.validateTwitterVerifier(twitterRequestToken,twitterOAuthVerifier))
            .then (tp           => twitter.fetchTwitterData(tp.accessToken,tp.accessTokenSecret,twitterAccessData))
            .then (()           => verifyAccessValueTaken(access.channelName.twitter,access.accessName.twitterUserId,twitterAccessData.value.twitterUserId))
            .then (()           => createUser(userId))
            .then (()           => db.userAccess.addAccess(userId.value,access.channelName.twitter,access.accessName.twitterUserId,twitterAccessData.value.twitterUserId))
            .then (()           => storeDetails(userId.value,twitterAccessData.value.userDetails,false))
            .then (()           => authorizeNew(userId.value));
    },
    loginTwitter:                   (twitterRequestToken,twitterOAuthVerifier)   => {
        let userId = {};
        let userData;
        let twitterAccessData = {};
        return Promise.resolve()
            .then (()           => twitter.validateTwitterVerifier(twitterRequestToken,twitterOAuthVerifier))
            .then (tp           => twitter.fetchTwitterData(tp.accessToken,tp.accessTokenSecret,twitterAccessData))
            .then (()           => loginUser(userId,access.channelName.twitter,access.accessName.twitterUserId,twitterAccessData.value.twitterUserId))
            .then (data         => userData=data)
            .then (()           => storeDetails(userId.value,twitterAccessData.value.userDetails,false))
            .then (()           => authorizeLogin(userData));
    },
    addTwitter:                      (userId,twitterRequestToken,twitterOAuthVerifier)   => {
        let twitterAccessData = {};
        return Promise.resolve()
            .then (()           => twitter.validateTwitterVerifier(twitterRequestToken,twitterOAuthVerifier))
            .then (tp           => twitter.fetchTwitterData(tp.accessToken,tp.accessTokenSecret,twitterAccessData))
            .then (()           => verifyAccessValueTaken(access.channelName.twitter,access.accessName.twitterUserId,twitterAccessData.value.twitterUserId))
            .then (()           => addOrUpdateAccess(userId,access.channelName.twitter,access.accessName.twitterUserId,twitterAccessData.value.twitterUserId))
            .then (()           => storeDetails(userId,twitterAccessData.value.userDetails,false));
    },
    updateTwitter:                   (userId,twitterRequestToken,twitterOAuthVerifier)   => {
        let twitterAccessData = {};
        return Promise.resolve()
            .then (()           => twitter.validateTwitterVerifier(twitterRequestToken,twitterOAuthVerifier))
            .then (tp           => twitter.fetchTwitterData(tp.accessToken,tp.accessTokenSecret,twitterAccessData))
            .then (()           => verifyAccessValueTaken(access.channelName.twitter,access.accessName.twitterUserId,twitterAccessData.value.twitterUserId))
            .then (()           => addOrUpdateAccess(userId,access.channelName.twitter,access.accessName.twitterUserId,twitterAccessData.value.twitterUserId))
            .then (()           => storeDetails(userId.value,twitterAccessData.value.userDetails,false));
    },
};
