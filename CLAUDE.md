# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

tsioc is a comprehensive TypeScript IoC (Inversion of Control) framework that provides dependency injection, aspect-oriented programming (AOP), and a modular application architecture. The framework is organized as a monorepo with multiple packages under `packages/`.

## Core Architecture

### Monorepo Structure

The project is organized into three main categories:

1. **Core Framework Packages** (`packages/`):
   - `ioc`: Core IoC container with dependency injection
   - `aop`: Aspect-oriented programming support
   - `core`: Application framework with module management
   - `boot`: Bootstrap framework with configuration support
   - `common`: Shared utilities and abstractions

2. **Platform Packages**:
   - `platform-server`: Node.js server platform
   - `platform-browser`: Browser platform
   - `endpoints`: HTTP endpoint handling and routing
   - `repository`: Database repository pattern with transaction support
   - `typeorm-adapter`: TypeORM integration

3. **Service Transport Packages** (`packages/services/`):
   - `http`, `amqp`, `coap`, `kafka`, `mqtt`, `nats`, `redis`, `tcp`, `udp`, `ws`
   - Each provides protocol-specific transport implementations

### Key Design Patterns

- **Decorator-based Configuration**: Heavy use of TypeScript decorators (`@Injectable`, `@Module`, `@Controller`, `@Aspect`, etc.)
- **Dependency Injection**: Automatic dependency resolution via constructor injection and property injection
- **AOP Support**: Cross-cutting concerns via aspects with `@Before`, `@After`, `@Around` advice
- **Module System**: Hierarchical module organization with imports/exports
- **Repository Pattern**: Database access with `@Repository` and `@Transactional` decorators

## Build System

### Main Build Commands

```bash
# Build all packages
npm run build

# Build with version setting
npm run build -- --setvs=4.0.0-beta

# Build and deploy to npm
npm run build -- --deploy=true
# or
./deploy.cmd
```

### Package-Level Builds

Each package has its own `taskfile.ts` that defines build configuration. To build a single package:

```bash
cd packages/<package-name>
ts-node -r tsconfig-paths/register taskfile.ts
```

### Build System Architecture

- Uses `@tsdi/activities` workflow framework for build orchestration
- Root `taskfile.ts` coordinates builds across all packages
- Each package's `taskfile.ts` defines:
  - Source/test file patterns
  - Output directory (typically `../../dist/<package-name>`)
  - Bundle configurations (ES5, ES2017, UMD, CommonJS)
  - Annotation processing

## Testing

### Test Framework

Tests use the `expect` assertion library (from Jest/Jasmine style) with Mocha-style `describe`/`it` blocks.

### Running Tests

```bash
# Test using CLI (if @tsdi/cli is installed globally)
tsdi test

# Or use VS Code debug configuration for debugging tests
```

### Test File Locations

- Tests are located in `test/` directories within each package
- Test files use `.spec.ts` extension
- Example: `packages/ioc/test/method.spec.ts`

## Development Workflow

### TypeScript Configuration

- **Target**: ES2020
- **Module**: CommonJS
- **Decorators**: Enabled (`experimentalDecorators`, `emitDecoratorMetadata`)
- **Strict Mode**: Enabled with null checks
- **Path Mapping**: `@tsdi/*` maps to `packages/*` and `packages/services/*`

### Code Style

- ESLint configured with TypeScript support
- Relaxed rules for framework development (allows `any`, empty functions, etc.)
- See `.eslintrc.js` for full configuration

### Key Dependencies

- `reflect-metadata`: Required for decorator metadata
- `typeorm`: Database ORM integration
- `rxjs`: Reactive programming support
- Various transport libraries (amqplib, mqtt, kafkajs, nats, ioredis, ws, etc.)

## Common Patterns

### Creating a Module

```typescript
@Module({
    imports: [OtherModule],
    providers: [ServiceClass],
    exports: [ServiceClass]
})
export class MyModule {}
```

### Dependency Injection

```typescript
@Injectable()
export class MyService {
    constructor(
        private otherService: OtherService,
        @Inject('token') private config: Config
    ) {}
}
```

### Controllers and Endpoints

```typescript
@Controller('/api/users')
export class UserController {
    @Get('/:id')
    getUser(id: string) {
        return this.userService.findById(id);
    }

    @Transactional()
    @Post('/')
    async createUser(user: User) {
        return await this.userRepository.save(user);
    }
}
```

### AOP Aspects

```typescript
@Aspect()
export class LoggingAspect {
    @Around('execution(*.start)')
    logExecution(joinpoint: Joinpoint) {
        console.log('Method starting...');
        return joinpoint.proceed();
    }
}
```

## Important Notes

- All classes using DI must have a class decorator (`@Injectable`, `@Module`, `@Controller`, etc.)
- The framework automatically resolves and injects dependencies
- Transaction management is AOP-based via `@Transactional` decorator
- Each package builds to `dist/<package-name>` with multiple output formats
- The framework supports both server-side (Node.js) and browser environments
