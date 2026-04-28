import { Abstract } from '@tsdi/ioc';

/**
 * subscriber.
 * 
 * 发布订阅模式的订阅者。
 */
@Abstract()
export abstract class Subscriber {
    /**
     * subscribe - subscribe to <topic>
     *
     * @param {String, Array, Object} topic - topic(s) to subscribe to, supports objects in the form {'topic': qos}
     * @param {Object} [opts] - optional subscription options, includes:
     * @param  {Number} [opts.qos] - subscribe qos level
     * @param {Function} [callback] - function(err, granted){} where:
     *    {Error} err - subscription error (none at the moment!)
     *    {Array} granted - array of {topic: 't', qos: 0}
     * @returns {MqttClient} this - for chaining
     * @api public
     * @example client.subscribe('topic')
     * @example client.subscribe('topic', {qos: 1})
     * @example client.subscribe({'topic': 0, 'topic2': 1}, console.log)
     * @example client.subscribe('topic', console.log)
     */
    abstract subscribe(...topic: string[]): any;

    /**
     * unsubscribe - unsubscribe from topic(s)
     *
     * @param {String, Array} topic - topics to unsubscribe from
     * @param {Object} opts - opts of unsubscribe
     * @param {Function} [callback] - callback fired on unsuback
     * @returns {MqttClient} this - for chaining
     * @api public
     * @example client.unsubscribe('topic')
     * @example client.unsubscribe('topic', console.log)
     * @example client.unsubscribe('topic', opts, console.log)
     */
    abstract unsubscribe(...topic: string[]): any;
}


export type ClientSubscribeCallback<Grant> = (err: Error, granted: Grant[]) => void;
