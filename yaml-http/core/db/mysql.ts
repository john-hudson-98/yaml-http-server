import { DataSource } from '../appstate/data-source'
import mysql, {Connection} from 'mysql'
import { MigrationColumn, MigrationTable } from '../migration'
import { ResourcePool } from '../resource-pool'

export default class Mysql implements DataSource {
    
    private db:Connection | null = null
    
    connect(host: string, user: string, password: string, database: string, port?:number): Promise<DataSource> {
        return new Promise((resolve , reject) => {
            try{
                this.db = mysql.createConnection({
                    host, 
                    user, 
                    password: password === null ? '' : password, 
                    port
                })
                if (this.db === null) {
                    reject('Database is null')
                    return
                }
                this.db.query('CREATE DATABASE IF NOT EXISTS ' + database , (err , result) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    
                    // again, we know this isn't null!

                    this.db!.changeUser({
                        database
                    } , (err) => {
                        if (err) {
                            reject(err)
                            return
                        }
                        resolve(this)
                    })
                })

                
            } catch(e:unknown) {
                reject(e as Error)
            }
            
        })
    }
    disconnect(): Promise<DataSource> {
        return new Promise((resolve) => {
            this.db!.end()
            resolve(this)
        })
    }
    install(tableName:string, structure: MigrationTable): Promise<boolean> {
        let query = `CREATE TABLE IF NOT EXISTS ${tableName} (`

        Object.keys(structure.structure).forEach((columnName:string, idx:number) => {
            const column:MigrationColumn = structure.structure[columnName]

            query += idx > 0 ? ', ' : ''
            query += `${columnName} ${column.type} ${column.null ? 'NULL' : 'NOT NULL'} ${column['auto-increment'] ? 'AUTO_INCREMENT' : ''} ${column.unique ? 'UNIQUE' : ''}`
        })
        if (structure.keys) {
            if (structure.keys.primary) {
                query += ', PRIMARY KEY (' + structure.keys.primary + ')'
            }
            if (structure.keys.unique) {
                Object.keys(structure.keys.unique).forEach((keyName:string) => {
                    query += ', UNIQUE ' + keyName + ' (' + structure.keys.unique.join(', ') + ')'
                })
            }
        }
        query += ')'

        return new Promise<boolean>((resolve) => {
            this.query(query).then(() => {
                console.log('[SUCCESS][MYSQL::INSTALL] ' + tableName)
                resolve(true)
            }).catch((err) => {
                console.error('[ERROR][MYSQL::INSTALL] ' + err)
                resolve(false)
            })
        })
    }
    query(query: string , binds: Record<string, any> | undefined = {}): Promise<Record<string, any>[]> {
        return new Promise<Record<string, any>[]>((resolve , reject) => {
            Object.keys(binds).forEach((key:string) => {
                query = query.split(':' + key).join(`'${binds[key].split("'").join("\\'")}'`)
            })
            this.db?.query(query , (error , results) => {
                if (error) {
                    reject(error)
                    return
                }
                resolve(results)
            })
        })
    }

}