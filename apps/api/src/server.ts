import { buildApp } from './app'
import { config } from './config'

const app = await buildApp()

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'Shutting down')
  await app.close()
  process.exit(0)
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))

try {
  await app.listen({ host: config.host, port: config.port })
  app.log.info(`VidyaGram API ready at http://${config.host}:${config.port}${config.apiPrefix}`)
} catch (error) {
  app.log.error(error)
  process.exit(1)
}
