# Task Runner API Documentation

## Overview

This repository contains a Node.js application responsible for consuming tasks from an AWS SQS queue. It listens for incoming messages and processes tasks asynchronously. The app can poll the queue to retrieve tasks, process them, and provide status updates.

### Core Functionality

- **Polling**: Continuously listens to the SQS queue for incoming task messages.
- **Task Processing**: Each message contains a task which is processed as defined in the task's details.
- **Status Update**: After processing, the status of the task is updated and can be stored or logged accordingly.

### Example Workflow

1. The Task Runner polls the SQS queue for new tasks.
2. When a new task is retrieved, it processes the task asynchronously.
3. Upon successful completion, the task is marked as completed, or an error message is logged if the task fails.

## Environment Variables

The following environment variables are required for the application to run properly:

| Variable Name        | Description                                                          | Default Value  |
|----------------------|----------------------------------------------------------------------|----------------|
| `TASKS_QUEUE_URL`    | AWS SQS URL where task messages will be consumed 
from.               | `null`
| `AWS_ACCESS_KEY_ID`  | AWS Access Key for authenticating the application.                   | `null`         |
| `AWS_SECRET_ACCESS_KEY` | AWS Secret Access Key for authenticating the application.           | `null`         |
| `ENVIRONMENT`        | The running environment name (e.g., development, production).        | `null`|


### Local development

```bash
    npm install
    npm run dev
```