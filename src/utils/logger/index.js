const winston = require('winston');

const stripAnsi = (() => {
  const pattern = [
    "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))",
  ].join("|");
  const regex = new RegExp(pattern, "g");
  return (str) => {
    return str.replace(regex, "");
  };
})();

const errorObjectFormat = winston.format((info) => {
  if (info.error instanceof Error) {
    const enumeratedErrorObject = {}
    Object.getOwnPropertyNames(info.error).forEach((key) => {
      enumeratedErrorObject[key] = info.error[key];
    });
    info.error = enumeratedErrorObject;
  }
  return info;
});

function rest(info) {
  if (Object.keys(info).length === 0) {
    return "";
  }

  info.level = stripAnsi(info.level);
  info.logDate = new Date();

  try {
    return JSON.stringify(info)
  } catch (e) {
    return inspect(info, { depth: null, compact: true, breakLength: Infinity });
  }
}

// Configure the logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    errorObjectFormat(),
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        errorObjectFormat(),
        winston.format.colorize(),
        winston.format.printf((info) => {
          if (process.env.ENVIRONMENT !== "local") {
            return rest(info)
          }

          return `[${info.level}] ${info.message}\n${rest(info)}`
        })
      ),
      silent: process.env.ENVIRONMENT === "test",
    }),
  ]
});

// Export the logger for use in other modules
module.exports = logger;