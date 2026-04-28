# @tsdi/microservice

`@tsdi/microservice` is microservice framework for TypeScript IoC applications.

## Features

- **Message Pattern Decorators**: `@MessagePattern`, `@EventPattern` for handler registration
- **Client Proxy**: `MicroserviceClientProxy` with lazy connection and Circuit Breaker support
- **Service Discovery**: `DiscoveryClient` interface for service registration and discovery
- **Circuit Breaker**: Full state machine implementation (CLOSED → OPEN → HALF_OPEN)
- **Context**: `MicroserviceContext` extending `RequestContext` with pattern metadata

## Install

```bash
npm install @tsdi/microservice
```

## Usage

### Define Microservice Controller

```typescript
import { MicroserviceController, MessagePattern, EventPattern } from '@tsdi/microservice';
import { Injectable } from '@tsdi/ioc';

@MicroserviceController()
@Injectable()
export class UserController {
    
    @MessagePattern({ cmd: 'get_user' })
    getUser(id: string) {
        return this.userService.findById(id);
    }
    
    @EventPattern({ topic: 'user_created' })
    handleUserCreated(user: User) {
        this.emailService.sendWelcome(user.email);
    }
}
```

### Client Proxy

```typescript
import { MicroserviceClientProxy, createCircuitBreaker } from '@tsdi/microservice';

const circuitBreaker = createCircuitBreaker({
    failureRateThreshold: 50,
    minimumNumberOfCalls: 10,
    waitDurationInOpenState: 10000
});

// Client usage (configured by transport layer)
const client = new DefaultMicroserviceClientProxy({
    circuitBreaker
});

// Request-response pattern
const result = await client.send({ cmd: 'get_user' }, { id: '123' }).toPromise();

// Event pattern (fire-and-forget)
await client.emit({ topic: 'user_created' }, { name: 'John' });
```

### Circuit Breaker

```typescript
import { CircuitBreaker, CircuitState } from '@tsdi/microservice';

const breaker = new CircuitBreaker({
    failureRateThreshold: 50,      // 50% failures triggers OPEN
    minimumNumberOfCalls: 10,      // Need 10 calls before calculating rate
    waitDurationInOpenState: 10000 // Wait 10s before HALF_OPEN
});

// Check state
console.log(breaker.getState()); // 'CLOSED', 'OPEN', 'HALF_OPEN'

// Get metrics
const metrics = breaker.getMetrics();
console.log(metrics.failureRate, metrics.numberOfCalls);
```

### Service Discovery

```typescript
import { DiscoveryClient, ServiceInstance, createServiceInstance } from '@tsdi/microservice';

// Create service instance
const instance = createServiceInstance('user-service', '192.168.1.10', 8080);

// DiscoveryClient interface (implementation provided by transport)
const discovery: DiscoveryClient = injector.get(DiscoveryClient);
const instances = await discovery.getInstances('user-service');
```

## Exports

| Export | Description |
|--------|-------------|
| `@MessagePattern` | Handler decorator for request/response patterns |
| `@EventPattern` | Handler decorator for event patterns |
| `@MicroserviceController` | Class decorator for microservice controllers |
| `MicroserviceClientProxy` | Abstract client proxy with send/emit |
| `CircuitBreaker` | Resilience pattern implementation |
| `DiscoveryClient` | Service discovery interface |
| `MicroserviceContext` | Extended RequestContext |
| `MicroserviceException` | Base exception class |

## Dependencies

- `@tsdi/ioc` - IoC container and decorators
- `@tsdi/core` - Application lifecycle and handler chain
- `@tsdi/common` - Request/Response abstractions
- `@tsdi/endpoints` - Routing and handler infrastructure
- `rxjs` - Observable streams

## License

MIT © [houjun](https://github.com/zhouhoujun/)