import { buildApp } from './app'
import { ensureBucketExists } from './lib/storage'
import { startJamWorker } from './lib/worker'

const app = buildApp()

const start = async () => {
  try {
    await ensureBucketExists()
    startJamWorker()
    await app.listen({
      port: Number(process.env.PORT ?? 4000),
      host: '0.0.0.0'
    })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()