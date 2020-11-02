const db            = require("../models/db");
const stabilizers   = require("./stabilizers");
const accountants   = require("./accountants");
const email         = require("../models/email");
const s3            = require("../models/s3");
const messageBook   = require("../config/message").messageBook;
const user          = require("../config/user").user;

// ------------
// App services
// ------------

exports.guest = {
    subscribeNewsletter: async guestEmail => {
        await db.guest.subscribeNewsletter(guestEmail);
        await email.newsletterSubscribedEmail(guestEmail);
    },
    submitSuggestion: async (suggestionType,country,suggestionText) => {
        const todaySuggestions = await db.guest.todaySuggestions().then(JSON.stringify).then(JSON.parse).then(result => result.todaySuggestions);
        if (todaySuggestions>process.env.MAX_DAILY_SUGGESTIONS) {
            throw messageBook.errorMessage.TOO_MANY_SUGGESTIONS;
        } else {
            await db.guest.submitSuggestion(suggestionType,country,suggestionText);
            return 0;
        }
    },
};

exports.actions = {
    log:        async (userId,actionType,actionValue)  =>  {
        if (!userId) {
            if (user.actionType.nonAuth[actionType].actionType&&user.actionType.nonAuth[actionType].actionValue[actionValue]) {
                await db.actions.log(null,actionType,actionValue);
            } else {
                throw messageBook.errorMessage.ACTION_NOT_FOUND;
            }
        } else {
            if (user.actionType.auth[actionType].actionType&&user.actionType.auth[actionType].actionValue[actionValue]) {
                await db.actions.log(userId,actionType,actionValue);
            } else {
                throw messageBook.errorMessage.ACTION_NOT_FOUND;
            }
        }
    },
};

exports.country = {
    list:       ()                  =>  db.country.list(),
};

exports.ccy = {
    list:       ()                  =>  db.ccy.list(),
};

exports.user = {
    read:                   userId                          =>  db.user.read(userId),
    certify:                userId                          =>  {
        return Promise.resolve()
            .then(()        => db.user.setFlag(userId,user.flags.deactivated,user.activationState.deactivated.submittedDocument))
            .then(()        => db.user.setFlag(userId,user.flags.identityCertified,user.flagStatus.pending))
            .then(()        => new Promise(resolve => {setTimeout(resolve,user.identityCertification.timeout)}))
            .then(()        => exports.user.storeDetails(userId,{[user.detailName.document]:(user.identityCertification.passportPrefix+userId)},{overwrite:true},{issuer:true}))
            .then(()        => db.user.setFlag(userId,user.flags.identityCertified,user.flagStatus.true));
    },
    getFlags:               userId                          =>  db.user.getFlags(userId),
    n:                      ()                              =>  db.user.n(),
    fetchDetails:           async userId                    =>  {
        let details = await db.user.fetchDetails(userId);
        let unsignedGetUri,signedGetUri;
        details = details.filter(detail => {
            if (detail.detailName===user.detailName.profilePicture && detail.detailValue.startsWith(userId+"/")) {
                unsignedGetUri=detail.detailValue;
                return false;
            } else {
                return true;
            }
        });
        if (unsignedGetUri) {
            signedGetUri = await exports.user.signGetProfilePicture(unsignedGetUri).catch(error => null);
            if (signedGetUri) details.push({detailName:user.detailName.profilePicture,detailValue:signedGetUri});
        }
        return details;
    },
    deleteDetails:          async (userId,details)          =>  {
        if (details.all) {
            await db.user.deleteDetails(userId);
        } else {
            Object.keys(details).forEach(detail => {
                return db.user.deleteDetail(userId,user.detailName[detail]);
            });
        }
    },
    close:                  userId                          =>  db.user.close(userId).then(() => db.userAccess.deleteAllChannels(userId)),
    isClosed:               userId                          =>  db.user.isClosed(userId),
    getDeactivated:         userId                          =>  db.user.getDeactivated(userId),
    verifyEmail:            token                           =>  email.verifyEmail(token),
    storeDetails:           (userId,userDetails,overwrite,documentPermission) =>  {
        return Promise.resolve()
            .then (()       => Promise.all(Object.keys(userDetails).map(async detailName => {
                if (userDetails[detailName]) {
                    if ((detailName===user.detailName.document)&&(!documentPermission.issuer)) {
                        throw messageBook.errorMessage.CANNOT_UPDATE_DOCUMENT_MANUALLY;
                    } else {
                        const detailFound = await db.user.hasDetail(userId,detailName).then(JSON.stringify).then(JSON.parse).then(result => result.hasDetail);
                        if (detailName===user.detailName.email) {
                            let currentDetails = {};
                            await db.user.fetchDetails(userId).then(JSON.stringify).then(JSON.parse).then(packet => {packet.forEach(thisDetail => {currentDetails[thisDetail.detailName]=thisDetail.detailValue;});});
                            if (userDetails[detailName]!==currentDetails.email) await email.initiateEmailActivation(userId,userDetails[detailName]);
                        }
                        if (detailFound) {
                            if (overwrite) await db.user.updateDetail(userId,detailName,userDetails[detailName]);
                        } else {
                            await db.user.insertDetail(userId,detailName,userDetails[detailName]);
                        }
                    }
                }
            })))
            .then (()       => db.user.fetchDetails(userId))
            .catch(error    => {throw messageBook.errorMessage.ERROR_STORING_USER_DETAILS;});
    },
    signPutProfilePicture:     (userId,fileName,fileType,fileSize) => {
        return Promise.resolve()
            .then (()    => db.user.profilePictureUploads(userId))
            .then(JSON.stringify).then(JSON.parse).then(result => result.profilePictureUploads)
            .then (ppu   => {if (ppu>parseInt(process.env.AMAZON_S3_MAX_PROFILE_PICTURE_UPLOADS)) throw messageBook.errorMessage.PROFILE_PICTURE_TOO_MANY;})
            .then (()    => {if (fileSize>process.env.AMAZON_S3_MAX_PICTURE_SIZE) throw messageBook.errorMessage.PROFILE_PICTURE_TOO_BIG;})
            .then (()    => s3.signPut(userId,fileName,fileType));
    },
    signGetProfilePicture:     unsignedGetUri => {
        return s3.signGet(unsignedGetUri);
    },
    activate:               userId                          => {
        let userFlags;
        return Promise.resolve()
            .then(()        => db.user.getFlags(userId))
            .then(flags     => userFlags=flags)
            .then(()        => {if (!userFlags.emailVerified) throw messageBook.errorMessage.EMAIL_NOT_VERIFIED;})
            .then(()        => {if (!userFlags.incomeApproved) throw messageBook.errorMessage.INCOME_NOT_APPROVED;})
            .then(()        => db.user.activate(userId));
    },
    deactivate:             (userId,activationState)        => {
        if (activationState) return db.user.deactivate(userId,activationState); else throw messageBook.errorMessage.UNACCEPTABLE_DEACTIVATION_CODE;
    },
};

exports.population = {
    nCountry:                   ()                          => db.population.nCountry(),
    nCcy:                       ()                          => db.population.nCcy(),
    forUser:                    userId                      => db.population.forUser(userId),
    readStats:                  populationId                => db.population.readStats(populationId),
    readConfig:                 populationId                => db.population.readConfig(populationId),
    thrubiPriceSilver:          populationId                => db.population.thrubiPriceSilver(populationId)    .catch(e => {throw messageBook.errorMessage.NO_THRUBI_PRICE_SILVER}),
    thrubiPriceSilverNext:      populationId                => db.population.thrubiPriceSilverNext(populationId).catch(e => {throw messageBook.errorMessage.NO_THRUBI_PRICE_SILVER_NEXT}),
    exists:                     (countryId,ccyId)           => db.population.exists(countryId,ccyId),
    create:                     (countryId,ccyId)           => {
        let populationId;
        return Promise.resolve()
            .then (()        => db.population.nextPopulationId())
            .then (result    => populationId=result.nextPopulationId)
            .then (()        => db.population.create(populationId,countryId,ccyId))
            .then (()        => db.population.createConfig(populationId))
            .then (()        => db.population.createRef(populationId))
            .then (()        => db.population.createStats(populationId))
            .then (()        => db.population.computeC(populationId))
            .then (()        => db.population.computeA(populationId))
            .then (()        => db.population.computeEquality(populationId))
            .then (()        => db.population.computeMincome(populationId))
            .then (()        => db.member.massCreate(populationId))
            .then (()        => stabilizers.computeThrubi(-1,populationId,true));
    },
    delete:                     populationId                => {
        return Promise.resolve()
            .then (()        => db.population.deleteMember(populationId))
            .then (()        => db.population.deleteRef(populationId))
            .then (()        => db.population.deleteConfig(populationId))
            .then (()        => db.population.deleteStats(populationId))
            .then (()        => db.population.delete(populationId));
    },
    changeConfig:               (populationId,imit,brake,mincomeMultiplier,mincomeShifter,equalityMultiplier) => {
        return Promise.resolve()
            .then (()        => db.population.changeConfig(populationId,imit,brake,mincomeMultiplier,mincomeShifter,equalityMultiplier))
            .then (()        => stabilizers.computeThrubi(-1,populationId,true))
            .catch(()       => {throw messageBook.errorMessage.CHANGE_CONFIG_ERROR;});
    },
};

exports.ref = {
    list:               populationId    => db.ref.list()                     .catch(e => {throw messageBook.errorMessage.REF_ERROR;}),
    fetch:              populationId    => db.ref.fetch(populationId)        .catch(e => {throw messageBook.errorMessage.REF_ERROR;}),
};

exports.member = {
    create:             (userId,populationId)               => db.member.create(userId,populationId),
    delete:             (userId,populationId)               => {
        return Promise.resolve()
            .then (()    => db.user.setFlag(userId,user.flags.identityCertified,user.flagStatus.false))
            .then (()    => db.user.setFlag(userId,user.flags.incomeApproved,user.flagStatus.false))
            .then (()    => db.user.setFlag(userId,user.flags.deactivated,user.activationState.deactivated.leftPopulation))
            .then (()    => db.member.delete(userId,populationId));
    },
    read:               (userId,populationId)               => db.member.read(userId,populationId),
    declareIncome:      (userId,populationId,mCurrent)      => {
        return Promise.resolve()
            .then (()        => db.user.setFlag(userId,user.flags.deactivated,user.activationState.deactivated.declaredIncome))
            .then (()        => stabilizers.declareIncome(userId,populationId,mCurrent))
            .then (()        => db.user.setFlag(userId,user.flags.incomeApproved,user.flagStatus.pending))
            .then (()        => new Promise(resolve => {setTimeout(resolve,user.incomeApproval.timeout)}))
            .then (()        => db.user.setFlag(userId,user.flags.incomeApproved,user.flagStatus.true))
            .then (()        => exports.user.activate(userId))
            .catch(e         => {throw messageBook.errorMessage.DECLARE_INCOME_ERROR;});
    },
    distribute:         ()                                  => {
        return Promise.resolve()
            .then (()        => db.member.distributeThrubi())
            .then (()        => db.member.zeroThrubi()) //for deactivated users, Thrubi Blue and Silver are set to zero, while keeping _next values
            .catch(e         => {throw messageBook.errorMessage.DISTRIBUTE_THRUBI_ERROR;});
    },
    transform:          ()                                  => accountants.transform()                                  .catch(e => {console.log(e); throw messageBook.errorMessage.TRANSFORM_ERROR;}),
    award:              ()                                  => accountants.award()                                      .catch(e => {console.log(e); throw messageBook.errorMessage.AWARD_ERROR;}),
    claim:              (userId,populationId,ethAddress)    => accountants.claim(userId,populationId,ethAddress)        .catch(e => {console.log(e); throw messageBook.errorMessage.CLAIM_ERROR;}),
};



/*
    Services/member flow:

    member.declareIncome                       (USER)
    member.distribute                          (worker)
    member.transform (on Eth)                  (USER)
    member.transform                           (worker)
        db.member.transformEth                           (worker)
        db.member.transformSilver + db.population.payEth (worker)
    member.award                               (worker)
        db.member.award + db.population.chargeEth        (worker)
    member.claim                               (USER)
        eth.member.claim (on Eth)                        (initiated by service)

 */