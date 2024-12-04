const AWS = require('aws-sdk');
const AWSXRay = require('aws-xray-sdk');
const logger = require("./utils/logger");
const Task = require("./services/task");

AWSXRay.captureAWS(AWS);  // Capture AWS SDK calls (e.g., SQS, DynamoDB, etc.)
const ns = AWSXRay.getNamespace();  // AWS X-Ray namespace to manage context

// DynamoDB client setup
const docClient = new AWS.DynamoDB.DocumentClient();

// Function to insert items into DynamoDB
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

// Set up the SQS consumer to listen for incoming messages
const { Consumer } = require("sqs-consumer");

const consumer = Consumer.create({
    queueUrl: process.env.TASKS_QUEUE_URL,
    messageSystemAttributeNames: ["AWSTraceHeader"], // SQS trace context attribute

    handleMessage: async (message) => {
        const { Body, Attributes } = message;
        logger.info("Received message", { Body });

        // Extract task body and trace context from the SQS message
        const { taskBody } = JSON.parse(Body);
        const { root, parent } = AWSXRay.utils.processTraceData(Attributes.AWSTraceHeader);

        // Create a new X-Ray segment for this task processing
        const segment = new AWSXRay.Segment(`task-runner-${process.env.ENVIRONMENT}`, root, parent);
        ns.run(async () => {
            AWSXRay.setSegment(segment); // Set the segment for the current context

            // Add a subsegment for task processing
            const subsegment = segment.addNewSubsegment("TaskProcessing");
            subsegment.addAnnotation("Environment", process.env.ENVIRONMENT);
            subsegment.addAnnotation("TaskId", taskBody.id);
            subsegment.addMetadata("QueueMessage", taskBody);

            try {
                // Initialize and perform the task
                const task = new Task(taskBody);
                await task.perform();

                // Save task status to DynamoDB (completed)
                await putItem(process.env.TASKS_DYNAMODB_TABLE, {
                    taskId: taskBody.id,
                    status: "completed",
                    timestamp: +(Date.now() / 1000),
                    ttl: Math.floor(Date.now() / 1000) + 3600,  // Expire after 1 hour
                    ...taskBody,
                });

                // Close the task subsegment as the task was completed
                subsegment.close();
            } catch (err) {
                // If error occurs, capture it in the subsegment
                subsegment.addError(err);
                logger.error(`Received error while processing task ${taskBody.id}: ${err.message}`, { error: err.message });

                // Update task status to error in DynamoDB
                await putItem(process.env.TASKS_DYNAMODB_TABLE, {
                    taskId: taskBody.id,
                    status: "error",
                    timestamp: +(Date.now() / 1000),
                    ttl: Math.floor(Date.now() / 1000) + 3600,  // Expire after 1 hour
                    ...taskBody,
                });

                // Re-throw the error so that the consumer knows it failed
                throw err;
            } finally {
                // Always close the main segment after processing the task
                segment.close();
            }
        });
    },
});

// Event listener for when the consumer starts
consumer.on("started", () => {
    logger.info("Registered to SQS and waiting for messages");
});

// Event listener for errors during consumer operation
consumer.on("error", (err) => {
    logger.error(`Consumer encountered an error: ${err.message}`, { error: err.message });
});

// Event listener for errors while processing messages
consumer.on("processing_error", (err) => {
    logger.error(`Error processing message: ${err.message}`, { error: err.message });
});

// Start consuming SQS messages
consumer.start();
