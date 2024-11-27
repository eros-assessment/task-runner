const AWS = require('aws-sdk');
const AWSXRay = require('aws-xray-sdk');

AWSXRay.captureAWS(AWS);

const Task = require("./services/task");

const { Consumer } = require("sqs-consumer");
const logger = require("./utils/logger");

const consumer = Consumer.create({
    queueUrl: "https://sqs.eu-west-1.amazonaws.com/569985934894/tsk-dev-tasks",
    handleMessage: async (message) => {
        const segment = AWSXRay.getSegment();
        const subsegment = segment.addNewSubsegment("clientTaskPerform")

        const { Body } = message;

        const payload = JSON.parse(Body);
        subsegment.addMetadata("taskDetails", payload);
        const task = new Task(payload);
        await task.perform();       
        subsegment.close();
    },
});

consumer.on("error", (err) => {
    console.error(err.message);
});

consumer.on("processing_error", (err) => {
    console.error(err.message);
});

logger.info("Registered to SQS and wait for messages");
consumer.start();

