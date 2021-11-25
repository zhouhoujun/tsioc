
export type HeadersOption = string[][] | Record<string, string | string[] | number> | string;

export type ProtocolType = 'http://' | 'https://'| 'mqtt://' | 'amqp://' | 'coap://'
     | 'tcp://' | 'udp://' | 'ftp://' | 'smtp://' | 'telnet://' | 'dns://' | 'msg://';
