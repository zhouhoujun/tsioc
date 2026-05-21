import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';

export interface WeatherAdapter {
    getCurrentWeather(location: string, units?: 'metric' | 'imperial'): Promise<WeatherResult>;
    getForecast?(location: string, days?: number, units?: 'metric' | 'imperial'): Promise<WeatherForecastResult>;
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

export const AGENT_WEATHER_ADAPTER = 'AGENT_WEATHER_ADAPTER';

@Injectable()
export class WeatherTool implements AgentTool {
    name = 'weather';
    description = 'Get current weather and optional forecast for a location. Uses a configured weather service adapter.';
    inputSchema = {
        type: 'object',
        properties: {
            location: {
                type: 'string',
                description: 'City name or location (e.g., "Beijing", "New York", "London").'
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
        },
        required: ['location']
    };
    toolset = 'utility';
    source = 'local';
    execution = { readOnly: true };

    constructor(
        @Optional() @Inject(AGENT_WEATHER_ADAPTER, { defaultValue: null })
        private adapter?: WeatherAdapter | null
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const location = this.requireString(input?.location, 'weather location');
        const units = input?.units === 'imperial' ? 'imperial' : 'metric';
        const includeForecast = input?.forecast === true;

        if (!this.adapter) {
            throw new Error('weather requires a configured WeatherAdapter. Provide one via the AGENT_WEATHER_ADAPTER token.');
        }

        const current = await this.adapter.getCurrentWeather(location, units);
        let forecast: WeatherForecastResult | undefined;

        if (includeForecast && typeof this.adapter.getForecast === 'function') {
            const days = typeof input?.days === 'number' ? Math.min(Math.max(1, input.days), 7) : 3;
            forecast = await this.adapter.getForecast(location, days, units);
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
            forecast: forecast ? { days: forecast.days } : undefined
        };
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }
}
