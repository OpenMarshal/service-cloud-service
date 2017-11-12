# Service Cloud - Server / Service

Allows to create a cloud of services.

## Usage

Let's say we want to create a serivce called `hello-world` and this service has an action called `say` which produces a message with the sentence `Hello World!` depending on the language given in the options of the action.

```javascript
const service = require('service-cloud-service');

const server = new service.ServiceCloudServer({
    address: 'localhost',
    port: 1900
});

const service = new service.ServiceCloudService('hello-world');
serviceHelloWorld.addAction('say', function(data, callback) {
    const messages = {
        'en': 'Hello World!',
        'fr': 'Bonjour le Monde!',
        'es': 'Hola el Mundo!'
    };

    callback(undefined, {
        message: messages[data.language]
    });
});
server.addService(serviceHelloWorld);
```

## Add other services to the same server

```javascript
const server = new service.ServiceCloudServer({
    address: 'localhost',
    port: 1900
});

server.addService(service1);
server.addService(service2);
server.addService([ service4, service5 /* [...] */ ]);
```

## Link servers together to create the cloud (network of servers)

If the server cannot find the requested service, it can ask to its gateways. If the gateway has gateways, it can ask to them too, leading to a network of services.

```javascript
const server = new service.ServiceCloudServer({
    address: 'localhost',
    port: 1900
});

server.addResolveGateway('http://localhost:1818');
server.addResolveGateway([ 'http://localhost:1818', 'http://localhost:1819' /* [...] */ ]);
server.addResolveGateway({
    address: 'localhost',
    port: 2000,
    path: '/my/root/path',
    protocol: 'https:'
});
server.addResolveGateway([{
    address: 'localhost',
    port: 2000,
    path: '/my/root/path',
    protocol: 'https:'
}, {
    address: 'localhost',
    port: 2005,
    path: '/my/root/path',
    protocol: 'https:'
} /* [...] */ );
```

## Link a specific service to a server

```javascript
server.reference({
    serviceName: 'my-service-name'
    actionsName: [
        'action1',
        'action2',
        'action3'
    ],
    remote: 'http://localhost:1600'
});
```
