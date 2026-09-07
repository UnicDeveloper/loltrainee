type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const PREFIX = '[LoL Coach]';

function log(level: LogLevel, message: string, details?: unknown): void {
  const payload = details === undefined ? [PREFIX, message] : [PREFIX, message, details];

  switch (level) {
    case 'debug':
      console.debug(...payload);
      break;
    case 'info':
      console.info(...payload);
      break;
    case 'warn':
      console.warn(...payload);
      break;
    case 'error':
      console.error(...payload);
      break;
  }
}

export const logger = {
  debug: (message: string, details?: unknown) => log('debug', message, details),
  info: (message: string, details?: unknown) => log('info', message, details),
  warn: (message: string, details?: unknown) => log('warn', message, details),
  error: (message: string, details?: unknown) => log('error', message, details),
};
