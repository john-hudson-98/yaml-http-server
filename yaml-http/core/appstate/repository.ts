import { ResourcePool } from "../resource-pool"
import { DataSource } from "./data-source"

export class RepositoryInstance {
    
    private repository: Repository
    
    constructor(repository:Repository) {
        this.repository = repository
    }
    async execute(methodName:string, arglist?: Record<string, string|number>) {

        const method:RepositoryMethod = this.repository.methods[methodName]
        method.name = methodName // use the object key for the name, as this is what it is.

        if (!method) {
            throw new Error('Method ' + methodName + ' not found on repository ' + this.repository.name)
        }

        const resource = this.getResource(method.resource)

        if (!resource) {
            throw new Error('Unknown resource ' + method.resource)
        }

        if (!method.query) {
            throw new Error('Method ' + methodName + ' has no query on repository ' + this.repository.name)
        }
        return await resource.query(method.query , arglist)
    }
    getResource(name:string) : DataSource | null {
        return ResourcePool.Get().getDataSource(name)
    }
}

export type RepositoryEventTrigger = {
    stage: 'before' | 'after',
    eventName: string,
    detail: Record<string,any>,
    from: string
}

export type RepositoryMethod = {
    name: string,
    resource: string,
    arguments?: Record<string, string|number>,
    query?: string
    triggers?: RepositoryEventTrigger[]
}

export type Repository = {
    instance?:RepositoryInstance
    name:string,
    methods: Record<string, RepositoryMethod>
}