import { Packet } from '@tsdi/common'
import { Abstract, InvocationContext } from '@tsdi/ioc'


@Abstract()
export abstract class Context extends InvocationContext {

    abstract get packet(): Packet;
    abstract set packet(pkg: Packet);

    abstract get raw(): Buffer;
    abstract set raw(data: Buffer);
}
