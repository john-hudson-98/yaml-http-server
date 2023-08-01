import { DataSource } from './appstate/data-source'


export class ResourcePool {
    private dataSources: Record<string, DataSource> = {}

    private static self: ResourcePool

    private constructor() {
        ResourcePool.self = this
    }

    public addDataSource(name:string, dataSource: DataSource) : ResourcePool {
        this.dataSources[name] = dataSource
        return this
    }
    public getDataSource(name:string) : DataSource | null {
        return this.dataSources[name]
    }

    public static Get() : ResourcePool {
        return ResourcePool.self ?? new ResourcePool()
    }
}