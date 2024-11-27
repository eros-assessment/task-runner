const AWS = require('aws-sdk');
const AWSXRay = require('aws-xray-sdk');

AWSXRay.captureAWS(AWS);

const Task = require("./services/task");

const { Consumer } = require("sqs-consumer");
const logger = require("./utils/logger");

const consumer = Consumer.create({
    queueUrl: process.env.TASKS_QUEUE_URL,
    handleMessage: async (message) => {
        logger.info("Received message", { message })
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

consumer.on("started", () => {
    logger.info("Registered to SQS and wait for messages");
})

consumer.on("error", (err) => {
    logger.error(`Received error: ${err.message}`, { error: err.message });
});

consumer.on("processing_error", (err) => {
    logger.error(`Processing error: ${err.message}`, { error: err.message });
});

consumer.start();

