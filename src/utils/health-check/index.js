
const AWS = require('aws-sdk');

const queueUrl = process.env.TASKS_QUEUE_URL;

if (!queueUrl) {
  console.error('Environment variable TASKS_QUEUE_URL is not set.');
  process.exit(1);
}

// Configure AWS SDK
const sqs = new AWS.SQS();

(async () => {
  try {
    // Check queue attributes
    const result = await sqs.getQueueAttributes({
      QueueUrl: queueUrl,
      AttributeNames: ['All'], // Or just specific attributes if needed
    }).promise();

    console.log('SQS Health Check Passed:', result.Attributes);
    process.exit(0); // Success
  } catch (error) {
    console.error('SQS Health Check Failed:', error.message);
    process.exit(1); // Failure
  }
})();