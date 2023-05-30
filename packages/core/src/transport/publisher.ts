import { Abstract } from '@tsdi/ioc';

export type PacketCallback<Packet> = (error?: Error, packet?: Packet) => any

/**
 * publisher
 * 
 * 发布订阅模式的发布者。
 */
@Abstract()
export abstract class Publisher<PublishOptions = any, Packet = any> {
    /**
     * publish - publish <message> to <topic>
     *
     * @param {String} topic - topic to publish to
     * @param {(String|Buffer)} message - message to publish
     *
     * @param {Object}    [opts] - publish options, includes:
     *   @param {Number}  [opts.qos] - qos level to publish on
     *   @param {Boolean} [opts.retain] - whether or not to retain the message
     *   @param {Function}[opts.cbStorePut] - function(){}
     *       called when message is put into `outgoingStore`
     *
     * @param {Function} [callback] - function(err){}
     *    called when publish succeeds or fails
     *
     * @returns {Client} this - for chaining
     * @api public
     *
     * @example client.publish('topic', 'message')
     * @example
     *     client.publish('topic', 'message', {qos: 1, retain: true})
     * @example client.publish('topic', 'message', console.log)
     */
    abstract publish(topic: string, message: string | Buffer, callback?: Function): any

}
