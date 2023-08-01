export type Endpoint = {
    route: string,
    type: 'api' | 'dynamic' | 'static',
    action?: string,
    arguments?: Record<string,string|Array<any>>,
    preAuthorize?: string
    directory?: string
}

export type Controller = {
    name: string,
    endpoints: Record<string,Endpoint>
}