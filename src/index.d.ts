export interface AircraftModel {
    designator: string;
    manufacturer: string;
    model: string;
    classCode: string;
    wakeCategory: string;
    engineCount: number;
    engineType: string;
    aircraftKind: string;
}

export interface AircraftType {
    /** ICAO type designator, e.g. "B739". */
    designator: string;
    /** Manufacturer as written in Doc 8643, e.g. "BOEING". */
    manufacturer: string;
    /** Display-cased manufacturer, e.g. "Boeing". */
    manufacturerName: string;
    /** Primary model name, e.g. "737-900". */
    name: string;
    /** Every model name sharing this designator. */
    models: string[];
    /** ICAO class code, e.g. "L2J" (landplane, 2 engines, jet). */
    classCode: string;
    /** "L", "M", "H", "J", or "L/M". */
    wakeCategory: string;
    engineCount: number;
    engineType: string;
    aircraftKind: string;
}

export const models: AircraftModel[];
export const designators: string[];
export function get(designator: string): AircraftType | null;
export function format(designator: string): string | null;
export function search(query: string, options?: { limit?: number }): AircraftType[];
export function resolveManufacturer(name: string): string | null;
export function findByModel(manufacturer: string, model: string): string | null;
export const source: { url: string; fetchedAt: string };
