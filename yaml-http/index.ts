import fs from 'node:fs'
import { Server } from './core/server'
import yaml from 'yaml'

console.log('YAML-HTTP Server')

if (!fs.existsSync('src')) {
    console.log('[ERR] No source directory found, one has been created for you. However since there is no src/application.yaml file either the process is exiting')
    fs.mkdirSync('src')
    process.exit()
}
if (!fs.existsSync('src/application.yaml')) {
    console.log('[ERR] There is no src/application.yaml file, the process is exiting')
    process.exit()
}

const application = yaml.parse(fs.readFileSync('src/application.yaml' , 'utf-8'))

Server.SECURE_PORT = application.server.securePort
Server.UNSECURE_PORT = application.server.unsecurePort

console.log('[LOG] Server(s) starting, http: ' + Server.UNSECURE_PORT + ', https: ' + Server.SECURE_PORT)

const server = new Server(application.application)