/**
 * protocol types.
 */
export type Protocols = 'tcp' | 'udp' | 'coap' | 'amqp' | 'mqtt' | 'mqtts' | 'kafka' | 'redis' | 'nats' | 'modbus' | 'http' | 'https' | 'grpc' | 'ws' | 'wss';


/**
 * Transport
 */
export enum Transport {
    /**
     * 传输控制协议（TCP，Transmission Control Protocol）是一种面向连接的、可靠的、基于字节流的传输层通信协议，由IETF的RFC 793定义
     */
    TCP = 1,
    /**
     * HTTP is a protocol for fetching resources such as HTML documents. It is the foundation of any data exchange on the Web and it is a client-server protocol, which means requests are initiated by the recipient, usually the Web browser. A complete document is typically constructed from resources such as text content, layout instructions, images, videos, scripts, and more.
     * 
     * HTTP（HyperText Transfer Protocol，超文本传输协议）是互联网上应用最广泛的协议之一，用于在客户端（如浏览器）和服务器之间传输超文本（如网页）。
     * 
     * HTTPS（HyperText Transfer Protocol Secure，安全超文本传输协议）是 HTTP 的安全版本，通过在 HTTP 和传输层之间加入 TLS/SSL 加密层，保护数据传输的安全性和完整性。
     * HTTPS 广泛用于保护敏感信息（如登录凭证、支付信息）的传输。
     */
    HTTP,
    /**
     * gRPC is a high-performance, cross-language RPC framework developed by Google, built on HTTP/2 and typically using Protocol Buffers (Protobuf) for interface definition and serialization. It allows clients to call server methods as if they were local, supporting unary, server streaming, client streaming, and bidirectional streaming communication patterns.
     * 
     * gRPC 是由 Google 开发的一种 RPC 框架，它基于 HTTP/2 协议，支持多语言，并且具有优秀的性能。通过使用 Protocol Buffers 定义接口，gRPC 提供了强大的工具集，使得服务间通信更加高效、可靠。
     * 
     * Protocol Buffers 是一种轻量且高效的序列化数据结构的协议，常用于数据交换和通信协议。通过使用.proto 文件定义消息格式，然后使用 Protocol Buffers 编译器生成相关的代码，开发者可以轻松地在不同语言间传递结构化数据。
     * 
     */
    gRPC,
    /**
     * UDP (User Datagram Protocol) is a lightweight, connectionless transport layer protocol defined in RFC 768. Unlike TCP, it does not guarantee reliability, ordering, or congestion control, but offers low latency and minimal overhead, making it ideal for real-time and broadcast/multicast applications.
     * 
     * 用户数据报协议 (User Datagram Protocol, UDP)是一个简单的面向无连接的，不可靠的数据报的传输层(transport layer)协议，IETF RFC 768是UDP的正式规范。 在TCP/IP模型中，UDP为网络层(network layer)以上和应用层(application layer)以下提供了一个简单的接口。UDP只提供数据的不可靠交付，它一旦把应用程序发给网络层的数据发送出去，就不保留数据备份（所以UDP有时候也被认为是不可靠的数据报协议）。UDP在IP数据报的头部仅仅加入了复用和数据校验（字段）。由于缺乏可靠性，UDP应用一般必须允许一定量的丢包、出错和复制。
     * 
     * https://www.runoob.com/np/udp-protocol.html
     */
    UDP,
    /**
     * 
     * The WebSocket protocol enables ongoing, full-duplex, bidirectional communication between web servers and web clients over an underlying TCP connection.
     * 
     * WebSocket（WS）：基于 TCP 的全双工实时通信协议，通过 HTTP 握手升级协议，实现客户端与服务器双向数据传输，默认端口 80，明文传输。 WebSocket Secure（WSS）：WS 的加密版本，基于 TLS/SSL 加密，默认端口 443，保障数据安全传输。
     * 
     * https://websocket.org/guides/websocket-protocol/
     */
    WS,
    /**
     * The Redis Serialization Protocol (RESP) is the wire protocol used for communication between Redis clients and the Redis server. It is simple, fast, human-readable, and binary-safe, making it easy to implement while maintaining high performance.
     * 
     * Redis客户端使用RESP（Redis的序列化协议）协议与Redis的服务器端进行通信。 虽然该协议是专门为Redis设计的，但是该协议也可以用于其他 客户端-服务器 （Client-Server）软件项目。
     * https://redis.io/docs/latest
     */
    Redis,
    /**
     * NATS is a connective technology powering modern distributed systems, unifying Cloud, On-Premise, Edge, and IoT.
     * 
     * NATS是一种连接技术，为现代分布式系统提供动力。连接技术负责寻址、发现和交换消息，这些消息驱动着分布式系统的常见模式；询问和回答问题，又称服务/微服务，以及创建和处理语句，或流处理。
     * 
     * 
     * https://nats.io/
     */
    NATS,
    /**
     * Message Queuing Telemetry Transport
     * 消息队列遥测传输协议
     * >是一种轻量级、基于发布/订阅模式的消息传输协议，构建于 TCP/IP 之上，专为低带宽、高延迟、不稳定网络设计，广泛应用于物联网（IoT）、M2M通信、消息推送等场景。
     * 
     * https://mqtt.org/
     */
    MQTT,
    /**
     * Kafka uses a binary protocol over TCP. The protocol defines all APIs as request response message pairs. All messages are size delimited and are made up of the following primitive types.
     * https://kafka.apache.org/protocol
     */
    Kafka,
    /**
     * Constrained Application Protocol
     * 受限应用协议 ，是一种专门为物联网（IoT）中的受限设备和网络设计的应用层协议
     * 
     * https://guide.coap.online/
     */
    CoAP,
    /**
     * Advanced Message Queuing Protocol
     * 一个提供统一消息服务的应用层标准高级消息队列协议，是应用层协议的一个开放标准，为面向消息的中间件设计，基于此协议的客户端与消息中间件传递消息，不受客户端/中间件不同产品、不同开发语言等条件的限制。该协议是一种二进制协议，提供客户端应用于消息中间件之间异步、安全、高效的交互。相对于我们常见的REST API，AMQP更容易实现，可以降低开销，同时灵活性高，可以轻松的添加负载平衡和高可用性的功能，并保证消息传递，在性能上AMQP协议也相对更好一些。
     * 
     * https://www.amqp.org/
     */
    AMQP,
    /**
     * MCP (Model Context Protocol) is an open-source standard for connecting AI applications to external systems.
     * 
     * Model Context Protocol，模型上下文协议）定义了应用程序和 AI 模型之间交换上下文信息的方式。这使得开发者能够以一致的方式将各种数据源、工具和功能连接到 AI 模型（一个中间协议层），就像 USB-C 让不同设备能够通过相同的接口连接一样。MCP 的目标是创建一个通用标准，使 AI 应用程序的开发和集成变得更加简单和统一。
     * 
     * 
     * https://modelcontextprotocol.io/docs/getting-started/intro
     */
    MCP
}

export interface TransportConfig {
    /**
     * protocol type
     */
    transport: Transport;
    /**
     * the transport ailas name
     */
    name?: string;
    /**
     * as microservice transport
     */
    microservice?: boolean;
}


export function matchTransport(source: TransportConfig, target: TransportConfig): boolean {
    return source.transport === source.transport
        && (source.name ? source.name === target.name : true)
        && (source.microservice !== undefined ? source.microservice === target.microservice : true)
}