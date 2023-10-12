/**
 * http request method.
 */
export type HttpRequestMethod = 'HEAD' | 'OPTIONS' | 'GET' | 'DELETE' | 'PATCH' | 'POST' | 'PUT' | 'JSONP' | 'TRACE';
/**
 * grpc request method.
 */
export type GrpcRequestMethod = 'NO_STREAM' | 'RX_STREAM' | 'PT_STREAM' | 'METHOD';

/**
 * request method.
 */
export type RequestMethod = HttpRequestMethod | GrpcRequestMethod | 'EVENT' | 'MESSAGE';// event

/**
 * transport types.
 */
export type Transport = 'tcp' | 'udp' | 'coap' | 'amqp' | 'mqtt' | 'kafka' | 'redis' | 'nats' | 'grpc' | 'modbus' | 'ws';

export type HybirdTransport = 'http' | 'grpc' | 'tcp' | 'coap';

