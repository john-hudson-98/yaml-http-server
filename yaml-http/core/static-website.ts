import { IncomingMessage, ServerResponse } from 'http';
import { Endpoint } from './appstate/controller'
import fs from 'node:fs'
import path from 'path';

export class StaticWebsite {
    
    private endpoint:Endpoint
    
    constructor(endpoint: Endpoint) {
        this.endpoint = endpoint    
    }
    handle(request: IncomingMessage, response: ServerResponse) {
        const serverRoot = 'src/' + this.endpoint.directory + '/'

        let target = stripRouteFromPath(this.endpoint.route , serverRoot + request.url)

        if (target.includes('.html')) {
            target.substring(0 , target.indexOf('.html') + 5)
        }

        if (fs.lstatSync(serverRoot).isDirectory()) {
            if (fs.existsSync(target)) {
                // it exists. 
                if (fs.lstatSync(target).isDirectory()) {
                    target += '/index.html'
                }
                let contentType = ''
                if (target.includes('.js')) {
                    contentType = 'text/javascript'
                } else if (target.includes('.json')) {
                    contentType = 'application/json'
                } else if (target.includes('.css')) {
                    contentType = 'text/css'
                } else if (target.includes('.html')) {
                    contentType = 'text/html'
                } else if (target.includes('.txt')) {
                    contentType = 'text/plain'
                } else {
                    const extName = path.extname(target)

                    const imageExtensions = ['.png', '.webp', '.avif', '.gif', '.jpg', '.jpeg', '.jiff'];
                    const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv'];
                    const audioExtensions = ['.mp3', '.wav', '.ogg', '.flac', '.aac'];
                    const otherExtensions = ['.pdf', '.doc', '.xls', '.ppt', '.zip', '.rar'];

                    if (imageExtensions.includes(extName)) {
                        contentType = 'image/' + extName.split('.').join('');
                    } else if (videoExtensions.includes(extName)) {
                        contentType = 'video/' + extName.split('.').join('');
                    } else if (audioExtensions.includes(extName)) {
                        contentType = 'audio/' + extName.split('.').join('');
                    } else if (otherExtensions.includes(extName)) {
                        // For regular binary streams, you can use the generic 'application/octet-stream' type.
                        contentType = 'application/octet-stream';
                    }
                    const rs = fs.createReadStream(target)
                    response.writeHead(200, { 'Content-Type': contentType });
                    rs.pipe(response)
                    rs.on('end' , () => {
                        response.end()
                    })

                    return
                }
                try {
                    const fileContent = fs.readFileSync(target, 'utf-8');
                    response.writeHead(200, { 'Content-Type': contentType });
                    response.end(fileContent);
                } catch (e:unknown) {
                    response.writeHead(500, { 'Content-Type': 'text/html' });
                    response.end(fs.readFileSync('yaml-http/errors/500.html', 'utf-8').split('#error#').join((e as Error).toString()));
                }
                
            } else {
                if (fs.existsSync(serverRoot + '404.html')) {
                    response.end(fs.readFileSync(serverRoot + '404.html' , 'utf-8'))
                    return
                }
                else {
                    response.end(fs.readFileSync('yaml-http/errors/404.html' , 'utf-8'))
                    return
                }
            }
        } else {
            throw new Error('Directory root is a file!')
        }
    }
}

const stripRouteFromPath = (route:string, requestUri:string) : string => {
    if (route.includes('*')) {
        route = route.substring(0 , route.indexOf('*') - 1)
    }
    return requestUri.replace(new RegExp(route + '/') , '/')
}