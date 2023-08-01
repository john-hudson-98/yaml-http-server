export type SPAConfig = {
    hasWebpackServer: boolean,
    port?: number,
    'start-dev'?: string,
    'project-directory'?: string
}

export type Endpoint = {
    route: string,
    type: 'api' | 'dynamic' | 'static' | 'spa',
    action?: string,
    arguments?: Record<string,string|Array<any>>,
    preAuthorize?: string
    directory?: string,
    spaConfig?: SPAConfig
}

export type Controller = {
    name: string,
    endpoints: Record<string,Endpoint>
}