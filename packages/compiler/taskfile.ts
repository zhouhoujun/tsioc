import { Workflow } from '@tsdi/activities';
import { CompilerActivity, CompilerModule } from './src';

if (process.cwd() === __dirname) {
    Workflow.run(CompilerActivity);
}
