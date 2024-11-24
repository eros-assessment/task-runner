const { Worker } = require('worker_threads');
const { getRandomInt, waitForTimeout } = require("../../utils/random");
const Logger = require("../../utils/logger");

class Task {
    constructor({ id, type, attempts, failPercentage, resourceIntensive }) {
        this.id = id;
        this.type = type;
        this.attempts = attempts;
        this.failPercentage = failPercentage;
        this.resourceIntensive = resourceIntensive;
        this.log = Logger.child({ id, type, attempts, failPercentage, resourceIntensive })
    }

    async perform() {
        const isFail = Math.random() <= this.failPercentage;
        if (isFail) {
            this.log.error("Task failed purposely");
            throw new Error()
        }

        switch (this.type) {
            case "light":
                await this.performLightTask();
                break;
            case "average":
                await this.performAverageTask();
                break;
            case "intense":
                await this.performIntenseTask();
                break;
            default:
                throw new Error("Task type not found");
        }
    }

    async performLightTask() {
        if (this.resourceIntensive === "cpu") {
            const workers = getRandomInt(1, 1);
            await this.cpuTask(workers);
            return;
        }

        const ramUsageInMB = getRandomInt(1, 5);
        await this.memoryIntensiveTask(ramUsageInMB);
    }

    async performAverageTask() {
        if (this.resourceIntensive === "cpu") {
            const workers = getRandomInt(2, 3);
            await this.cpuTask(workers);
            return;
        }

        const ramUsageInMB = getRandomInt(10, 20);
        await this.memoryIntensiveTask(ramUsageInMB);
    }

    async performIntenseTask() {
        if (this.resourceIntensive === "cpu") {
            const runningTime = getRandomInt(4, 6);

            await this.cpuTask(runningTime);
            return;
        }

        const ramUsageInMB = getRandomInt(100, 250);
        await this.memoryIntensiveTask(ramUsageInMB);
    }



    async cpuTask(workers) {
        const durationInMs = getRandomInt(2000, 8000);
        this.log.info("Performing CPU task", { workers, durationInMs });
        const start = process.hrtime();
        const workerPromises = [];
        for (let i = 0; i < workers; i++) {
            const workerThread = new Promise((resolve, reject) => {
                const worker = new Worker(`
                  const { parentPort } = require('worker_threads');
                  let end = Date.now() + 5000; // Simulate heavy computation for 5 seconds
                  while (Date.now() < end) {
                    Math.sqrt(Math.random() * Math.random());
                  }
                  parentPort.postMessage('Done');
                `, { eval: true });

                // Resolve the promise when the worker sends a message
                worker.on('message', (msg) => {
                    resolve();
                });

                // Handle errors from the worker
                worker.on('error', (err) => {
                    reject(err);
                });

                // Ensure the worker is cleaned up properly
                worker.on('exit', (code) => {
                    if (code !== 0) {
                        reject(new Error(`Worker stopped with exit code ${code}`));
                    }
                });
            });
            workerPromises.push(workerThread);
        }
        await Promise.all(workerPromises);
        const end = +((process.hrtime(start)[0]) / 1000).toFixed(2)
        this.log.info(`Completed CPU task`, { workers, durationInMs, time: end });
    }


    async memoryIntensiveTask(memoryInMB) {
        this.log.info("Performing RAM task", { memoryInMB });
        const start = process.hrtime();
        const bufferSize = memoryInMB * 1024 * 1024; // Convert MB to bytes
        const buffer = Buffer.alloc(bufferSize);   // Create a buffer to hold the memory

        // Optionally fill the buffer with data
        for (let i = 0; i < buffer.length; i += 1024) {
            buffer.write('a', i); // Fill with 'a' to create some activity
        }
        const end = +((process.hrtime(start)[0]) / 1000).toFixed(2)
        await waitForTimeout(getRandomInt(2000, 8000));
        this.log.info(`Completed RAM task`, { memoryInMB, time: end });
    }


}

module.exports = Task;