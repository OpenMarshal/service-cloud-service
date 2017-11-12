import {
    ServiceCloudServicePingResponse,
    ServiceCloudServiceRequest,
    ServiceCloudServiceCall,
    ServiceCloudServicePing,
    ServiceCloudRemoteUrl,
    ServiceCloudRemote,
    ServiceCloudClient,
    parseRemote,
} from 'service-cloud-client'
import { ServiceCloudService } from './ServiceCloudService'
import * as bodyParser from 'body-parser'
import * as express from 'express'
import { Express } from 'express'

export class ServiceCloudServer
{
    protected references : {
        [ serviceName : string ] : {
            [ actionName : string ] : ServiceCloudRemote
        }
    } = {};
    protected app : Express;
    protected resolveGateways : ServiceCloudRemote[];
    public remote : ServiceCloudRemote;

    public addResolveGateway(remote : ServiceCloudRemoteUrl[]) : void
    public addResolveGateway(remote : ServiceCloudRemoteUrl) : void
    public addResolveGateway(remote : ServiceCloudRemoteUrl | ServiceCloudRemoteUrl[]) : void
    {
        if(Array.isArray(remote))
            return (remote as ServiceCloudRemoteUrl[]).forEach((remote) => this.addResolveGateway(remote));
        
        this.resolveGateways.push(parseRemote(remote));
    }

    public constructor(remote : ServiceCloudRemoteUrl)
    {
        this.resolveGateways = [];
        this.remote = parseRemote(remote);

        this.app = express();
        this.app.use(bodyParser.urlencoded({
            extended: true
        }));
        this.app.use(bodyParser.json());

        this.app.post('/', (req, res) => {
            const inputData : ServiceCloudServiceRequest = req.body;

            switch(inputData.type)
            {
                case 'ping':
                    this._ping(inputData as any, (e, result) => this._send(res, e, result));
                    break;
            }
        });
        this.app.listen(this.remote.port);
    }

    public reference(information : {
        serviceName : string
        actionsName : string[]
        remote : ServiceCloudRemoteUrl
    }) : void
    {
        if(!this.references[information.serviceName])
        {
            this.references[information.serviceName] = {};

            this.app.post('/' + information.serviceName, (req, res) => {
                const inputData : ServiceCloudServiceRequest = req.body;
    
                switch(inputData.type)
                {
                    case 'ping':
                        (inputData as ServiceCloudServicePing).serviceName = information.serviceName;
                        this._ping(inputData as ServiceCloudServicePing, (e, result) => this._send(res, e, result));
                        break;
                }
            });
        }
        
        information.actionsName.forEach((actionName) => {
            this.references[information.serviceName][actionName] = parseRemote(information.remote);
        });
    }

    protected _send(res, error, data) : void
    {
        res.json({
            success: !error,
            error: error ? error.message : undefined,
            data
        });
    }

    protected services : {
        [ serviceName : string ] : ServiceCloudService
    } = {};
    
    protected _ping(inputData : ServiceCloudServicePing, callback : (e : Error, result ?: ServiceCloudServicePingResponse) => void) : void
    {
        if(this.services[inputData.serviceName] && (!inputData.actionName || this.services[inputData.serviceName].listeners[inputData.actionName]))
            return callback(undefined, {
                actionName: inputData.actionName,
                serviceName: inputData.serviceName,
                remote: this.remote,
                found: true
            });
        
        if(this.references[inputData.serviceName] && (!inputData.actionName || this.references[inputData.serviceName][inputData.actionName]))
            return callback(undefined, {
                actionName: inputData.actionName,
                serviceName: inputData.serviceName,
                remote: this.references[inputData.serviceName][inputData.actionName]
            });

        if(this.resolveGateways.length > 0)
        {
            let nb = this.resolveGateways.length;
            return this.resolveGateways.forEach((gateway) => {
                ServiceCloudClient.resolve(inputData.serviceName, inputData.actionName, gateway, inputData.ttl, (e, final) => {
                    if(e || nb <= 0)
                    {
                        if(--nb === 0)
                            callback(e);
                        return;
                    }
                    
                    nb = 0;
                    callback(undefined, final);
                });
            });
        }
        
        callback(new Error('Cannot resolve the service / action : ' + inputData.serviceName + ' / ' + inputData.actionName));
    }

    public addService(service : ServiceCloudService) : void
    public addService(service : ServiceCloudService[]) : void
    public addService(service : ServiceCloudService | ServiceCloudService[]) : void
    {
        if(Array.isArray(service))
            return (service as ServiceCloudService[]).forEach((service) => this.addService(service));
        
        this.services[service.serviceName] = service;
        service.server = this;

        this.app.post('/' + service.serviceName, (req, res) => {
            const inputData : ServiceCloudServiceRequest = req.body;

            switch(inputData.type)
            {
                case 'ping':
                    (inputData as ServiceCloudServicePing).serviceName = service.serviceName;
                    this._ping(inputData as ServiceCloudServicePing, (e, result) => this._send(res, e, result));
                    break;
                    
                case 'info':
                    this._send(res, undefined, {
                        actions: Object.keys(service.listeners),
                        remote: service.server.remote
                    });
                    break;
                    
                case 'execute':
                    service.execute(inputData.actionName, inputData as ServiceCloudServiceCall, (e, result) => this._send(res, e, result));
                    break;
            }
        });
    }
}
