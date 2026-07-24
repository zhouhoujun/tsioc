import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Abstract, Inject, Injectable, Optional } from '@tsdi/ioc';
import { LocationAdapter, LocationResult } from './location.tool';

export type WeatherLookup = string | LocationResult;

@Abstract()
export abstract class WeatherAdapter {
    abstract getCurrentWeather(location: WeatherLookup, units?: 'metric' | 'imperial'): Promise<WeatherResult>;
    abstract getForecast(location: WeatherLookup, days?: number, units?: 'metric' | 'imperial'): Promise<WeatherForecastResult>;
}

export interface WeatherResult {
    location: string;
    temperature: number;
    feelsLike?: number;
    humidity?: number;
    description: string;
    windSpeed?: number;
    pressure?: number;
    icon?: string;
    units: string;
}

export interface WeatherForecastResult {
    location: string;
    days: Array<{
        date: string;
        tempHigh: number;
        tempLow: number;
        description: string;
    }>;
    units: string;
}

@Injectable()
export class WeatherTool implements AgentTool {
    name = 'weather';
    description = 'Get current weather and optional forecast for a location. If location is omitted, it uses the current local location automatically. For requests like "今天天气怎么样", call this tool without asking for a city first.';
    inputSchema = {
        type: 'object',
        properties: {
            location: {
                type: 'string',
                description: 'City name or location (e.g., "Beijing", "New York", "London"). If omitted, the current local location is used.'
            },
            forecast: {
                type: 'boolean',
                description: 'Include forecast (default: false).'
            },
            days: {
                type: 'number',
                description: 'Number of forecast days (default: 3, max: 7).'
            },
            units: {
                type: 'string',
                enum: ['metric', 'imperial'],
                description: 'Temperature units (default: metric).'
            }
        }
    };
    toolset = 'utility';
    source = 'local';
    execution = { readOnly: true };

    constructor(
        private adapter: WeatherAdapter,
        @Optional() @Inject(LocationAdapter)
        private locationAdapter?: LocationAdapter | null
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const requestedLocation = this.optionalString(input?.location);
        const location = requestedLocation ?? await this.resolveCurrentLocation();
        const units = input?.units === 'imperial' ? 'imperial' : 'metric';
        const includeForecast = input?.forecast === true;
        let current: WeatherResult;
        try {
            current = await this.adapter.getCurrentWeather(location, units);
        } catch (error) {
            throw this.rewriteWeatherLookupError(error, location, requestedLocation ? 'input' : 'current');
        }
        let forecast: WeatherForecastResult | undefined;

        if (includeForecast && typeof this.adapter.getForecast === 'function') {
            const days = typeof input?.days === 'number' ? Math.min(Math.max(1, input.days), 7) : 3;
            try {
                forecast = await this.adapter.getForecast(location, days, units);
            } catch (error) {
                throw this.rewriteWeatherLookupError(error, location, requestedLocation ? 'input' : 'current');
            }
        }

        return {
            location: current.location,
            temperature: current.temperature,
            feelsLike: current.feelsLike,
            humidity: current.humidity,
            description: current.description,
            windSpeed: current.windSpeed,
            pressure: current.pressure,
            units: current.units,
            locationSource: requestedLocation ? 'input' : 'current',
            forecast: forecast ? { days: forecast.days } : undefined
        };
    }

    private optionalString(value: unknown): string | undefined {
        if (typeof value !== 'string' || !value.trim()) {
            return undefined;
        }
        return value.trim();
    }

    private async resolveCurrentLocation(): Promise<WeatherLookup> {
        if (!this.locationAdapter) {
            throw new Error('Invalid weather location: must provide a location when no current location adapter is configured.');
        }
        const current = await this.locationAdapter.getCurrentLocation();
        if (typeof current?.latitude === 'number' && Number.isFinite(current.latitude)
            && typeof current?.longitude === 'number' && Number.isFinite(current.longitude)) {
            return current;
        }
        const label = this.buildLocationLabel(current);
        if (!label) {
            throw new Error('Unable to resolve current location for weather lookup.');
        }
        return label;
    }

    private buildLocationLabel(location: LocationResult): string | undefined {
        const explicit = this.optionalString(location.label);
        if (explicit) {
            return explicit;
        }
        const fallback = [location.city, location.region, location.country]
            .map(value => this.optionalString(value))
            .filter(Boolean)
            .join(', ');
        return fallback || undefined;
    }

    private describeLookup(location: WeatherLookup): string | undefined {
        if (typeof location === 'string') {
            return this.optionalString(location);
        }
        return this.buildLocationLabel(location);
    }

    private rewriteWeatherLookupError(error: unknown, location: WeatherLookup, source: 'input' | 'current'): Error {
        const resolvedLocation = this.describeLookup(location);
        const message = error instanceof Error ? error.message : String(error || 'Unknown error');
        if (!resolvedLocation) {
            return error instanceof Error ? error : new Error(message);
        }
        const prefix = source === 'current'
            ? `Current location '${resolvedLocation}'`
            : `Weather lookup for '${resolvedLocation}'`;
        return new Error(`${prefix} failed: ${message}`);
    }
}
