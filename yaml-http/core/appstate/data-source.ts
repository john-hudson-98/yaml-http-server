import { MigrationTable } from "../migration"

/**
 * Use this to generalize all database connection adapters, 
 * This will require some setup for custom drivers or 
 * ones not native to the yaml-http codebase
 */
export interface DataSource {
    connect(host:string, user:string, password:string, database:string, port?:number) : Promise<DataSource>
    disconnect() : Promise<DataSource>
    query(query:string, binds:Record<string,any> | undefined) : Promise<Array<Record<string,any>>>
    install(tableName:string, structure:MigrationTable) : Promise<boolean>
}

export type DataSourceResource = {
    name: string,
    connection?: DataSource
}

export type DataSourceCredentials = {
    'auth-type': 'embedded' | 'env'
    host: string
    user?: string
    password?: string
    port?: number
    schema?: string
}