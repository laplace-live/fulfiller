import pino from 'pino'

// Create the base logger configuration
// Note: pino-pretty transport has issues with Bun due to thread-stream
// For Bun compatibility, we use standard output and pipe to pino-pretty if needed
const logger = pino({
  level: process.env['LOG_LEVEL'] || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: label => {
      return { level: label.toUpperCase() }
    },
  },
  // Disable pretty printing in logger configuration for Bun compatibility
  // Users can pipe output to pino-pretty if needed: bun run dev | bunx pino-pretty
})

// Create child loggers for different modules
export const createLogger = (module: string) => {
  return logger.child({ module })
}

export default logger
