# @tsdi/compiler

TypeScript and component compiler based on workflow activities.

## Features

- 📦 **TypeScript Compilation** - Compile TS files with configurable options
- 🧩 **Component Compilation** - Parse and compile @tsdi/components
- 🧪 **Test Generation** - Auto-generate unit tests from source code
- ⚡ **Workflow Integration** - Built on @tsdi/activities workflow engine
- 📊 **Diagnostic Reporting** - Detailed error/warning reporting
- 🔧 **Configurable Options** - Support for ES5/ES2020, CommonJS/ESM, and more

## Installation

```bash
npm install @tsdi/compiler
```

## Quick Start

### TypeScript Compilation

```typescript
import { CompilerService } from '@tsdi/compiler';

const compiler = new CompilerService();

const result = await compiler.compile('src/**/*.ts', {
    target: 'es2020',
    module: 'commonjs',
    declaration: true,
    sourceMap: true,
    outDir: 'lib'
});

console.log(`Compiled ${result.compileResults?.length} files`);
console.log(`Errors: ${result.totalErrors}, Warnings: ${result.totalWarnings}`);
```

### Component Compilation

```typescript
import { CompilerService } from '@tsdi/compiler';

const compiler = new CompilerService();

const result = await compiler.compileComponents('src/**/*.component.ts', {
    target: 'es2020',
    declaration: true
});

// Access parsed component metadata
result.componentResults?.forEach(comp => {
    console.log(`Component: ${comp.componentInfo?.selector}`);
});
```

### Test Generation

```typescript
import { TestGenerateActivity } from '@tsdi/compiler';

const generator = new TestGenerateActivity();
generator.src = 'src/**/*.ts';
generator.outputDir = 'test';

const result = await generator.execute({});

console.log(`Generated ${result.data?.totalTestCases} test cases`);
```

## CompileActivity

Compile TypeScript files with full compiler options support.

```typescript
import { CompileActivity } from '@tsdi/compiler';

const activity = new CompileActivity();
activity.src = 'src/**/*.ts';
activity.outDir = 'dist';
activity.options = {
    target: 'es2020',
    module: 'commonjs',
    declaration: true,
    sourceMap: true,
    strict: true,
    skipLibCheck: true
};

const result = await activity.execute({});
```

### CompileOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `target` | `'es5' \| 'es2017' \| 'es2020' \| 'esnext'` | `'es2020'` | ECMAScript target version |
| `module` | `'commonjs' \| 'es2015' \| 'es2020' \| 'esnext'` | `'commonjs'` | Module system |
| `declaration` | `boolean` | `true` | Generate `.d.ts` files |
| `sourceMap` | `boolean` | `true` | Generate source maps |
| `outDir` | `string` | `'lib'` | Output directory |
| `rootDir` | `string` | - | Root directory of source files |
| `strict` | `boolean` | `true` | Enable strict mode |
| `skipLibCheck` | `boolean` | `true` | Skip library type checking |
| `esModuleInterop` | `boolean` | `true` | Enable ES module interop |
| `experimentalDecorators` | `boolean` | `true` | Enable experimental decorators |
| `emitDecoratorMetadata` | `boolean` | `true` | Emit decorator metadata |

## ComponentCompileActivity

Parse and compile TypeScript components with decorator support.

```typescript
import { ComponentCompileActivity } from '@tsdi/compiler';

const activity = new ComponentCompileActivity();
activity.src = 'src/**/*.ts';
activity.outDir = 'lib';
activity.viewEncapsulation = 'Emulated';
activity.inlineStyles = false;

const result = await activity.execute({});
```

### ComponentInfo

```typescript
interface ComponentInfo {
    selector: string;
    templateUrl?: string;
    styleUrls?: string[];
    inputs: string[];
    outputs: string[];
    providers: string[];
    declarations: string[];
}
```

## TestGenerateActivity

Automatically generate unit tests from source code.

```typescript
import { TestGenerateActivity } from '@tsdi/compiler';

const activity = new TestGenerateActivity();
activity.src = 'src/**/*.ts';
activity.outputDir = 'test';
activity.exclude = ['node_modules', '**/*.spec.ts'];

const result = await activity.execute({});
```

### Generated Test Structure

```typescript
// Example generated test file
import expect = require('expect');
import { MyService } from '../src/my-service';

describe('MyService', () => {
    it('should create MyService instance', async () => {
        const instance = new MyService();
        expect(instance).toBeDefined();
        expect(instance).toBeInstanceOf(MyService);
    });

    it('should execute MyService.doWork correctly', async () => {
        const instance = new MyService();
        const result = await instance.doWork({});
        expect(result).toBeDefined();
    });
});
```

## CompilerService

High-level service for compilation tasks.

```typescript
import { CompilerService } from '@tsdi/compiler';

const service = new CompilerService();

// Compile TypeScript
const tsResult = await service.compile('src/**/*.ts', options);

// Compile components
const compResult = await service.compileComponents('src/**/*.ts', options);
```

### CompilerResult

```typescript
interface CompilerResult {
    success: boolean;
    compileResults?: CompileResult[];
    componentResults?: ComponentCompileResult[];
    totalErrors: number;
    totalWarnings: number;
    duration: number;
    error?: Error;
}
```

## DiagnosticInfo

```typescript
interface DiagnosticInfo {
    file: string;
    line: number;
    character: number;
    message: string;
    severity: 'error' | 'warning' | 'info';
    code: number;
}
```

## Usage with Workflow

The compiler integrates with `@tsdi/activities` workflow:

```typescript
import { SequenceActivity } from '@tsdi/activities';
import { CompileActivity, TestGenerateActivity } from '@tsdi/compiler';

const workflow = new SequenceActivity();
workflow.activities = [
    Object.assign(new CompileActivity(), {
        src: 'src/**/*.ts',
        outDir: 'lib'
    }),
    Object.assign(new TestGenerateActivity(), {
        src: 'src/**/*.ts',
        outputDir: 'test'
    })
];

await workflow.execute({});
```

## Testing

```bash
cd packages/compiler
npm test
```

## Related Packages

- [@tsdi/activities](https://www.npmjs.com/package/@tsdi/activities) - Workflow engine
- [@tsdi/components](https://www.npmjs.com/package/@tsdi/components) - Component framework
- [@tsdi/ioc](https://www.npmjs.com/package/@tsdi/ioc) - IoC container

## License

MIT © [Houjun](https://github.com/houjun)