import { DataSource } from '../appstate/data-source'
import mysql, {Connection} from 'mysql'

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
    query(query: string , binds: Record<string, any> | undefined = {}): Promise<Record<string, any>[]> {
        return new Promise<Record<string, any>[]>((resolve , reject) => {
            Object.keys(binds).forEach((key:string) => {
                query = query.split(':' + key).join(`'${binds[key].split("'").join("\\'")}'`)
            })

            console.log(query)
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