import { Controller, Endpoint } from './appstate/controller'
import { Repository, RepositoryInstance } from './appstate/repository'
import { ApplicationConfiguration } from './server'
import yaml from 'yaml'
import fs from 'node:fs'
import { DataSource, DataSourceCredentials, DataSourceResource } from './appstate/data-source'
import { ResourcePool } from './resource-pool'
import { runMigration } from './migration'

export class AppState {
    
    private controllers: Controller[] = new Array<Controller>()

    private repositories: Repository[] = new Array<Repository>()

    public constructor(appContext: ApplicationConfiguration) {
        
        console.log('[LOG] Building app context >>> Controllers')
        appContext.controllers?.forEach((controllerDirectory: string) => {
            if (!fs.existsSync('src/' + controllerDirectory)) {
                console.error('[ERROR] - The controller path you have specified doesn\'t exist')
                return
            }
            fs.readdirSync('src/' + controllerDirectory).forEach((app: string) => {
                const controller:Controller = yaml.parse(fs.readFileSync('src/' + controllerDirectory + '/' + app , 'utf-8')).controller
                this.controllers.push(controller)
            })
        })
        
        console.log('[LOG] Loaded Controllers')
        console.log('[LOG] Building app context >>> Repositories')

        appContext.repositories?.forEach((repositoryDirectory: string) => {
            if (!fs.existsSync('src/' + repositoryDirectory)) {
                console.error('[ERROR] - The repository path you have specified doesn\'t exist')
                return
            }
            fs.readdirSync('src/' + repositoryDirectory).forEach((app: string) => {
                const repository:Repository = yaml.parse(fs.readFileSync('src/' + repositoryDirectory + '/' + app , 'utf-8')).repository
                this.repositories.push(repository)
            })
        })

        console.log('[LOG] Starting Database Connections')

        if (appContext.resources) {
            const dbs = Object.keys(appContext.resources)
            for (let i = 0; i < dbs.length; i++) {
                
                const dbService = dbs[i]

                const conn = this.openDbConnection(dbService, appContext.resources![dbService] as DataSourceCredentials)

                // this already gets stored in the resource pool, all we're doing is checking for a null value
                // to throw out an error
                conn.then((connection:DataSource | null) => {
                    if (!connection) {
                        throw new Error('Cannot connect to the resource ' + dbService + ', returned null?')
                    }

                    if (process.argv.includes('--install')) {
                        console.log('Running installer')
                        runMigration(appContext.migration! , dbService)
                    }
                }).catch((err:unknown) => {
                    console.error(err)
                    throw err;
                })
                
            }
        }

        console.log('[LOG] Finished Database Connections, server ready')
        
    }

    private async openDbConnection(dbService:string, details: DataSourceCredentials) : Promise<DataSource | null>{
        
        return new Promise<DataSource | null>((resolve , reject) => {
            const checkDirectories = ['yaml-http/core/db/' + dbService + '.ts' , 'src/yaml-http/adapters/db/' + dbService + '.ts']
            
            let checked = 0
            let noExist = 0
            
            checkDirectories.some((adapter:string) => {
                checked++
                if (fs.existsSync(adapter)) {
                    // we've found it.
                    import('./../../' + adapter).then((exports) => {
                        const def: DataSource = new exports.default()

                        if (details['auth-type'] === 'embedded') {
                            // this should throw an error when it fails to connect.
                            def.connect(details.host, details.user!, details.password!, details.schema! , details.port!)
                            .then(() => {
                                ResourcePool.Get().addDataSource(dbService, def)
                                resolve(def)
                            })
                            .catch(reject)
                        } else {
                            const {MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB} = process.env // alter this ASAP
                            def.connect(MYSQL_HOST!, MYSQL_USER!, MYSQL_PASSWORD!, MYSQL_DB!)
                            .then(() => {
                                ResourcePool.Get().addDataSource(dbService, def)
                                resolve(def)
                            })
                            .catch(reject)
                        }
                        
                    }).catch(reject)
                } else {
                    noExist++
                }
            })

            setTimeout(() => {
                if (noExist === checkDirectories.length) {
                    reject('No adapter exists for the data-source ' + dbService)
                    return
                }
                if (checked === checkDirectories.length) {
                    reject('Couldn\'t connect to all the data-sources in time')
                    return
                }
            } , 750)
        })
    }
    /**
     * @param {String} url - the URL (usually from the request IncomingMessage) 
     * @return {Endpoint | null} - if found returns an Endpoint, else null
     */
    public getEndpointByUrl(url:string) : Endpoint | null {
        let matchedEndpoint: Endpoint | null = null
        this.controllers.some((controller:Controller) => {
            Object.keys(controller.endpoints).some((endpointName: string) => {
                const endpoint = controller.endpoints[endpointName]
                if (this.isRouteMatch(url , endpoint.route)) {
                    matchedEndpoint = endpoint
                    return true
                }
                if (endpoint.type === 'static' || endpoint.type === 'spa') {
                    if (endpoint.route.includes('*')) {
                        const sub = endpoint.route.substring(0 , endpoint.route.indexOf('*') - 1)

                        if (url.substring(0 , sub.length) == sub) {
                            matchedEndpoint = endpoint
                            return true
                        }
                    }
                }
            })
            return matchedEndpoint
        })
        if (!matchedEndpoint && url !== '/') {
            // attempt to fall back on the homepage
            const fallback = this.getEndpointByUrl('/');
            return fallback
        }
        return matchedEndpoint
    }

    /**
     * @param {String} name 
     * @return {Repository | null} - returns the repository, if found
     */
    public getRepository(name:string) : Repository | null {
        let outRepo: Repository | null = null
        this.repositories.some((repository:Repository) => {
            if (!repository) {
                return false
            }
            if (repository.name === name) {
                if (!repository.instance) {
                    repository.instance = new RepositoryInstance(repository)
                    outRepo = repository
                    return true
                } else {
                    outRepo = repository
                    return true
                }
            }
        })
        return outRepo
    }

    private isRouteMatch(route:string, pattern:string) {

        if (route === pattern) {
            return true
        }

        const routeParts = route.split('/')
        const patternParts = pattern.split('/')
        
        if (routeParts.length !== patternParts.length) {
            return false
        }
        
        for (let i = 0; i < routeParts.length; i++) {
            const routePart = routeParts[i]
            const patternPart = patternParts[i]
        
            if (patternPart === '*') {
                continue // Wildcard matches anything, so move to the next part
            }
        
            if (patternPart.startsWith(':')) {
                // Named parameter, e.g., :id
                // You can handle named parameters as needed, for example, store them in an object for later use
                continue
            }
        
            if (routePart !== patternPart) {
                return false // Part does not match, so the route and pattern don't match
            }
        }
        
        return true // All parts matched, so the route matches the pattern
    }

}