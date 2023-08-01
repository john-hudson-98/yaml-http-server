# YAML based HTTP/HTTPS Server
Low code and maintainence is always a benefit, rapidly spin up websites with this simple server software. 

## Application setup
Creating an application is easy, you basically list your applications schema in the `src/application.yaml` as below
```yaml
application:
  controllers:
    - service-1/controllers
    - service-2/controllers
  repositories:
    - service-1/repository
    - service-2/repository
  resources:
    mysql:
      npm-package: mysql
      auth-type: embedded
      host: 127.0.0.1
      user: root
      password: password
      port: 3306
      schema: yaml_http_test
server:
  unsecurePort: 80
  securePort: 443
  ssl: 
    key: ''
    certificate: ''
```

## YAML Based Repositories
```yaml
repository:
    name: TestRepository
    methods:
        tables:
            resource: mysql
            query: SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_CATALOG = :SCHEMA    
```

## Easy Connection to Controllers
```yaml
controller:
  name: TestController
  endpoints:
    home:
      route: / # allows wildcarding and path variables too!
      type: api # api, static and external-api's supported, make micro-services easier!
      action: TestRepository::tables # TestRepository::tables method
      arguments:
        SCHEMA: INFORMATION_SCHEMA # or [$POST.SCHEMA, $GET.SCHEMA, $PATH.SCHEMA], easy customisation
```

## Pre Authorise
I've now added the ability to run a custom typescript handler to authorize a web request.
Simply create the file auth.ts in the location you'd like it.
```typescript
export default async () : Promise<Boolean> => {
    return true
}
```
Then reference it in the controller. 
```yaml
controller:
  name: TestController
  endpoints:
    home:
      preAuthorize: 'test-service/authorisers/auth.ts'
      route: / # allows wildcarding and path variables too!
      type: api # api, static and external-api's supported, make micro-services easier!
      action: TestRepository::tables # TestRepository::tables method
```

## Custom TS handlers
If you want custom logic and don't want to rely on a repository, this can be achieved here.

```yaml
controller:
  name: TestController
  endpoints:
    home:
      route: / # allows wildcarding and path variables too!
      type: api # api, static and external-api's supported, make micro-services easier!
      action: test-service/actions/test-action.ts # path to handler
```
And the test-action.ts file:
```typescript
export default async () : Promise<any> => {
    return '<p>Hello World</p>'
}
```

## React Apps & MicroApps
Use a running webpack server, or a built app. Very simple to setup. 
```yaml
controller:
  name: TestController
  endpoints:
    home:
      route: /webapp/*
      type: spa # for Single Page Application
      directory: test-service/webapp
      fallback: index.html
      spaConfig:
        hasWebpackServer: false # or true, set to true if using create-react-app
        port: 3000 # what port is the server running on
        start-dev: npm start # how do we start the app
        project-directory: null # path to the webpack-server nodejs app.
```


## Upcoming features
 - New Data Sources - Currently only supports mysql, but allows for the creation of custom adapters, pretty easily.
 - Event House Integration - On Controllers and Repositories, allow a preExecute, and postExecute event dispatcher
 - Queueing tool - Allow custom queues to be setup
 - External File Service - Add custom file hosting services with configurability on type and size.

### Contributors
```text
Feel free to contribute to this repository, simply fork it, then create a pull request, I'll be giving credit to all contributors in a CONTRIBUTORS.md file :)
```