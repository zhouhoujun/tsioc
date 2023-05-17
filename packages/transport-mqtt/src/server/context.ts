import { Incoming, ListenOpts, TransportContext } from '@tsdi/core';


export class MqttContext extends TransportContext {
    get socket(): any {
        throw new Error('Method not implemented.');
    }
    get method(): string {
        throw new Error('Method not implemented.');
    }
    get url(): string {
        throw new Error('Method not implemented.');
    }
    set url(value: string) {
        throw new Error('Method not implemented.');
    }


}

const absurl = /^(mqtt|mqtts|tcp|ssl|ws|wss|wx|wxs|alis):\/\//i;
