require("dotenv").config();

const http          = require("http");
const https         = require("https");
const fs            = require("fs");
const path          = require("path");
const express       = require("express");
const bodyParser    = require("body-parser");
const router        = require("./routers/router");
const workers       = require("./workers/workers");
const logger        = require("./controllers/middlewares/logger");

const jsonParser = bodyParser.json(({limit:"50mb"}));

// -------
// workers
// -------

workers.startup();

// ---
// app
// ---

const app = express();

app.use(jsonParser);

app.use((req,res,next) => {
    res.header("Access-Control-Allow-Origin","*");
    res.header("Access-Control-Allow-Headers","Origin,X-Requested-With,Content-Type,Accept,X-Access-Token");
    res.header("Access-Control-Expose-Headers","X-Access-Token");
    next();
});
app.use(logger.logRequest);

app.use("",router);

// -------
// servers
// -------

const privateKey  = fs.readFileSync(path.resolve(__dirname,process.env.HTTPS_CERTIFICATE_PATH_PRIVATE_KEY),"utf8");
const certificate = fs.readFileSync(path.resolve(__dirname,process.env.HTTPS_CERTIFICATE_PATH_CERTIFICATE),"utf8");
const passphrase  = process.env.HTTPS_PASSPHRASE;

const credentials = {key:privateKey,cert:certificate,passphrase:passphrase};

const httpServer = http.createServer(app);
const httpsServer = https.createServer(credentials,app);

const HTTP_PORT   = process.env.PORT || process.env.HTTP_PORT;
const HTTPS_PORT  = process.env.PORT || process.env.HTTPS_PORT;

if (process.env.NODE_ENV === "production") {
    httpServer.listen(HTTP_PORT);
    //httpsServer.listen(HTTPS_PORT);

    console.log("HTTP server listening on port "+HTTP_PORT);
    //console.log("HTTPS server listening on port "+HTTPS_PORT);
} else {
    //httpServer.listen(HTTP_PORT,process.env.IP);
    httpsServer.listen(HTTPS_PORT,process.env.IP);

    //console.log("HTTP server listening at http://"+process.env.IP+":"+HTTP_PORT);
    console.log("HTTPS server listening at https://"+process.env.IP+":"+HTTPS_PORT);
}
