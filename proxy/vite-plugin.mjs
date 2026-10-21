// Vite dev plugin: mounts the Xenu proxy at /xenu-proxy during development.
import { handleProxy } from './core.mjs'

export default function xenuProxy() {
  return {
    name: 'xenu-proxy',
    configureServer(server) {
      server.middlewares.use('/xenu-proxy', (req, res) => {
        handleProxy(req, res).catch((err) => {
          res.statusCode = 500
          res.end('proxy crash: ' + err.message)
        })
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use('/xenu-proxy', (req, res) => {
        handleProxy(req, res).catch((err) => {
          res.statusCode = 500
          res.end('proxy crash: ' + err.message)
        })
      })
    },
  }
}
