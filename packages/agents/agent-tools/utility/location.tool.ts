import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Abstract, Injectable } from '@tsdi/ioc';

@Abstract()
export abstract class LocationAdapter {
    abstract getCurrentLocation(): Promise<LocationResult>;
}

export interface LocationResult {
    label: string;
    ip?: string;
    org?: string;
    city?: string;
    region?: string;
    regionCode?: string;
    country?: string;
    countryCode?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
    postalCode?: string;
}

@Injectable()
export class LocationTool implements AgentTool {
    name = 'location';
    description = 'Get the current approximate local city/region using network-based geolocation. Use this first when the user asks for local weather or current city without naming a place.';
    inputSchema = {
        type: 'object',
        properties: {}
    };
    toolset = 'utility';
    source = 'local';
    execution = { readOnly: true };

    constructor(
        private adapter: LocationAdapter
    ) {
    }

    async invoke(_input: any, _context: AgentToolContext): Promise<LocationResult> {
        return this.adapter.getCurrentLocation();
    }
}
