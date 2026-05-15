import { Provider } from '@tsdi/ioc';

export interface AgentChannelFeature {
    name: string;
    label?: string;
    providers: Provider[];
}
