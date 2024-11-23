const Task = require("./services/task");

payload = [
    {
        id: 1,
        attempts: 1,
        numberOfTasks: 10,
        status: "running",
        type: "intense",
        resourceIntensive: "cpu",
        failPercentage: 0.1
    }
];

(async () => {
    await Promise.all(payload.map(async (taskData) => {
        const task = new Task(taskData);
        await task.perform();
    }))
})();