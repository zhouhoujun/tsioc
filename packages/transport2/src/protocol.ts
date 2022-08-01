import { Abstract } from '@tsdi/ioc';
import { Protocol } from '@tsdi/core';
import { PacketTransform } from './packet';

/**
 * transport protocol .
 */
@Abstract()
export abstract class TransportProtocol extends Protocol {

    /**
     * get protcol packet transform.
     */
    abstract get transform(): PacketTransform;

}


