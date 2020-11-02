const aws = require("aws-sdk");

exports.signGet = unsignedGetUri => {
    aws.config.region = "us-west-1";
    const s3 = new aws.S3();

    let s3Params = {
        Bucket:         process.env.AMAZON_S3_BUCKET_NAME,
        Key:            unsignedGetUri,
        Expires:        86400, // 1 day
    };

    return new Promise ((resolve,reject) => {
        s3.getSignedUrl("getObject",s3Params,async (error,signedGetUri) => {
            if (error) {
                reject(error);
            }
            resolve(signedGetUri);
        });
    });
};


exports.signPut = (userId,fileName,fileType) => {
    aws.config.region = "us-west-1";
    const s3 = new aws.S3();

    let s3Params = {
        Bucket:         process.env.AMAZON_S3_BUCKET_NAME,
        Key:            userId+"/"+fileName,
        Expires:        600, // 10 minutes
        ContentType:    fileType,
        ACL:            "private",
    };

    return new Promise ((resolve,reject) => {
        s3.getSignedUrl("putObject",s3Params,async (error,signedPutUri) => {
            if (error) {
                reject(error);
            }
            const returnData = {
                signedPutUri:signedPutUri,
                unsignedGetUri:`${userId}/${fileName}`,
            };
            resolve(returnData);
        });
    });
};

