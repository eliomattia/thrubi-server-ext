const nodemailer    = require("nodemailer");
const jwt           = require("jsonwebtoken");
const db            = require("./db");
const services      = require("../services/services");
const user          = require("../config/user").user;
const messageBook   = require("../config/message").messageBook;

const releaseEmailJwt = (userId,email) => {
    let options = {issuer:process.env.JWT_ISSUER,expiresIn:process.env.JWT_EMAIL_EXPIRY_TIME};
    let secret = process.env.JWT_EMAIL_SECRET;
    return Promise.resolve()
        .then(()            => jwt.sign({userId,email},secret,options));
};

const verifyEmailJwt = token => {
    return Promise.resolve()
        .then (()           => jwt.verify(token,process.env.JWT_EMAIL_SECRET));
};

const sendEmail = async (email,subject,text,html,emailType) => {
    let transporter,mailOptions;
    let appName = "Thrubi";

    transporter = nodemailer.createTransport({
        host: process.env.EMAIL_SERVER,
        port: process.env.EMAIL_SSL_PORT,
        secure: true,
        logger: true,
        debug: true,
        auth: {
            user: process.env.EMAIL_ACCOUNT,
            pass: process.env.EMAIL_PASSWORD,
        }
    });
    mailOptions = {
        from: {
            name: appName,
            address: process.env.EMAIL_ACCOUNT
        },
        to: email,
        cc: process.env.EMAIL_ACCOUNT,
        subject: subject,
        text: text,
        html: html,
    };
    console.log("Starting nodemailer");
    await transporter.sendMail(mailOptions,(error,info) => {
        if (error) {
            return console.error(error);
        }
        console.log(emailType+" message %s sent: %s", info.messageId, info.response);
        console.log("Full info: ",info,error);
    });
};

exports.verifyEmail = async token => {
    let userId;
    return Promise.resolve()
        .then   (()           => verifyEmailJwt(token))
        .then   (payload      => userId=payload.userId)
        .then   (()           => db.user.setFlag(userId,user.flags.emailVerified,user.flagStatus.true))
        .then   (()           => db.user.getFlags(userId))
        .catch  (e            => {throw messageBook.errorMessage.EMAIL_LINK_EXPIRED})
        .finally(()           => {if (userId!==undefined) services.user.activate(userId)});
};

exports.initiateEmailActivation = async (userId,email) => {
    let emailJwt,link;
    let subject,text,html;
    let userDetails = {};
    let name;

    await db.user.setFlag(userId,user.flags.emailVerified,user.flagStatus.false);
    await services.user.deactivate(userId,user.activationState.deactivated.changedEmail);
    await db.user.fetchDetails(userId).then(JSON.stringify).then(JSON.parse)
        .then(packet => packet.forEach(thisDetail => {userDetails[thisDetail.detailName]=thisDetail.detailValue;}));
    name = userDetails[user.detailName.name];
    emailJwt = await releaseEmailJwt(userId,email);
    link = process.env.EMAIL_VERIFY_URI+emailJwt;
    subject = (name?(name+", w"):"W")+"elcome to Thrubi - Please activate your email address!";
    text = "Welcome to Thrubi. Please click (within "+process.env.JWT_EMAIL_EXPIRY_TIME+") on the following link to activate your email address: "+link;
    html = `<html lang="en">
      <body>
        <p>Hi${name?(" "+name):""},</p>
        <p>Thank you for registering your email with Thrubi.</p>
        <p>Please click on <b><a href="${link}">this link</a></b> to activate your email address.</p>
        <p>
            Thank you,<br/>
            Thrubi<br/>
            https://www.thrubi.org<br/>
            info@thrubi.org
        </p>
      </body>
    </html>`;

    await sendEmail(email,subject,text,html,"Email registration");
};

exports.newsletterSubscribedEmail = async email => {
    let subject,text,html;

    subject = "Welcome to Thrubi and thank you for registering to the newsletter!";
    text =  "Hi, Thanks for registering to the Thrubi newsletter. We will keep you up to date with our progress as it happens. " +
            "Thank you, Thrubi - https://www.thrubi.org - info@thrubi.org";
    html = `<html lang="en">
      <body>
        <p>Hi,</p>
        <p>Thanks for registering to the Thrubi newsletter.</p>
        <p>We will keep you up to date with our progress as it happens.</p>
        <p>
            Thank you,<br/>
            Thrubi<br/>
            https://www.thrubi.org<br/>
            info@thrubi.org
        </p>
      </body>
    </html>`;

    await sendEmail(email,subject,text,html,"Newsletter subscribed");
};