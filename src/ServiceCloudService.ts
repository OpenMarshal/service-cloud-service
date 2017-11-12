import { ServiceCloudServiceCall, ServiceCloudServicePingResponse, ServiceCloudClient } from 'service-cloud-client'
import { ServiceCloudServer } from './ServiceCloudServer'

export type ServiceCloudServiceListener = (data : any, callback : (e : Error, result : any) => void) => void;

export class ServiceCloudService
{
    public listeners : {
        [ actionName : string ] : ServiceCloudServiceListener
    };
    public server : ServiceCloudServer;

    public constructor(public serviceName : string)
    {
        this.listeners = {};
    }

    public call<I, O>(service : string, action : string, data : I, callback : (e : Error, result : O) => void) : void
    public call(service : string, action : string, data : any, callback : (e : Error, result : any) => void) : void
    public call(service : string, action : string, data : any, callback : (e : Error, result : any) => void) : void
    {
        ServiceCloudClient.call(service, action, this.server.remote, data, callback);
    }
    
    public addAction(actionName : string, listener : ServiceCloudServiceListener) : void
    {
        this.listeners[actionName] = listener;
    }
    
    protected _execute(actionName : string, inputData : ServiceCloudServiceCall, callback : (e : Error, result ?: ServiceCloudServicePingResponse) => void) : void
    {
        this.listeners[actionName].bind(this)(inputData.data, callback);
    }
    public execute(actionName : string, inputData : ServiceCloudServiceCall, callback : (e : Error, result ?: ServiceCloudServicePingResponse) => void) : void
    {
        this._execute(actionName, inputData, callback);
    }
}
