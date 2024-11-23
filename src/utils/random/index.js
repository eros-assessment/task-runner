const getRandomInt = (min, max) => {
    const start = Math.ceil(min);
    const end = Math.floor(max);
    return Math.floor(Math.random() * (end - start + 1) + start);
};

const waitForTimeout = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { getRandomInt, waitForTimeout };