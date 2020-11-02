const services = require("../services/services");

const SECOND = 1000;
const MINUTE = 60*SECOND;
const HOUR   = 60*MINUTE;

const DISTRIBUTE_INTERVAL       = 0.5*MINUTE;
const DISTRIBUTE_KILL_INTERVAL  = 360*HOUR;
const  TRANSFORM_INTERVAL       = 0.5*MINUTE;
const  TRANSFORM_KILL_INTERVAL  = 360*HOUR;
const      AWARD_INTERVAL       = 0.5*MINUTE;
const      AWARD_KILL_INTERVAL  = 360*HOUR;

// -------
// Startup
// -------
exports.startup = () => {
    Workers.addWorker("Distribute", services.member.distribute, "Distribute","distributed Thrubi",   DISTRIBUTE_INTERVAL,DISTRIBUTE_KILL_INTERVAL);
    Workers.addWorker("Transform",  services.member.transform,  "Transform", "processed transforms", TRANSFORM_INTERVAL, TRANSFORM_KILL_INTERVAL);
    Workers.addWorker("Award",      services.member.award,      "Award",     "awarded Eth",          AWARD_INTERVAL,     AWARD_KILL_INTERVAL);
};

// -------
// Workers
// -------

let Workers = {
    workers: {},
    addWorker: (index,workerAction,workerName,actionName,interval,killInterval) => {
        let newWorker = {};

        newWorker.action = async () => {
            await workerAction().catch(error => console.error(error));
            console.log("Worker "+actionName+" at: ",new Date().toUTCString());
        };
        newWorker.start = interval => {
            Workers.workers[index] = {};
            Workers.workers[index].currentWorker = setInterval(async () => {
                await newWorker.action();
            },interval);
        };
        newWorker.stop = () => {
            clearInterval(Workers.workers[index].currentWorker);
        };

        console.log("Time now: ",new Date().toUTCString());

        newWorker.start(interval);
        console.log(workerName+" worker active, interval: "+(interval/SECOND).toFixed(0)+" seconds.");

        setTimeout(() => {
            console.log("Stopping "+workerName+" worker.....");
            newWorker.stop()
        },killInterval);
        console.log(workerName+" worker will be killed in: "+(killInterval/HOUR).toFixed(0)+" hours.");

        Workers.workers[index] = newWorker;
    },
};