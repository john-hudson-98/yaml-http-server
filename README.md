# YAML based HTTP/HTTPS Server
Low code and maintainence is always a benefit, rapidly spin up websites with this simple server software. 

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

## Upcoming features
 - Pre Authorize - Add a custom authorizer to protect your endpoints
 - TS/JS Methods - Add a custom TS/JS function to allow more configurability
 - New Data Sources - Currently only supports mysql, but allows for the creation of custom adapters, pretty easily.
 - Event House Integration - On Controllers and Repositories, allow a preExecute, and postExecute event dispatcher
 - Queueing tool - Allow custom queues to be setup
 - React/SPA Integration - Easy micro-app setup for React/Vue or any other webpack bundled microapps. 
 - Static resources - Serving a website from a directory.
 - External File Service - Add custom file hosting services with configurability on type and size.

### Contributors
```text
Feel free to contribute to this repository, simply fork it, then create a pull request, I'll be giving credit to all contributors in a CONTRIBUTORS.md file :)
```