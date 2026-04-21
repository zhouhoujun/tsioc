/**
 * Class to be extended by all application events. Abstract as it
 * doesn't make sense for generic events to be published directly.
 *
 * 应用程序事件抽象类， 直接发布通用事件没有意义。
 */
export declare abstract class ApplicationEvent {
    private _source;
    private _timestamp;
    private _propagation;
    get propagation(): boolean;
    constructor(_source: Object);
    stopPropagation(): void;
    /**
     * event source target.
     */
    getSource(): Object;
    /**
     * get the time in milliseconds when the event occurred.
     */
    getTimestamp(): number;
    /**
     * run handles strategy, `FIFO` or `FILO`.
     * @returns
     */
    static getStrategy(): 'FIFO' | 'FILO';
}
