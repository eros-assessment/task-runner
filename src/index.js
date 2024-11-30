const AWS = require('aws-sdk');
const AWSXRay = require('aws-xray-sdk');
const logger = require("./utils/logger");
const Task = require("./services/task");

AWSXRay.captureAWS(AWS);

const { Consumer } = require("sqs-consumer");
const consumer = Consumer.create({
    queueUrl: process.env.TASKS_QUEUE_URL,
    messageSystemAttributeNames: ["AWSTraceHeader"],

    handleMessage: async (message) => {
        const { Body, Attributes } = message;
        logger.info("Received message", { Body });
        const { taskBody } = JSON.parse(Body);
        const { root, parent } = AWSXRay.utils.processTraceData(Attributes.AWSTraceHeader);
        const segment = new AWSXRay.Segment(`task-runner-${process.env.ENVIRONMENT}`, root, parent);

        segment.addAnnotation("Environment", process.env.ENVIRONMENT);
        segment.addAnnotation("TaskId", taskBody.id);
        segment.addMetadata("QueueMessage", taskBody);

        try {
            const task = new Task(taskBody);
            await task.perform();
        } catch (err) {
            logger.error(`Received error: ${err.message}`, { error: err.message });
            throw err;
        } finally {
            segment.close();
        }
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







