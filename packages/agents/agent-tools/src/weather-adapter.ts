import { AgentToolsWeatherOptions } from './options';
import { WeatherAdapter, WeatherForecastResult, WeatherResult } from '../utility/weather.tool';

interface OpenMeteoGeocodingResult {
    results?: Array<{
        name?: string;
        admin1?: string;
        country?: string;
        latitude?: number;
        longitude?: number;
    }>;
}

interface OpenMeteoForecastResult {
    current?: {
        temperature_2m?: number;
        apparent_temperature?: number;
        relative_humidity_2m?: number;
        pressure_msl?: number;
        wind_speed_10m?: number;
        weather_code?: number;
    };
    daily?: {
        time?: string[];
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
        weather_code?: number[];
    };
}

export class OpenMeteoWeatherAdapter extends WeatherAdapter {
    protected fetchFn?: typeof fetch;
    protected timeoutMs: number;
    protected geocodingBaseUrl: string;
    protected forecastBaseUrl: string;
    protected userAgent: string;

    constructor(options: AgentToolsWeatherOptions = {}) {
        super();
        this.fetchFn = options.fetch ?? globalThis.fetch?.bind(globalThis);
        this.timeoutMs = Math.max(1000, Number(options.timeoutMs || 15000));
        this.geocodingBaseUrl = String(options.geocodingBaseUrl || 'https://geocoding-api.open-meteo.com/v1').replace(/\/$/, '');
        this.forecastBaseUrl = String(options.forecastBaseUrl || 'https://api.open-meteo.com/v1').replace(/\/$/, '');
        this.userAgent = String(options.userAgent || 'tsdi-agent/6').trim();
    }

    override async getCurrentWeather(location: string, units: 'metric' | 'imperial' = 'metric'): Promise<WeatherResult> {
        const resolved = await this.resolveLocation(location);
        const query = new URLSearchParams({
            latitude: String(resolved.latitude),
            longitude: String(resolved.longitude),
            current: 'temperature_2m,apparent_temperature,relative_humidity_2m,pressure_msl,wind_speed_10m,weather_code',
            timezone: 'auto'
        });
        this.applyUnitParams(query, units);
        const payload = await this.requestJson<OpenMeteoForecastResult>(`${this.forecastBaseUrl}/forecast?${query.toString()}`);
        const current = payload?.current;
        if (!current || typeof current.temperature_2m !== 'number') {
            throw new Error(`Weather service did not return current weather for '${location}'.`);
        }
        return {
            location: resolved.label,
            temperature: current.temperature_2m,
            feelsLike: this.optionalNumber(current.apparent_temperature),
            humidity: this.optionalNumber(current.relative_humidity_2m),
            description: describeWeatherCode(current.weather_code),
            windSpeed: this.optionalNumber(current.wind_speed_10m),
            pressure: this.optionalNumber(current.pressure_msl),
            units
        };
    }

    override async getForecast(location: string, days = 3, units: 'metric' | 'imperial' = 'metric'): Promise<WeatherForecastResult> {
        const resolved = await this.resolveLocation(location);
        const query = new URLSearchParams({
            latitude: String(resolved.latitude),
            longitude: String(resolved.longitude),
            daily: 'weather_code,temperature_2m_max,temperature_2m_min',
            forecast_days: String(Math.min(Math.max(1, days), 7)),
            timezone: 'auto'
        });
        this.applyUnitParams(query, units);
        const payload = await this.requestJson<OpenMeteoForecastResult>(`${this.forecastBaseUrl}/forecast?${query.toString()}`);
        const daily = payload?.daily;
        const dates = daily?.time ?? [];
        const highs = daily?.temperature_2m_max ?? [];
        const lows = daily?.temperature_2m_min ?? [];
        const codes = daily?.weather_code ?? [];
        if (!dates.length) {
            throw new Error(`Weather service did not return forecast data for '${location}'.`);
        }
        return {
            location: resolved.label,
            units,
            days: dates.map((date, index) => ({
                date,
                tempHigh: typeof highs[index] === 'number' ? highs[index] : NaN,
                tempLow: typeof lows[index] === 'number' ? lows[index] : NaN,
                description: describeWeatherCode(codes[index])
            }))
        };
    }

    protected async resolveLocation(location: string): Promise<{ label: string; latitude: number; longitude: number }> {
        const normalized = String(location || '').trim();
        for (const query of this.buildLocationSearchQueries(normalized)) {
            const payload = await this.requestJson<OpenMeteoGeocodingResult>(`${this.geocodingBaseUrl}/search?${query.toString()}`);
            const result = payload?.results?.[0];
            if (!result || typeof result.latitude !== 'number' || typeof result.longitude !== 'number') {
                continue;
            }
            return {
                label: [result.name, result.admin1, result.country].filter(Boolean).join(', ') || location,
                latitude: result.latitude,
                longitude: result.longitude
            };
        }
        throw new Error(`Unable to find weather location '${location}'.`);
    }

    protected buildLocationSearchQueries(location: string): URLSearchParams[] {
        const queries: URLSearchParams[] = [];
        const seen = new Set<string>();
        const add = (params: Record<string, string>) => {
            const query = new URLSearchParams(params);
            const key = query.toString();
            if (seen.has(key)) {
                return;
            }
            seen.add(key);
            queries.push(query);
        };

        add({
            name: location,
            count: '1',
            format: 'json'
        });

        add({
            name: location,
            count: '10',
            format: 'json'
        });

        for (const language of this.inferLocationSearchLanguages(location)) {
            add({
                name: location,
                count: '10',
                format: 'json',
                language
            });
        }

        return queries;
    }

    protected inferLocationSearchLanguages(location: string): string[] {
        const text = String(location || '').trim();
        if (!text) {
            return [];
        }
        if (/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(text)) {
            return ['zh'];
        }
        if (/[\u3040-\u30ff]/.test(text)) {
            return ['ja'];
        }
        if (/[\uac00-\ud7af]/.test(text)) {
            return ['ko'];
        }
        if (/[\u0600-\u06ff]/.test(text)) {
            return ['ar'];
        }
        if (/[\u0400-\u04ff]/.test(text)) {
            return ['ru'];
        }
        return [];
    }

    protected applyUnitParams(query: URLSearchParams, units: 'metric' | 'imperial'): void {
        if (units === 'imperial') {
            query.set('temperature_unit', 'fahrenheit');
            query.set('wind_speed_unit', 'mph');
            query.set('precipitation_unit', 'inch');
        }
    }

    protected async requestJson<T>(url: string): Promise<T> {
        const fetchFn = this.fetchFn;
        if (!fetchFn) {
            throw new Error('Weather service adapter requires a fetch implementation.');
        }
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
        const timer = controller ? setTimeout(() => controller.abort(), this.timeoutMs) : undefined;
        try {
            const response = await fetchFn(url, {
                method: 'GET',
                headers: this.userAgent ? { 'user-agent': this.userAgent } : undefined,
                signal: controller?.signal
            } as any);
            if (!response.ok) {
                throw new Error(`Weather service request failed with status ${response.status}.`);
            }
            return await response.json() as T;
        } finally {
            if (timer) {
                clearTimeout(timer);
            }
        }
    }

    protected optionalNumber(value: unknown): number | undefined {
        return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
    }
}

function describeWeatherCode(code: number | undefined): string {
    switch (code) {
        case 0:
            return 'Clear sky';
        case 1:
            return 'Mainly clear';
        case 2:
            return 'Partly cloudy';
        case 3:
            return 'Overcast';
        case 45:
        case 48:
            return 'Fog';
        case 51:
        case 53:
        case 55:
            return 'Drizzle';
        case 56:
        case 57:
            return 'Freezing drizzle';
        case 61:
        case 63:
        case 65:
            return 'Rain';
        case 66:
        case 67:
            return 'Freezing rain';
        case 71:
        case 73:
        case 75:
            return 'Snow';
        case 77:
            return 'Snow grains';
        case 80:
        case 81:
        case 82:
            return 'Rain showers';
        case 85:
        case 86:
            return 'Snow showers';
        case 95:
            return 'Thunderstorm';
        case 96:
        case 99:
            return 'Thunderstorm with hail';
        default:
            return 'Unknown';
    }
}
