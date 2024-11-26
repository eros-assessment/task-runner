const Task = require("./services/task");

const { Consumer } = require("sqs-consumer");
const logger = require("./utils/logger");

const consumer = Consumer.create({
    queueUrl: "https://sqs.eu-west-1.amazonaws.com/569985934894/tsk-dev-tasks",
    handleMessage: async (message) => {
        const { Body } = message;
        const payload = JSON.parse(Body);
        const task = new Task(payload);
        await task.perform();       
    },
});

consumer.on("error", (err) => {
    console.error(err.message);
});

consumer.on("processing_error", (err) => {
    console.error(err.message);
});

consumer.start();
logger.info("Registered to SQS and wait for messages");

