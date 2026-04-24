# Protocol Abstraction Refactoring Plan

## Overview

This plan outlines the refactoring of `@packages/common/client` and `@packages/endpoints` to use Strategy Pattern, Abstract Factory, and Template Method patterns for protocol-agnostic abstraction.

## Goals

1. Abstract `provideClient`, `withBodySerialize`, `withClientTimeout` as strategy-based interfaces
2. Abstract `provideService`, `withContent`, `withBodyparser`, `withSession`, `withJson`, `withLogger` as strategy-based interfaces  
3. Design unified `AbstractRequestContext` for response handling
4. Enable protocol-specific implementations via strategy pattern
5. Refactor parameter resolution in routing

## Phase 1: Client Abstraction Layer

### 1.1 New Interfaces (in `packages/common/client/src/strategies/`)

```typescript
// IClientTransportStrategy.ts
export interface IClientTransportStrategy<TRequest, TResponse, TConfig> {
  connect(): Promise<void> | Observable<void>;
  createRequest(pattern: Pattern, options: RequestInitOpts): TRequest;
  initContext(context: RequestContext, req: TRequest): void;
  onShutdown(): Promise<void>;
}

// IBodySerializeStrategy.ts
export interface IBodySerializeStrategy {
  serialize(body: any, context: RequestContext): ArrayBuffer | Buffer | Blob | FormData | string | null;
  detectContentType(body: any): string | null;
}

// ITimeoutStrategy.ts
export interface ITimeoutStrategy {
  getTimeout(): number;
  handleTimeout(error: Error, context: RequestContext): Error;
}
```

### 1.2 Refactored AbstractClient (Template Method)

```typescript
// AbstractClient.ts (modified)
@Abstract()
export abstract class AbstractClient<TRequest, TResponse, TOptions> {
  protected abstract get transportStrategy(): IClientTransportStrategy<TRequest, TResponse, TOptions>;
  protected abstract get bodySerializeStrategy(): IBodySerializeStrategy;
  protected abstract get timeoutStrategy(): ITimeoutStrategy;
  
  // Template method - common flow, delegates to strategies
  protected request(pattern: Pattern, options: TOptions): Observable<any> {
    // Uses strategies for: connect, createRequest, serializeBody, timeout
  }
}
```

### 1.3 Protocol-specific Strategy Implementations (in `packages/services/*/src/client/strategies/`)

Each protocol will implement:
- `HttpTransportStrategy implements IClientTransportStrategy`
- `TcpTransportStrategy implements IClientTransportStrategy`
- `WsTransportStrategy implements IClientTransportStrategy`
- etc.

## Phase 2: Server/Endpoint Abstraction Layer

### 2.1 New Interfaces (in `packages/endpoints/src/strategies/`)

```typescript
// IServiceTransportStrategy.ts
export interface IServiceTransportStrategy<TContext, TConfig> {
  createTransport(injector: Injector, server: any, config: TConfig): ServerTransport;
  bindHandler(handler: ServiceHandler, transport: ServerTransport): void;
}

// IContentStrategy.ts
export interface IContentStrategy {
  sendStatic(context: AbstractRequestContext, path: string, options: ContentOptions): Promise<void>;
}

// IBodyparserStrategy.ts
export interface IBodyparserStrategy {
  parse(input: Incoming, context: RequestContext): Promise<{ raw?: any, body?: any }>;
}

// ISessionStrategy.ts
export interface ISessionStrategy {
  load(session: Session): Promise<void>;
  commit(session: Session): Promise<void>;
}

// IJsonStrategy.ts  
export interface IJsonStrategy {
  stringifyResponse(data: any, context: RequestContext): string | Stream;
}

// ILoggerStrategy.ts
export interface ILoggerStrategy {
  logRequest(request: Incoming, context: RequestContext): void;
  logResponse(response: Outgoing, context: RequestContext): void;
}
```

### 2.2 Refactored AbstractRequestContext (Template Method)

```typescript
// AbstractRequestContext.ts (enhanced)
@Abstract()
export abstract class AbstractRequestContext<TRequest, TResponse, TStatus> {
  // Strategy accessors
  get contentStrategy(): IContentStrategy { return this.get(IContentStrategy); }
  get bodyparserStrategy(): IBodyparserStrategy { return this.get(IBodyparserStrategy); }
  get sessionStrategy(): ISessionStrategy { return this.get(ISessionStrategy); }
  get jsonStrategy(): IJsonStrategy { return this.get(IJsonStrategy); }
  get loggerStrategy(): ILoggerStrategy { return this.get(ILoggerStrategy); }
  
  // Template method for response handling
  set body(val: any) {
    // Uses strategies for content negotiation, serialization
  }
  
  // Unified response operations
  abstract throwException(exception: MessageException): void;
}
```

### 2.3 Protocol-specific RequestContext Implementations

- `HttpRequestContext extends AbstractRequestContext` (for HTTP/HTTPS)
- `TcpRequestContext extends AbstractRequestContext` (for TCP)
- `WsRequestContext extends AbstractRequestContext` (for WebSocket)
- `CoapRequestContext extends AbstractRequestContext` (for CoAP)
- `AmqpRequestContext extends AbstractRequestContext` (for AMQP)
- etc.

## Phase 3: Parameter Resolution Refactoring

### 3.1 Parameter Resolver Strategy

```typescript
// packages/endpoints/src/resolvers/IParameterResolver.ts
export interface IParameterResolver {
  resolveBody(context: AbstractRequestContext): any;
  resolveHeader(context: AbstractRequestContext, field: string): string | undefined;
  resolveQuery(context: AbstractRequestContext, key: string): string | string[] | undefined;
  resolveParams(context: AbstractRequestContext, key: string): string | undefined;
}

// Protocol-specific resolvers:
// HttpParameterResolver - uses request.body, request.headers, URL query
// TcpParameterResolver - uses pattern matching, payload
// WsParameterResolver - uses message parsing
// AmqpParameterResolver - uses message headers, payload
```

## Phase 4: Factory Pattern Integration

### 4.1 Abstract Factory for Protocol Components

```typescript
// packages/common/protocol-factory/src/IProtocolFactory.ts
export interface IProtocolFactory {
  createClientStrategy(): IClientTransportStrategy;
  createServerStrategy(): IServiceTransportStrategy;
  createRequestContext(request: any, response: any): AbstractRequestContext;
  createParameterResolver(): IParameterResolver;
}

// Concrete factories:
// HttpProtocolFactory implements IProtocolFactory
// TcpProtocolFactory implements IProtocolFactory
// WsProtocolFactory implements IProtocolFactory
// AmqpProtocolFactory implements IProtocolFactory
// etc.
```

## Phase 5: Provider Integration

### 5.1 Refactored provideClient

```typescript
// provider.ts (modified)
export function provideClient(
  transport: TransportProtocol,
  options?: ClientFeatureOptions
): Provider[] {
  // Uses protocol factory to get strategies
  // Wires strategies via DI tokens
}
```

### 5.2 Refactored provideService  

```typescript
// provider.ts (modified)
export function provideService(
  transport: TransportProtocol,
  options?: FeatureOptions
): Provider[] {
  // Uses protocol factory to get strategies
  // Wires strategies via DI tokens
}
```

## Implementation Order

1. **Week 1:** Create strategy interfaces in common/client and endpoints
2. **Week 2:** Refactor AbstractClient and AbstractRequestContext with strategy hooks
3. **Week 3:** Implement HTTP strategies as pilot
4. **Week 4:** Implement TCP, WS strategies
5. **Week 5:** Implement remaining protocols (AMQP, MQTT, Kafka, NATS, Redis, CoAP)
6. **Week 6:** Refactor parameter resolution
7. **Week 7:** Update all tests
8. **Week 8:** Final verification and cleanup

## Files to Create/Modify

### New Files:
- `packages/common/client/src/strategies/IClientTransportStrategy.ts`
- `packages/common/client/src/strategies/IBodySerializeStrategy.ts`
- `packages/common/client/src/strategies/ITimeoutStrategy.ts`
- `packages/endpoints/src/strategies/IServiceTransportStrategy.ts`
- `packages/endpoints/src/strategies/IContentStrategy.ts`
- `packages/endpoints/src/strategies/IBodyparserStrategy.ts`
- `packages/endpoints/src/strategies/ISessionStrategy.ts`
- `packages/endpoints/src/strategies/IJsonStrategy.ts`
- `packages/endpoints/src/strategies/ILoggerStrategy.ts`
- `packages/endpoints/src/resolvers/IParameterResolver.ts`
- Protocol factory files in each service package

### Modified Files:
- `packages/common/client/src/AbstractClient.ts` - add strategy hooks
- `packages/common/client/src/provider.ts` - integrate strategies
- `packages/endpoints/src/AbstractRequestContext.ts` - add strategy hooks
- `packages/endpoints/src/provider.ts` - integrate strategies
- Each protocol client/server in `packages/services/*/src/client/client.ts` and `server/server.ts`

## Testing Strategy

1. Unit tests for each strategy interface
2. Integration tests for protocol factory
3. E2E tests for each protocol
4. Verify existing tests pass after refactoring

## Risks and Mitigation

- **Risk:** Breaking existing protocol implementations
  - **Mitigation:** Implement incrementally, one protocol at a time, starting with HTTP
  
- **Risk:** Performance impact from abstraction layers
  - **Mitigation:** Strategy implementations are thin wrappers, minimal overhead
  
- **Risk:** Complex DI wiring
  - **Mitigation:** Use existing token patterns, clear documentation

## Success Criteria

1. All 6 requirements met
2. All existing tests pass
3. New protocol can be added by implementing 4 interfaces
4. Code is more maintainable and extensible