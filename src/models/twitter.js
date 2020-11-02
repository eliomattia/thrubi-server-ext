const nodeTwitterApi = require("node-twitter-api");
const messageBook       = require("../config/message").messageBook;

let twitterRequestTokens = {};
let twitterAccessTokens = {};

const initTwitterApi = () => {
    return new nodeTwitterApi({
        consumerKey:        process.env.TWITTER_APP_ID,
        consumerSecret:     process.env.TWITTER_APP_SECRET,
        callback:           process.env.TWITTER_REDIRECT_URI,
    });
};

exports.getTwitterRequestToken = () => {
    return new Promise((resolve,reject) => {
        try {
            let twitter = initTwitterApi();
            twitter.getRequestToken((error,requestToken,requestTokenSecret,results) => {
                if (error) {
                    reject(messageBook.errorMessage.INTERNAL_TWITTER_VALIDATING_TOKEN);
                } else {
                    twitterRequestTokens[requestToken]=requestTokenSecret;
                    resolve({requestToken});
                }
            });
        } catch (error) {
            reject(messageBook.errorMessage.INTERNAL_TWITTER_VALIDATING_TOKEN);
        }
    });
};

exports.validateTwitterVerifier = (twitterRequestToken,twitterOAuthVerifier) => {
    if (twitterRequestToken&&twitterOAuthVerifier) {
        return new Promise((resolve,reject) => {
            try {
                if (twitterRequestTokens[twitterRequestToken]) {
                    let twitter = initTwitterApi();
                    twitter.getAccessToken(twitterRequestToken,twitterRequestTokens[twitterRequestToken],twitterOAuthVerifier,
                        (error,accessToken,accessTokenSecret,results) => {
                        if (error) {
                            reject(messageBook.errorMessage.INTERNAL_TWITTER_VALIDATING_TOKEN);
                        } else {
                            delete twitterRequestTokens[twitterRequestToken];
                            twitterAccessTokens[accessToken]=accessTokenSecret;
                            if (accessToken&&accessTokenSecret) {
                                resolve({accessToken,accessTokenSecret});
                            } else {
                                reject(messageBook.errorMessage.INVALID_TWITTER_TOKEN_OR_VERIFIER);
                            }
                        }
                    });
                } else {
                    reject(messageBook.errorMessage.INVALID_TWITTER_TOKEN_OR_VERIFIER);
                }
            } catch (error) {
                reject(messageBook.errorMessage.INTERNAL_TWITTER_VALIDATING_TOKEN);
            }
        });
    } else {
        return Promise.reject(messageBook.errorMessage.EMPTY_TWITTER_TOKEN_OR_VERIFIER);
    }
};

exports.fetchTwitterData = (twitterAccessToken,twitterAccessTokenSecret,twitterAccessData) => {
    if (twitterAccessToken&&twitterAccessTokenSecret) {
        return new Promise((resolve,reject) => {
            try {
                let twitter = initTwitterApi();
                twitter.verifyCredentials(twitterAccessToken,twitterAccessTokenSecret,null,(error,data,response) => {
                    if (error) {
                        reject(messageBook.errorMessage.INTERNAL_TWITTER_FETCHING_DATA);
                    } else {
                        const result = data;
                        if (result&&result.id) {
                            resolve(twitterAccessData.value={
                                twitterUserId:result.id.toString(),
                                userDetails:{
                                    name:result.name,
                                    surname:result.screen_name, // the "Twitter handle"
                                    profilePicture:result.profile_image_url_https.replace("_normal",""),
                                }});
                        } else {
                            reject(messageBook.errorMessage.INVALID_TWITTER_TOKEN_OR_VERIFIER);
                        }
                    }
                });
            } catch (error) {
                console.log("error in catch: ",error);
                reject(messageBook.errorMessage.INTERNAL_TWITTER_FETCHING_DATA);
            }
        });
    } else {
        return Promise.reject(messageBook.errorMessage.EMPTY_TWITTER_USER_ACCESS_TOKEN);
    }
};