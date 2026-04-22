import { Abstract, Injectable, Token } from "@tsdi/ioc";
import { Observable } from 'rxjs';
import { Transport, TransportConfig } from '@tsdi/common';
import { RequestContext, Incoming, Pattern, StreamAdapter } from '@tsdi/common';

/**
 * Binding target type.
 */
export type BindingTarget = 'input' | 'output';

/**
 * Binding state.
 */
export enum BindingState {
    /**
     * binding is initializing.
     */
    INITIALIZING = 0,
    /**
     * binding is active.
     */
    ACTIVE = 1,
    /**
     * binding is paused.
     */
    PAUSED = 2,
    /**
     * binding is stopped.
     */
    STOPPED = 3
}

/**
 * Binding interface.
 * 
 * Binding 绑定接口
 * 
 * Reference: Spring Cloud Stream Binding
 */
export interface Binding<TTarget = any> {
    /**
     * binding name (destination).
     * 
     * 绑定名称（目标）
     */
    name: string;

    /**
     * binding group (consumer group).
     * 
     * 绑定组（消费组）
     */
    group?: string;

    /**
     * binding target (input/output channel).
     * 
     * 绑定目标（输入/输出通道）
     */
    target: TTarget;

    /**
     * binding state.
     * 
     * 绑定状态
     */
    state: BindingState;

    /**
     * pause binding.
     * 
     * 暂停绑定
     */
    pause(): void;

    /**
     * resume binding.
     * 
     * 恢复绑定
     */
    resume(): void;

    /**
     * unbind (stop and release).
     * 
     * 解绑（停止并释放）
     */
    unbind(): Promise<void>;
}

/**
 * Producer options.
 * 
 * 生产者配置
 */
export interface ProducerOptions {
    /**
     * destination name.
     * 
     * 目标名称
     */
    destination?: string;

    /**
     * content type for serialization.
     * 
     * 内容类型（序列化）
     */
    contentType?: string;

    /**
     * partition key (for Kafka, etc).
     * 
     * 分区键
     */
    partitionKey?: string | number;

    /**
     * headers.
     */
    headers?: Record<string, string | number>;

    /**
     * required groups (for pub/sub).
     * 
     * 必需的消费组
     */
    requiredGroups?: string[];
}

/**
 * Consumer options.
 * 
 * 消费者配置
 */
export interface ConsumerOptions {
    /**
     * group name.
     * 
     * 消费组名称
     */
    group?: string;

    /**
     * destination name.
     * 
     * 目标名称
     */
    destination?: string;

    /**
     * content type for deserialization.
     * 
     * 内容类型（反序列化）
     */
    contentType?: string;

    /**
     * max concurrent consumers.
     * 
     * 最大并发消费者数
     */
    concurrency?: number;

    /**
     * auto commit offset.
     * 
     * 自动提交偏移量
     */
    autoCommit?: boolean;

    /**
     * start from beginning (for Kafka).
     * 
     * 从头开始消费
     */
    startFromBeginning?: boolean;
}

/**
 * Binder interface.
 * 
 * Binder 绑定器接口 - 参考 Spring Cloud Stream Binder SPI
 * 
 * The Binder SPI is the core abstraction that connects application 
 * inputs/outputs to external middleware.
 * 
 * Binder SPI 是核心抽象，连接应用程序的输入/输出到外部中间件。
 */
@Abstract()
export abstract class Binder<
    TConsumerOptions extends ConsumerOptions = ConsumerOptions,
    TProducerOptions extends ProducerOptions = ProducerOptions
> {

    /**
     * binder name (transport type).
     * 
     * 绑定器名称（传输类型）
     */
    abstract get name(): string;

    /**
     * binder transport type.
     * 
     * 绑定器传输类型
     */
    abstract get transport(): Transport;

    /**
     * bind consumer (input channel).
     * 
     * 绑定消费者（输入通道）
     * 
     * @param name binding name/destination
     * @param group consumer group
     * @param options consumer options
     * @returns Binding with incoming channel
     */
    abstract bindConsumer(
        name: string,
        group: string,
        options?: TConsumerOptions
    ): Binding<Observable<Incoming>>;

    /**
     * bind producer (output channel).
     * 
     * 绑定生产者（输出通道）
     * 
     * @param name binding name/destination  
     * @param options producer options
     * @returns Binding with outgoing channel
     */
    abstract bindProducer(
        name: string,
        options?: TProducerOptions
    ): Binding<(data: any) => Promise<void>>;

    /**
     * send request (request/reply pattern).
     * 
     * 发送请求（请求/响应模式）
     * 
     * @param pattern request pattern
     * @param data request data
     * @returns response observable
     */
    abstract send<TInput, TResult>(
        pattern: Pattern,
        data: TInput
    ): Observable<TResult>;

    /**
     * emit event (event pattern, no response expected).
     * 
     * 发送事件（事件模式，不期待响应）
     * 
     * @param pattern event pattern
     * @param data event data
     */
    abstract emit<TInput>(
        pattern: Pattern,
        data: TInput
    ): Promise<void>;

    /**
     * binder configuration.
     */
    config?: BinderConfig;
}

/**
 * Binder configuration.
 * 
 * Binder 配置
 */
export interface BinderConfig extends TransportConfig {
    /**
     * binder instance name.
     * 
     * 绑定器实例名称
     */
    binderName?: string;

    /**
     * connection url.
     * 
     * 连接地址
     */
    url?: string;

    /**
     * default content type.
     * 
     * 默认内容类型
     */
    contentType?: string;

    /**
     * serializer token.
     * 
     * 序列化器 Token
     */
    serializer?: Token<Serializer>;

    /**
     * deserializer token.
     * 
     * 反序列化器 Token
     */
    deserializer?: Token<Deserializer>;

    /**
     * stream adapter.
     * 
     * 流适配器
     */
    streamAdapter?: StreamAdapter;

    /**
     * connection pool size.
     * 
     * 连接池大小
     */
    poolSize?: number;

    /**
     * connection timeout (ms).
     * 
     * 连接超时时间（毫秒）
     */
    timeout?: number;
}

/**
 * Serializer interface.
 * 
 * 序列化器接口 - 参考 Spring Cloud Stream Content-type conversion
 */
@Abstract()
export abstract class Serializer {
    /**
     * serialize data to wire format.
     * 
     * 序列化数据到传输格式
     * 
     * @param data data to serialize
     * @param contentType target content type
     * @returns serialized buffer or string
     */
    abstract serialize<T>(data: T, contentType?: string): Buffer | string | Observable<Buffer> | T;

    /**
     * get supported content types.
     * 
     * 支持的内容类型
     */
    supportedContentTypes?: string[];
}

/**
 * Deserializer interface.
 * 
 * 反序列化器接口
 */
@Abstract()
export abstract class Deserializer {
    /**
     * deserialize wire data to object.
     * 
     * 反序列化传输数据为对象
     * 
     * @param data wire data
     * @param contentType source content type
     * @returns deserialized object
     */
    abstract deserialize<T>(data: Buffer | string, contentType?: string): T;

    /**
     * get supported content types.
     * 
     * 支持的内容类型
     */
    supportedContentTypes?: string[];
}

/**
 * Identity serializer (no transformation).
 * 
 * 身份序列化器（无转换）
 */
@Injectable()
export class IdentitySerializer extends Serializer {
    serialize<T>(data: T, contentType?: string): T {
        return data;
    }
}

/**
 * JSON serializer.
 * 
 * JSON 序列化器
 */
@Injectable()
export class JsonSerializer extends Serializer {
    supportedContentTypes = ['application/json', 'text/json'];

    serialize<T>(data: T): string {
        return JSON.stringify(data);
    }
}

/**
 * JSON deserializer.
 * 
 * JSON 反序列化器
 */
@Injectable()
export class JsonDeserializer extends Deserializer {
    supportedContentTypes = ['application/json', 'text/json'];

    deserialize<T>(data: Buffer | string): T {
        const str = Buffer.isBuffer(data) ? data.toString() : data;
        return JSON.parse(str);
    }
}

/**
 * Binder factory interface.
 * 
 * Binder 工厂接口
 */
@Abstract()
export abstract class BinderFactory {
    /**
     * create binder instance.
     * 
     * 创建绑定器实例
     * 
     * @param config binder configuration
     * @returns binder instance
     */
    abstract create(config: BinderConfig): Binder;
}

/**
 * Binder type registry.
 * 
 * Binder 类型注册表 - 参考 Spring Cloud Stream META-INF/spring.binders
 */
export interface BinderTypeRegistry {
    /**
     * binder type name.
     * 
     * 绑定器类型名称
     */
    name: string;

    /**
     * binder transport.
     * 
     * 绑定器传输类型
     */
    transport: Transport;

    /**
     * binder class type.
     * 
     * 绑定器类类型
     */
    type: Token<Binder>;

    /**
     * binder factory type.
     * 
     * 绑定器工厂类类型
     */
    factory?: Token<BinderFactory>;
}

/**
 * Binding context.
 * 
 * 绑定上下文
 */
export interface BindingContext extends RequestContext {
    /**
     * binding name.
     */
    bindingName: string;

    /**
     * binding target (input/output).
     */
    bindingTarget: BindingTarget;

    /**
     * consumer group.
     */
    group?: string;

    /**
     * content type.
     */
    contentType?: string;

    /**
     * serializer.
     */
    serializer?: Serializer;

    /**
     * deserializer.
     */
    deserializer?: Deserializer;
}