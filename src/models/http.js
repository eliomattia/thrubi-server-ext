const request = require("request");
const messageBook       = require("../config/message").messageBook;
const coinbaseExrateUri = require("../config/http").coinbaseExrateUri;
const facebookVerifyUri = require("../config/http").facebookVerifyUri;
const linkedInVerifyUri = require("../config/http").linkedInVerifyUri;
const linkedInApi       = require("../config/http").linkedInApi;
const googleVerifyUri   = require("../config/http").googleVerifyUri;
const googleApi         = require("../config/http").googleApi;

exports.fetchExrate = ccyId => {
    if (ccyId) {
        return new Promise((resolve,reject) => {
            try {
                request.get({url:coinbaseExrateUri+ccyId+"/spot",json:{}},(error,response) => {
                    if (error || !response.body || !response.body.data || !response.body.data.amount) {
                        reject(messageBook.errorMessage.EXRATE_FETCH_ERROR);
                    } else {
                        resolve(parseFloat(response.body.data.amount));
                    }
                });
            } catch (error) {
                reject(messageBook.errorMessage.EXRATE_FETCH_ERROR_INTERNAL);
            }
        });
    }
};

exports.validateFacebookUserAccessToken = (facebookUserAccessToken,facebookUserId) => {
    if (facebookUserAccessToken) {
        return new Promise((resolve,reject) => {
            try {
                request.get({url:facebookVerifyUri+"&input_token="+facebookUserAccessToken,json:{}},(error,response) => {
                    if (error) {
                        reject({result:null,error});
                    } else {
                        const result = response.body.data;
                        console.error("result: ",result);
                        if (result.error) reject(messageBook.errorMessage.INTERNAL_FACEBOOK_VALIDATE_TOKEN);
                        if (result.is_valid) {
                            resolve(facebookUserId.value=result.user_id);
                        }
                        reject(messageBook.errorMessage.INVALID_FACEBOOK_USER_TOKEN);
                    }
                });
            } catch (error) {
                reject(messageBook.errorMessage.INTERNAL_FACEBOOK_VALIDATE_TOKEN);
            }
        });
    } else {
        return Promise.reject(messageBook.errorMessage.EMPTY_FACEBOOK_USER_TOKEN);
    }
};

exports.validateLinkedInCode = (linkedInCode,linkedInState) => {
    if (linkedInCode) {
        return new Promise((resolve,reject) => {
            try {
                // there should be a linkedInState check somewhere, instructions on LinkedIn, skipped for now
                request.get({url:linkedInVerifyUri+"&code="+linkedInCode,json:{}},(error,response) => {
                    if (error) {
                        reject(messageBook.errorMessage.INTERNAL_LINKEDIN_VALIDATING_TOKEN);
                    } else {
                        const result = response.body;
                        if (result&&result.access_token) {
                            resolve(result.access_token);
                        } else {
                            reject(messageBook.errorMessage.INVALID_LINKEDIN_CODE);
                        }
                    }
                });
            } catch (error) {
                reject(messageBook.errorMessage.INTERNAL_LINKEDIN_VALIDATING_TOKEN);
            }
        });
    } else {
        return Promise.reject(messageBook.errorMessage.EMPTY_LINKEDIN_CODE);
    }
};

exports.fetchLinkedInData = (linkedInUserAccessToken,linkedInAccessData) => {
    if (linkedInUserAccessToken) {
        return new Promise((resolve,reject) => {
            try {
                request.get({url:linkedInApi,json:{},headers:{"Authorization":("Bearer "+linkedInUserAccessToken)}},(error,response) => {
                    if (error) {
                        reject(messageBook.errorMessage.INTERNAL_LINKEDIN_FETCHING_DATA);
                    } else {
                        const result = response.body;
                        let profilePicture = {uri:"",width:0};
                        result.profilePicture["displayImage~"].elements.map(
                            e => {
                                let newWidth = e.data["com.linkedin.digitalmedia.mediaartifact.StillImage"].displaySize.width;
                                if (newWidth>profilePicture.width) {
                                    profilePicture.width = newWidth;
                                    profilePicture.uri = e.identifiers[0].identifier;
                                }
                            }
                        );
                        if (result&&result.id) {
                            resolve(linkedInAccessData.value={
                                linkedInUserId:result.id,
                                userDetails:{
                                    name:result.localizedFirstName,
                                    surname:result.localizedLastName,
                                    profilePicture:profilePicture.uri,
                                }
                            });
                        } else {
                            reject(messageBook.errorMessage.INVALID_LINKEDIN_CODE);
                        }
                    }
                });
            } catch (error) {
                reject(messageBook.errorMessage.INTERNAL_LINKEDIN_FETCHING_DATA);
            }
        });
    } else {
        return Promise.reject(messageBook.errorMessage.EMPTY_LINKEDIN_USER_ACCESS_TOKEN);
    }
};

exports.validateGoogleCode = googleCode => {
    if (googleCode) {
        return new Promise((resolve,reject) => {
            try {
                request.post({url:googleVerifyUri+"&code="+googleCode,json:{}},(error,response) => {
                    if (error) {
                        reject(messageBook.errorMessage.INTERNAL_GOOGLE_VALIDATING_TOKEN);
                    } else {
                        const result = response.body;
                        if (result&&result.access_token) {
                            resolve(result.access_token);
                        } else {
                            reject(messageBook.errorMessage.INVALID_GOOGLE_CODE);
                        }
                    }
                });
            } catch (error) {
                reject(messageBook.errorMessage.INTERNAL_GOOGLE_VALIDATING_TOKEN);
            }
        });
    } else {
        return Promise.reject(messageBook.errorMessage.EMPTY_GOOGLE_CODE);
    }
};

exports.fetchGoogleData = (googleUserAccessToken,googleAccessData) => {
    if (googleUserAccessToken) {
        return new Promise((resolve,reject) => {
            try {
                request.get({url:googleApi,headers:{"Authorization":("Bearer "+googleUserAccessToken)}},(error,response) => {
                    if (error) {
                        reject(messageBook.errorMessage.INTERNAL_GOOGLE_FETCHING_DATA);
                    } else {
                        const result = JSON.parse(response.body);
                        if (result&&result.id) {
                            resolve(googleAccessData.value={
                                googleUserId:result.id,
                                userDetails:{
                                    name:result.given_name,
                                    surname:result.family_name,
                                    email:result.email,
                                    emailVerified:(result.verified_email?"VERIFIED_BY_GOOGLE":"not_verified"),
                                    profilePicture:result.picture,
                                }});
                        } else {
                            reject(messageBook.errorMessage.INVALID_GOOGLE_CODE);
                        }
                    }
                });
            } catch (error) {
                reject(messageBook.errorMessage.INTERNAL_GOOGLE_FETCHING_DATA);
            }
        });
    } else {
        return Promise.reject(messageBook.errorMessage.EMPTY_GOOGLE_USER_ACCESS_TOKEN);
    }
};