import { createDecorator } from '@tsdi/ioc';
import { WorkflowDefinition } from '../Workflow';

export const Workflow = createDecorator<WorkflowDefinition>('Workflow', {
    
}); 