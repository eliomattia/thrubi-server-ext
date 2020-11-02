exports.coinbaseExrateUri = "https://api.coinbase.com/v2/prices/ETH-";
exports.facebookVerifyUri = "https://graph.facebook.com/debug_token?"+
    "access_token="+process.env.FACEBOOK_APP_ACCESS_TOKEN;
exports.facebookApi = "https://graph.facebook.com/v6.0/"+
    process.env.FACEBOOK_APP_ID+"/?";
exports.linkedInVerifyUri = "https://www.linkedin.com/oauth/v2/accessToken?"+
    "grant_type=authorization_code"+
    "&redirect_uri="+process.env.LINKEDIN_REDIRECT_URI+
    "&client_id="+process.env.LINKEDIN_APP_ID+
    "&client_secret="+process.env.LINKEDIN_APP_SECRET;
exports.linkedInApi = "https://api.linkedin.com/v2/me?"+
    "projection=(id,email,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))";
exports.googleTokenUri = "https://oauth2.googleapis.com/token";
exports.googleAuth_provider_x509_cert_url = "https://www.googleapis.com/oauth2/v1/certs";
exports.googleVerifyUri = "https://oauth2.googleapis.com/token?"+
    "grant_type=authorization_code"+
    "&redirect_uri="+process.env.GOOGLE_REDIRECT_URI+
    "&client_id="+process.env.GOOGLE_APP_ID+
    "&client_secret="+process.env.GOOGLE_APP_SECRET;
exports.googleApi = "https://www.googleapis.com/oauth2/v2/userinfo";
exports.twitterTokenUri = "https://api.twitter.com/oauth/authorize?oauth_token=";