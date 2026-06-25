import axios from 'axios';
import config from '../config';
import { getSetting } from '../services/setting.service';
import { getApifyClient } from './apify-client.utils';
import { pickFirstPhone } from './lead-enrichment.utils';

async function getGooglePlacesApiKey(): Promise<string | null> {
    const fromDb = await getSetting('google_places_api_key');
    if (fromDb) return fromDb;
    return config.googlePlaces?.apiKey || null;
}

function buildPlacesQuery(parts: Array<string | null | undefined>): string | null {
    const query = parts.map((part) => part?.trim()).filter(Boolean).join(' ');
    return query || null;
}

async function findPhoneViaGooglePlacesApi(query: string): Promise<string | null> {
    const apiKey = await getGooglePlacesApiKey();
    if (!apiKey) return null;

    try {
        const response = await axios.post(
            'https://places.googleapis.com/v1/places:searchText',
            { textQuery: query, pageSize: 1 },
            {
                timeout: 12000,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': apiKey,
                    'X-Goog-FieldMask': 'places.nationalPhoneNumber,places.internationalPhoneNumber,places.displayName',
                },
            }
        );

        const place = response.data?.places?.[0];
        return pickFirstPhone(place?.internationalPhoneNumber, place?.nationalPhoneNumber);
    } catch (error: any) {
        console.warn('[GooglePlaces] API lookup failed:', error.response?.data?.error?.message || error.message);
        return null;
    }
}

async function findPhoneViaApifyGoogleMaps(query: string): Promise<string | null> {
    try {
        const { client } = await getApifyClient();
        const run = await client.actor('compass/crawler-google-places').call(
            {
                searchStringsArray: [query],
                maxCrawledPlacesPerSearch: 1,
                language: 'en',
            },
            { timeout: 90 }
        );

        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        if (!items?.length) return null;

        const place = items[0] as Record<string, any>;
        return pickFirstPhone(
            place.phone,
            place.phoneUnformatted,
            place.internationalPhoneNumber,
            place.nationalPhoneNumber
        );
    } catch (error: any) {
        console.warn('[GooglePlaces] Apify fallback failed:', error.message);
        return null;
    }
}

/** Google Places API first, then Apify Google Maps. Never throws. */
export async function findPhoneViaGooglePlaces(options: {
    companyName?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
}): Promise<string | null> {
    const query = buildPlacesQuery([
        options.companyName,
        options.city,
        options.state,
        options.country,
    ]);

    if (!query || query.length < 3) return null;

    const fromApi = await findPhoneViaGooglePlacesApi(query);
    if (fromApi) return fromApi;

    return findPhoneViaApifyGoogleMaps(query);
}
