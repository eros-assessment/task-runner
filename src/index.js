process.env.TASKS_QUEUE_URL = "https://sqs.eu-west-1.amazonaws.com/569985934894/tsk-dev-tasks"
process.env.ENVIRONMENT = "dev"


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
        const taskBody = JSON.parse(Body);
        const { root, parent } = AWSXRay.utils.processTraceData(Attributes.AWSTraceHeader);
        const segment = new AWSXRay.Segment(`task-runner-${process.env.ENVIRONMENT}`, root, parent);
        const subSegment = segment.addNewSubsegment("ProcessingTask");
        subSegment.addAnnotation("Environment", process.env.ENVIRONMENT);
        subSegment.addAnnotation("TaskId", taskBody.id);
        subSegment.addMetadata("QueueMessage", taskBody);

        try {
            const task = new Task(taskBody);
            await task.perform();
            subSegment.close();
            segment.close();
        } catch (err) {
            logger.error(`Received error: ${err.message}`, { error: err.message });
            throw err;
        } finally {
            subSegment.close();
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




