import { Injectable } from '@tsdi/ioc';
import { ConnectionOpts, ev, EventStrategy, ServerConnection } from '@tsdi/transport';


@Injectable()
export class MqttEventStrategy extends EventStrategy {
    bind(connection: ServerConnection, opts: ConnectionOpts): void {

        if (opts.noData !== true) {
            connection.once(ev.DATA, (connPacket) => {
                connection.setOptions(connPacket, opts);
                connection.on(ev.DATA, (packet) => connection.emit(packet.cmd, packet));
                connection.emit(ev.DATA, connPacket);
            })
        }

        // ['connect',
        //     'connack',
        //     'publish',
        //     'puback',
        //     'pubrec',
        //     'pubrel',
        //     'pubcomp',
        //     'subscribe',
        //     'suback',
        //     'unsubscribe',
        //     'unsuback',
        //     'pingreq',
        //     'pingresp',
        //     'disconnect',
        //     'auth'
        // ].forEach(cmd=> {
        //     connecti[cmd] = (opts, cb) => {

        //     }
        // })
    }

}