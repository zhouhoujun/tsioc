# @tsdi/activities

A powerful workflow framework for TypeScript applications, built on AOP and IoC container via `@tsdi`. Supports both browser and Node.js environments with visual workflow design capabilities.

## Features

- 🎯 **Declarative Workflow Definition** - Define workflows using decorators and templates
- 🔄 **Rich Activity Library** - 30+ built-in activities for common workflow patterns
- 🎨 **Visual Workflow Engine** - Build and visualize workflows programmatically
- ⚡ **Parallel & Sequential Execution** - Support for both execution modes
- 🔌 **Extensible Architecture** - Easy to create custom activities
- 📦 **IoC Integration** - Full dependency injection support
- 🔐 **Type-Safe** - Full TypeScript support with generics
- ✅ **Well Tested** - 108 unit tests with full coverage

## Installation

```bash
npm install @tsdi/activities
```

### CLI Tools

```bash
npm install -g @tsdi/cli

# Run workflow
tsdi run [taskfile.ts]

# Build
tsdi build [options]
```

## Quick Start

### Basic Activity

```typescript
import { Activity, ActivityContext, ActivityResult } from '@tsdi/activities';
import { Component, Attribute } from '@tsdi/components';

@Component({ selector: 'my-task' })
export class MyTaskActivity extends Activity {
    
    @Attribute()
    message: string = 'Hello World';

    async execute(context: ActivityContext): Promise<ActivityResult> {
        console.log(this.message);
        return {
            success: true,
            data: { message: this.message }
        };
    }
}
```

### Workflow with Visual Builder

```typescript
import { VisualWorkflowBuilder, VisualWorkflowService } from '@tsdi/activities';

const workflow = VisualWorkflowBuilder
    .create()
    .setId('approval-workflow')
    .setName('Document Approval')
    .startNode('Submit')
    .taskNode('Review', { reviewer: 'manager' })
    .conditionNode('Approved?', { field: 'status' })
    .taskNode('Process', { action: 'save' })
    .endNode('Complete')
    .connect('start_0', 'task_1')
    .connect('task_1', 'condition_2')
    .connect('condition_2', 'task_3', { sourcePort: 'true' })
    .connect('task_3', 'end_4')
    .build();

const service = new VisualWorkflowService();
const result = await service.execute(workflow);
```

## Built-in Activities

### Control Flow Activities

| Activity | Selector | Description |
|----------|----------|-------------|
| `SequenceActivity` | `sequence` | Execute activities in sequence |
| `ParallelActivity` | `parallel` | Execute activities in parallel |
| `IfActivity` | `if` | Conditional execution |
| `SwitchActivity` | `switch` | Multi-branch selection |
| `WhileActivity` | `while` | While loop execution |
| `DoWhileActivity` | `do-while` | Do-while loop execution |
| `ForEachActivity` | `foreach` | Iterate over collections |
| `TryCatchActivity` | `trycatch` | Exception handling |
| `ConditionalActivity` | `conditional` | Boolean condition evaluation |

### Data Processing Activities

| Activity | Selector | Description |
|----------|----------|-------------|
| `AssignActivity` | `assign` | Variable assignment with merge/overwrite support |
| `TransformActivity` | `transform` | Data transformation with chain support |
| `MapActivity` | `map` | Array mapping |
| `FilterActivity` | `filter` | Array filtering |
| `ReduceActivity` | `reduce` | Array reduction |
| `MergeActivity` | `merge` | Data merging (object/array/concat) |
| `SplitActivity` | `split` | Data splitting (string/array chunks) |
| `BatchActivity` | `batch` | Batch processing with size control |

### Validation Activities

| Activity | Selector | Description |
|----------|----------|-------------|
| `ValidateActivity` | `validate` | Multi-rule validation with stop-on-first-error |
| `RequiredActivity` | `required` | Required field check |
| `RangeActivity` | `range` | Numeric range validation (min/max) |
| `PatternActivity` | `pattern` | Regex pattern validation |

### Utility Activities

| Activity | Selector | Description |
|----------|----------|-------------|
| `LogActivity` | `log` | Multi-level logging with timestamp |
| `DelayActivity` | `delay` | Timed delay with optional body |
| `TimerActivity` | `timer` | Timer execution (timeout/interval/date) |
| `IntervalActivity` | `interval` | Interval execution with max count |
| `EmitActivity` | `emit` | Event emission to context |
| `WaitActivity` | `wait` | Wait for event with timeout |
| `InvokeActivity` | `invoke` | Method invocation with retry |
| `ThrowActivity` | `throw` | Error throwing with details |

### Lifecycle Activities

| Activity | Selector | Description |
|----------|----------|-------------|
| `StartActivity` | `start` | Workflow start point |
| `EndActivity` | `end` | Workflow end point |
| `ConfirmActivity` | `confirm` | User confirmation dialog |

## Usage Examples

### Sequential Execution

```typescript
import { SequenceActivity } from '@tsdi/activities';

const sequence = new SequenceActivity();
sequence.activities = [
    { execute: async () => console.log('Step 1') } as any,
    { execute: async () => console.log('Step 2') } as any,
    { execute: async () => console.log('Step 3') } as any
];

await sequence.execute({});
```

### Parallel Execution

```typescript
import { ParallelActivity } from '@tsdi/activities';

const parallel = new ParallelActivity();
parallel.activities = [
    { execute: async () => fetchData('api1') } as any,
    { execute: async () => fetchData('api2') } as any,
    { execute: async () => fetchData('api3') } as any
];
parallel.maxConcurrent = 3;
parallel.waitAll = true;

const context = { activities: parallel.activities };
await parallel.execute(context);
```

### Conditional Flow

```typescript
import { IfActivity } from '@tsdi/activities';

const ifActivity = new IfActivity();
ifActivity.condition = true;
ifActivity.thenActivity = { execute: async () => ({ success: true }) } as any;
ifActivity.elseActivity = { execute: async () => ({ success: false }) } as any;

const result = await ifActivity.execute({});
```

### While Loop

```typescript
import { WhileActivity } from '@tsdi/activities';

const whileActivity = new WhileActivity();
let counter = 0;

whileActivity.condition = async () => counter < 5;
whileActivity.body = {
    execute: async () => {
        counter++;
        console.log(`Iteration ${counter}`);
        return { success: true };
    }
} as any;
whileActivity.maxIterations = 10;

await whileActivity.execute({});
```

### Try-Catch Error Handling

```typescript
import { TryCatchActivity } from '@tsdi/activities';

const tryCatch = new TryCatchActivity();
tryCatch.tryActivity = {
    execute: async () => {
        // Risky operation
        return { success: true };
    }
} as any;
tryCatch.catchActivity = {
    execute: async (ctx: any) => {
        console.error('Caught:', ctx.error.message);
        return { success: true };
    }
} as any;
tryCatch.finallyActivity = {
    execute: async () => {
        console.log('Cleanup');
        return { success: true };
    }
} as any;

await tryCatch.execute({});
```

### Data Transformation Pipeline

```typescript
import { SequenceActivity, AssignActivity, ForEachActivity, ValidateActivity } from '@tsdi/activities';

const pipeline = new SequenceActivity();
pipeline.activities = [
    Object.assign(new AssignActivity(), {
        values: { status: 'processing', timestamp: Date.now() }
    }),
    Object.assign(new ForEachActivity(), {
        items: [1, 2, 3, 4, 5],
        parallel: true,
        maxConcurrency: 3,
        body: {
            execute: async (ctx: any) => {
                return { success: true, data: ctx.currentItem * 2 };
            }
        } as any
    }),
    Object.assign(new ValidateActivity(), {
        data: { results: [2, 4, 6, 8, 10] },
        rules: [
            { field: 'results', validator: (v: any[]) => v.length === 5 }
        ]
    })
];

await pipeline.execute({ variables: {} });
```

### Validation

```typescript
import { ValidateActivity } from '@tsdi/activities';

const validator = new ValidateActivity();
validator.data = {
    name: 'John Doe',
    age: 25,
    email: 'john@example.com'
};
validator.rules = [
    { 
        field: 'name', 
        validator: (v: string) => v.length >= 2 ? true : 'Name too short'
    },
    { 
        field: 'age', 
        validator: (v: number) => v >= 18 && v <= 65 ? true : 'Age must be 18-65'
    },
    { 
        field: 'email', 
        validator: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? true : 'Invalid email'
    }
];
validator.stopOnFirstError = false;

const result = await validator.execute({});
if (!result.success) {
    console.log('Validation errors:', result.data?.errors);
}
```

### Batch Processing

```typescript
import { BatchActivity } from '@tsdi/activities';

const batch = new BatchActivity();
batch.items = Array.from({ length: 100 }, (_, i) => ({ id: i, data: `item-${i}` }));
batch.batchSize = 10;
batch.delayBetweenBatches = 100;
batch.continueOnError = true;
batch.body = {
    execute: async (ctx: any) => {
        await processItem(ctx.currentItem);
        return { success: true };
    }
} as any;

const result = await batch.execute({});
console.log(`Processed ${result.data?.processed} items in ${result.data?.batches} batches`);
```

### Logging

```typescript
import { LogActivity } from '@tsdi/activities';

const logger = new LogActivity();
logger.level = 'info';
logger.message = 'Processing completed';
logger.data = { itemCount: 100, duration: 5000 };
logger.includeTimestamp = true;

await logger.execute({});
```

## Visual Workflow Engine

### Creating Workflows Programmatically

```typescript
import { VisualWorkflowBuilder } from '@tsdi/activities';

const workflow = VisualWorkflowBuilder
    .create()
    .setId('data-pipeline')
    .setName('Data Processing Pipeline')
    .setDescription('ETL pipeline for data processing')
    .startNode('Input', { x: 100, y: 100 })
    .taskNode('Extract', { source: 'database' }, { x: 250, y: 100 })
    .taskNode('Transform', { operations: ['clean', 'normalize'] }, { x: 400, y: 100 })
    .taskNode('Load', { target: 'warehouse' }, { x: 550, y: 100 })
    .endNode('Complete', { x: 700, y: 100 })
    .connect('start_0', 'task_1')
    .connect('task_1', 'task_2')
    .connect('task_2', 'task_3')
    .connect('task_3', 'end_4')
    .build();
```

### Workflow Validation

```typescript
import { VisualWorkflowService } from '@tsdi/activities';

const service = new VisualWorkflowService();

// Validate workflow definition
const validation = service.validate(workflow);
if (!validation.valid) {
    console.error('Validation errors:', validation.errors);
}

// Execute workflow
const result = await service.execute(workflow, { inputData: {} });
console.log('Execution result:', result);
```

### Serialization

```typescript
// Serialize to JSON
const json = service.serialize(workflow);

// Deserialize from JSON
const restored = service.deserialize(json);

// Save to file
fs.writeFileSync('workflow.json', json);
```

### Node Types

```typescript
type VisualNodeType = 
    | 'start'      // Start node
    | 'end'        // End node
    | 'task'       // Task node
    | 'condition'  // Condition node
    | 'parallel'   // Parallel node
    | 'sequence'   // Sequence node
    | 'delay'      // Delay node
    | 'loop'       // Loop node
    | 'switch'     // Switch node
    | 'trycatch'   // Exception handling node
    | 'subprocess' // Sub-process node
    | 'custom';    // Custom node
```

## Custom Activity

### Creating Custom Activities

```typescript
import { Activity, ActivityContext, ActivityResult } from '@tsdi/activities';
import { Component, Attribute } from '@tsdi/components';

@Component({ selector: 'email' })
export class EmailActivity extends Activity {
    
    @Attribute()
    to!: string;

    @Attribute()
    subject!: string;

    @Attribute()
    body!: string;

    async execute(context: ActivityContext): Promise<ActivityResult> {
        try {
            await this.sendEmail(this.to, this.subject, this.body);
            return {
                success: true,
                data: { sent: true, to: this.to }
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error
            };
        }
    }

    private async sendEmail(to: string, subject: string, body: string): Promise<void> {
        // Email sending logic
    }

    async compensate(context: ActivityContext): Promise<void> {
        // Compensation logic (rollback)
        console.log('Compensating email sent to:', this.to);
    }
}
```

### Registering Custom Activities

```typescript
import { Module } from '@tsdi/ioc';
import { WorkflowModule } from '@tsdi/activities';
import { EmailActivity } from './email.activity';

@Module({
    imports: [WorkflowModule],
    declarations: [EmailActivity],
    exports: [EmailActivity]
})
export class MyWorkflowModule {}
```

## API Reference

### Activity Base Class

```typescript
abstract class Activity {
    abstract execute(context: ActivityContext): Promise<ActivityResult>;
    compensate?(context: ActivityContext): Promise<void>;
}

interface ActivityContext {
    [key: string]: any;
}

interface ActivityResult<T = any> {
    success: boolean;
    data?: T;
    error?: Error;
}
```

### Visual Workflow Types

```typescript
interface VisualWorkflowDefinition {
    id: string;
    name: string;
    description?: string;
    version?: string;
    nodes: IVisualWorkflowNode[];
    connections: NodeConnection[];
    metadata?: VisualWorkflowMetadata;
}

interface IVisualWorkflowNode {
    id: string;
    name: string;
    type: VisualNodeType;
    position: NodePosition;
    config?: Record<string, any>;
    inputs?: NodePort[];
    outputs?: NodePort[];
    style?: NodeStyle;
}

interface NodeConnection {
    id: string;
    sourceNodeId: string;
    sourcePort: string;
    targetNodeId: string;
    targetPort: string;
    condition?: string | ((context: ActivityContext) => boolean);
}
```

## Testing

The package includes comprehensive unit tests with **108 test cases** covering all activities.

### Test Coverage

| Test Suite | Tests | Coverage |
|------------|-------|----------|
| Core Activities | 51 | Start, End, Sequence, Parallel, If, While, DoWhile, TryCatch, Timer, Interval, Switch |
| Common Activities | 33 | Assign, Log, ForEach, Transform, Map, Filter, Reduce, Validate, Emit, Batch, Merge, Split |
| Visual Workflow | 24 | Builder, Validation, Serialization, Execution, Node Types |

### Running Tests

```bash
# Run all tests
cd packages/activities
npm test

# Run specific test file
npx ts-node -r tsconfig-paths/register -e "
const { runTest } = require('@tsdi/unit');
const { ConsoleReporter } = require('@tsdi/unit-console');
runTest('./test/core-activities.spec.ts', { baseURL: __dirname }, ConsoleReporter);
"
```

## Related Packages

- [@tsdi/ioc](https://www.npmjs.com/package/@tsdi/ioc) - IoC container
- [@tsdi/aop](https://www.npmjs.com/package/@tsdi/aop) - AOP support
- [@tsdi/core](https://www.npmjs.com/package/@tsdi/core) - Application core
- [@tsdi/components](https://www.npmjs.com/package/@tsdi/components) - Component framework
- [@tsdi/boot](https://www.npmjs.com/package/@tsdi/boot) - Bootstrap utilities

## Documentation

- [@tsdi/ioc](https://github.com/zhouhoujun/tsioc/tree/master/packages/ioc)
- [@tsdi/aop](https://github.com/zhouhoujun/tsioc/tree/master/packages/aop)
- [@tsdi/core](https://github.com/zhouhoujun/tsioc/tree/master/packages/core)
- [@tsdi/components](https://github.com/zhouhoujun/tsioc/tree/master/packages/components)

## License

MIT © [Houjun](https://github.com/houjun)