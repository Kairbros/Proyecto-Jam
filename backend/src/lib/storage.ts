import { Client } from 'minio'
import { Transform } from 'stream'

export const minio = new Client({
  endPoint: process.env.MINIO_ENDPOINT ?? 'localhost',
  port: Number(process.env.MINIO_PORT ?? 9000),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin_secret'
})

const BUCKET = process.env.MINIO_BUCKET ?? 'jamhub'

export async function ensureBucketExists() {
  const exists = await minio.bucketExists(BUCKET)
  if (!exists) {
    await minio.makeBucket(BUCKET)
    await minio.setBucketPolicy(BUCKET, JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${BUCKET}/*`]
      }]
    }))
  }
}

export async function uploadFile(key: string, buffer: Buffer, contentType: string) {
  await minio.putObject(BUCKET, key, buffer, buffer.length, { 'Content-Type': contentType })
  const base = process.env.MINIO_PUBLIC_URL ?? `http://localhost:9000/${BUCKET}`
  return `${base}/${key}`
}

// Streams directly to MinIO — no buffering, suitable for files up to 2GB.
// Returns the public URL and exact byte count.
export async function uploadStream(
  key: string,
  stream: NodeJS.ReadableStream,
  contentType: string
): Promise<{ url: string; sizeBytes: number }> {
  let sizeBytes = 0
  const counter = new Transform({
    transform(chunk, _enc, cb) {
      sizeBytes += (chunk as Buffer).length
      cb(null, chunk)
    }
  })
  stream.pipe(counter)
  await minio.putObject(BUCKET, key, counter)
  const base = process.env.MINIO_PUBLIC_URL ?? `http://localhost:9000/${BUCKET}`
  return { url: `${base}/${key}`, sizeBytes }
}

export async function deleteFile(key: string) {
  await minio.removeObject(BUCKET, key)
}