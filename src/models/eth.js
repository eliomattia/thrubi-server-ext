const Web3 = require("web3");
const util = require("ethereumjs-util");
const tx = require("ethereumjs-tx");
const THRUBI_ABI = require("../config/eth").THRUBI_ABI;
const THRUBI_ADDRESS = require("../config/eth").THRUBI_ADDRESS;

const WEI_TO_ETH=1e-18;
const ETH_TO_WEI=1e18;

const myAddress = process.env.ETH_BACKEND_ADDRESS;
const privateKey = Buffer.from(process.env.ETH_BACKEND_PRIVATE_KEY,"hex");

//Ganache HttpProvider Endpoint
const web3 = new Web3(new Web3.providers.HttpProvider("http://"+process.env.ETH_IP+":"+process.env.ETH_HTTP_PORT));
const thrubiContract = new web3.eth.Contract(THRUBI_ABI,THRUBI_ADDRESS);

exports.hashMessage = web3.utils.sha3;

exports.recoverAddress = async (hashedJwt,signedMessage) => {
    const msgBuffer = util.toBuffer(hashedJwt);
    const msgHash = util.hashPersonalMessage(msgBuffer);

    const signatureParams = util.fromRpcSig(signedMessage);

    const publicKey = util.ecrecover(
        msgHash,
        signatureParams.v,
        signatureParams.r,
        signatureParams.s
    );
    const addressBuffer = await util.publicToAddress(publicKey);
    return await util.bufferToHex(addressBuffer);
};

exports.createTransaction = async data => {
    let count = await web3.eth.getTransactionCount(myAddress);
    let rawTransaction = {
        "from": myAddress,
        "gasPrice": web3.utils.toHex(process.env.ETH_GAS_PRICE),
        "gasLimit": web3.utils.toHex(process.env.ETH_GAS_LIMIT),
        "to": THRUBI_ADDRESS,
        "value": "0x0",
        "data": data,
        "nonce": web3.utils.toHex(count)
    };
    let transaction = new tx(rawTransaction);
    transaction.sign(privateKey);
    return new Promise(resolve => {resolve(transaction);});
};

exports.sendTransaction = async data => {
    let transaction = await exports.createTransaction(data);
    return new Promise ((resolve,reject) => {
        web3.eth.sendSignedTransaction("0x"+transaction.serialize().toString("hex"))
            .once("confirmation",(confNumber,receipt) => {
                resolve({error:null,result:{confNumber,receipt}});
            })
            .catch(error => {
                reject({error:error,result:null});
            });
    });
};

exports.getLastProcessedTransform = () => {
        return thrubiContract.methods.getLastProcessedTransform().call({from:myAddress}).then(web3.utils.toBN).then(web3.utils.hexToNumber);
};

exports.getLastTransform = () => {
        return thrubiContract.methods.getLastTransform().call({from:myAddress}).then(web3.utils.toBN).then(web3.utils.hexToNumber);
};

exports.getTransform = (i) => {
    return thrubiContract.methods.getTransform(i).call({from:myAddress})
        .then(transform => ({
            userId: web3.utils.hexToNumber(web3.utils.toBN(transform._userId)),
            populationId: web3.utils.hexToNumber(web3.utils.toBN(transform._populationId)),
            ethAddress: transform._ethAddress,
            ethAmount: web3.utils.toBN(transform._weiAmount)*WEI_TO_ETH,
        }));
};

exports.claimEth = async (userId,populationId,ethAddress,ethAmount) => {
    console.log(userId,populationId,ethAddress,ethAmount);
    let weiAmount = web3.utils.toHex(web3.utils.toBN(ethAmount*ETH_TO_WEI));
    console.log("weiAmount: ",weiAmount);
    return await exports.sendTransaction(thrubiContract.methods.claimEth(userId,populationId,ethAddress,weiAmount).encodeABI());
};

exports.signalProcessedTransforms = async () => {
    return await exports.sendTransaction(thrubiContract.methods.signalProcessedTransforms().encodeABI());
};

exports.activateUser = async (activateAddress) => {
    return await exports.sendTransaction(thrubiContract.methods.activateUser(activateAddress).encodeABI());
};