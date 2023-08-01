import {execSync} from 'node:child_process'
import fs from 'node:fs'

export class NPM {
    public static install(packageName: string | string[]) {
        if (!Array.isArray(packageName)) {
            // if the package name is a string
            // convert to an array. 
            packageName = [packageName] 
        }

        const output = execSync('npm install ' + packageName.join(' '))

        console.log('[LOG][NPM] Install status: ' + Buffer.from(output.buffer).toString('utf-8'))
    }
    /**
     * @param packageName 
     * @description - Checks if a package exists
     */
    public static has(packageName:string) {
        return fs.existsSync('node_modules/' + packageName)
    }
}