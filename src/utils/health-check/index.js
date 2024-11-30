const AWS = require('aws-sdk');
const queueUrl = process.env.TASKS_QUEUE_URL;

if (!queueUrl) {
  console.error('Environment variable TASKS_QUEUE_URL is not set.');
  process.exit(1);
}

const sqs = new AWS.SQS();

(async () => {
  try {
    const result = await sqs.getQueueAttributes({
      QueueUrl: queueUrl,
      AttributeNames: ['All'],
    }).promise();

    console.log('SQS Health Check Passed:', result.Attributes);
    process.exit(0);
  } catch (error) {
    console.error('SQS Health Check Failed:', error.message);
    process.exit(1);
  }
})();