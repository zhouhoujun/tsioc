import { Workflow } from '@tsdi/activities';
import { CompilerModule } from './src';

if (process.cwd() === __dirname) {
    Workflow.run(CompilerModule);
}