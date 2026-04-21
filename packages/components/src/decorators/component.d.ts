import { ComponentDef } from '../refs/component';
export declare const COMPONENTS: import("@tsdi/ioc").InjectToken<ComponentDef<any>[]>;
export type ComponentDecorator = (options: Partial<ComponentDef>) => ClassDecorator;
export declare const Component: ComponentDecorator;
