const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = LEVELS[process.env.LOG_LEVEL || 'info'];

function timestamp() {
  return new Date().toISOString();
}

function log(level, module, message, data) {
  if (LEVELS[level] < currentLevel) return;
  const entry = {
    time: timestamp(),
    level,
    module,
    message,
    ...(data && { data })
  };
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn(JSON.stringify(entry));
}

export function createLogger(module) {
  return {
    debug: (msg, data) => log('debug', module, msg, data),
    info: (msg, data) => log('info', module, msg, data),
    warn: (msg, data) => log('warn', module, msg, data),
    error: (msg, data) => log('error', module, msg, data),
  };
}
