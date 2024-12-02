const AWS = require('aws-sdk');
const AWSXRay = require('aws-xray-sdk');
const logger = require("./utils/logger");
const Task = require("./services/task");

AWSXRay.captureAWS(AWS);

const docClient = new AWS.DynamoDB.DocumentClient();
const putItem = async (tableName, item) => {
    const params = {
        TableName: tableName,
        Item: item,
    };

    try {
        const data = await docClient.put(params).promise();
        logger.info('Item successfully added', { item });
        return data;
    } catch (err) {
        logger.error('Unable to add item', { error: err.message });
        throw err;
    }
};

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
            await putItem(process.env.TASKS_DYNAMODB_TABLE, {
                taskId: taskBody.id,
                status: "completed",
                timestamp: +(Date.now() / 1000),
                ttl: Math.floor(Date.now() / 1000) + 3600, // expire after 1 hour
                ...taskBody
            })
        } catch (err) {
            logger.error(`Received error: ${err.message}`, { error: err.message });
            await putItem(process.env.TASKS_DYNAMODB_TABLE, {
                taskId: taskBody.id,
                status: "error",
                timestamp: +(Date.now() / 1000),
                ttl: Math.floor(Date.now() / 1000) + 3600, // expire after 1 hour
                ...taskBody
            })
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







