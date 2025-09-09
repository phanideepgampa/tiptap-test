import { Server } from '@hocuspocus/server'

const port = process.env.PORT ? Number(process.env.PORT) : 8080

const server = Server.configure({
  port,
  // Add Logger/Database extensions as needed
  // extensions: [ new Logger(), new Database({ fetch, store }) ]
})

server.listen()
console.log(`[hocuspocus] listening on ws://localhost:${port}`)

