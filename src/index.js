const AWS = require('aws-sdk');
const AWSXRay = require('aws-xray-sdk');
const logger = require("./utils/logger");
const Task = require("./services/task");

AWSXRay.captureAWS(AWS);

const { Consumer } = require("sqs-consumer");
const consumer = Consumer.create({
    queueUrl: process.env.TASKS_QUEUE_URL,
    handleMessage: async (message) => {
        const segment = new AWSXRay.Segment(`task-runner-${process.env.ENVIRONMENT}`);
        const { Body } = message;
        logger.info("Received message", { Body });            
        const { taskBody } = JSON.parse(Body);
        try {
            segment.addAnnotation("Environment", process.env.ENVIRONMENT);
            segment.addAnnotation("TaskId", taskBody.id);
            segment.addMetadata("QueueMessage", taskBody);

            const task = new Task(taskBody);
            await task.perform();
            segment.close();
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




