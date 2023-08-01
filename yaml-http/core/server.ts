import http, {Server as HttpServer, IncomingMessage, ServerResponse} from 'node:http'
import https, {Server as HttpsServer} from 'node:https'
import { NPM } from './npm'
import { AppState } from './appstate'
import { Endpoint } from './appstate/controller'
import fs from 'node:fs'
import { Repository } from './appstate/repository'
import { DataSourceResource } from './appstate/data-source'

export type ApplicationConfiguration = {
    controllers?: string[],
    repositories?: string[],
    resources?: Record<string, any>
}

export class Server {
    
    static UNSECURE_PORT:number = 80
    static SECURE_PORT  :number = 443

    private http:HttpServer
    private https:HttpsServer

    private appContext: ApplicationConfiguration
    private appState: AppState

    constructor(appContext: ApplicationConfiguration) {
        
        // register app context
        this.appContext = appContext

        this.setupAppIfNecessary()

        // create the app state, there's no point
        // re reading the entire project each request
        // load it once, hold in memory.
        this.appState = new AppState(this.appContext)

        // create a http server
        this.http = http.createServer((request:IncomingMessage, response:ServerResponse) => {
            try {
                this.funnelRequest(request, response)
            } catch(error:Error | unknown) {
                response.end(
                    fs.readFileSync(
                        'yaml-http/errors/500.html' , 
                        'utf-8'
                    ).split('#error#')
                     .join(
                        (error as Error).message + 
                        '<br>' + 
                        JSON.stringify(
                            (error as Error).stack
                                            ?.split('\n')
                                             .join('<br>')
                        )
                    )
                )
            }
        }).listen(Server.UNSECURE_PORT)

        // create a https server
        this.https = https.createServer((request:IncomingMessage, response:ServerResponse) => {
            try {
                this.funnelRequest(request, response)
            } catch(error:Error | unknown) {
                response.end(
                    fs.readFileSync(
                        'yaml-http/errors/500.html' , 
                        'utf-8'
                    ).split('#error#')
                     .join(
                        (error as Error).message + 
                        '<br>' + 
                        JSON.stringify(
                            (error as Error).stack
                                            ?.split('\n')
                                             .join('<br>')
                        )
                    )
                )
            }
        }).listen(Server.SECURE_PORT)

    }

    /**
     * @description - runs all the essential npm installs and execs
     */
    private setupAppIfNecessary() {
        if (this.appContext.resources) {
            Object.keys(this.appContext.resources).forEach((resourceName:string) => {
                // we know this exists or this would skip above
                const resource = (this.appContext.resources as any)[resourceName]
    
                if (resource['npm-package']) {
                    if (!NPM.has(resource['npm-package'])) {
                        console.log('Installing package: ' + resource['npm-package'])
                        NPM.install(resource['npm-package'])
                    } else {
                        console.log('Already has package ' + resource['npm-package'])
                    }
                }
            })   
        }

    }

    /**
     * @param request {IncomingMessage}
     * @param response {ServerResponse}
     * @description - This funnels the requests into a single path, this allows for POST/PUT/PATCH
     *              - to finish sending before a request is handled. 
     */
    private funnelRequest(request:IncomingMessage, response:ServerResponse) {
        switch(request.method) {
            case "POST":
            case "PUT":
            case "PATCH":
                let data = ''
                request.on('data' , (chunk) => {

                    // 5mb limit, no more data
                    if (data.length > (1024 * 1024 * 1024 * 5)) {
                        response.end('Exceeded 10MB limit')
                        return
                    }
                    data += chunk
                })
                request.on('end' , () => {
                    if (data.length > (1024 * 1024 * 1024 * 5)) {
                        // do not process further
                        return
                    }
                    if (request.headers['content-type'] === 'application/json') {
                        data = JSON.parse(data)
                        this.processRequest(request, response, data)
                    }
                })
            break    
            default:
                this.processRequest(request, response, '')
        }
    }
    
    /**
     * @param request {IncomingMessage}
     * @param response {ServerResponse}
     * @param data {string|object|Array|number} the data sent to the server from the client
     */
    private async processRequest(request:IncomingMessage, response:ServerResponse, data:string|object|Array<any>|number) {
        const endpoint:Endpoint | null = this.appState.getEndpointByUrl(request.url?.split('?')[0]!)
        
        if (!endpoint) {
            response.end(fs.readFileSync('yaml-http/errors/404.html' , 'utf-8'))
            return
        }
        if (!endpoint.action) {
            response.end(fs.readFileSync('yaml-http/errors/404.html' , 'utf-8'))
            return
        }
        if (endpoint.preAuthorize && typeof endpoint.preAuthorize === 'string') {
            // will be adding cookie & session soon!

            const imp = (await import('./../../src/' + endpoint.preAuthorize)).default;

            const isAuthorized = await imp({
                request,
                data,
            });
            if (!isAuthorized) {
                switch(endpoint.type){
                    case 'api':
                        response.writeHead(404 , {
                            'Content-Type': 'text/html'
                        })
                        response.end(JSON.stringify({ error: 'Not authorised' }));
                    break;
                    case 'dynamic':
                    case 'static':
                        response.writeHead(404 , {
                            'Content-Type': 'application/json'
                        })
                        response.end(fs.readFileSync('yaml-http/errors/404.html' , 'utf-8'))
                    break;
                }
                return
            }
        }
        switch(endpoint.type) {
            case 'api':
                if (endpoint.action.includes('::')) {
                    // probably a repository
                    const [repository, method] = endpoint.action.split('::')

                    const repo:Repository | null = this.appState.getRepository(repository)

                    if (!repo) {
                        this.error(response, 'Couldn\'t find the repository: ' + repository)
                        return
                    }

                    if (!repo.instance) {
                        this.error(response, 'The instance for the repository ' + repository + ' hasn\'t been created, this is an error')
                        return
                    }

                    let results
                    // any for now, reemove this.
                    if (endpoint.arguments) {
                        // we know the arguments exist, otherwise this if statement would never
                        // be reached
                        results = await repo.instance.execute(method, endpoint.arguments as Record<string,string | number>)
                    } else {
                        results = await repo.instance.execute(method, {})
                    }

                    response.setHeader('Content-Type' , 'application/json')
                    response.end(JSON.stringify(results))
                    return

                } else {
                    // more than likely a script

                    try{
                        const handle = (await import('./../../src/' + endpoint.action)).default

                        const resp = await handle();

                        response.end(resp);
                    } catch(e:unknown) {
                        console.log("Cannot import " + endpoint.action)
                        this.error(response, 'Cannot import ' + endpoint)
                    }
                    return
                }
            break
        }
        response.end(JSON.stringify({ error: 'Cannot handle the request' }))
    }
    error(response:ServerResponse, error:string) {
        response.end(fs.readFileSync('yaml-http/errors/500.html' , 'utf-8').split('#error#').join(error))
    }
}