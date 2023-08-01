import fs from 'node:fs'
import yaml from 'yaml'
import { ResourcePool } from './resource-pool'
import { DataSource } from './appstate/data-source'

export type MigrationColumn = {
    type: string,
    null: boolean,
    unique?: boolean,
    'auto-increment'?: boolean
}
export type MigrationTable = {
    resource: string,
    structure: Record<string, MigrationColumn>,
    keys: Record<string,any>
}

export const runMigration = (paths: Array<string> , resourceName: string) => {
    paths.forEach((path:string) => {
        const dir = 'src/' + path
        const yamls = new Array<string>()

        fs.readdirSync(dir).forEach((file:string) => {
            if (file.includes('.yaml')) {
                yamls.push(dir + '/' + file)
            }
        })

        console.log('Installing from ' + yamls.length + ' install files')

        yamls.forEach((file:string) => {
            const tables = yaml.parse(fs.readFileSync(file , 'utf-8')).tables

            Object.keys(tables).forEach((tableName:string) => {
                const table: MigrationTable = tables[tableName]

                if (table.resource !== resourceName) {
                    return
                }

                const resource:DataSource | null = ResourcePool.Get().getDataSource(table.resource)

                if (resource) {
                    resource.install(tableName , table).then((success:boolean) => {
                        // do something here.
                    })
                } else {
                    console.log('Resource not available!')
                }
            })
        })
    })
}