
/**
 * client proxy
 */
export interface Client {
    /**
     * connect server
     */
    connect(): void | Promise<void>;

    /**
     * close client.
     */
    close(): void | Promise<void>;

    /**
     * send message.
     * @param pattern 
     * @param data 
     */
    send<TO = any, TI = any>(pattern: any, data: TI): TO;
    /**
     * emit message
     * @param pattern 
     * @param data 
     */
    emit<TO = any, TI = any>(pattern: any, data: TI): TO;
}