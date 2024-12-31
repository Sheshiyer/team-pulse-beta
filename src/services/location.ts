import { Client, PlaceAutocompleteType } from "@googlemaps/google-maps-services-js";

const client = new Client({});
const API_KEY = "AIzaSyD1I3MQdhdUepi7qD5LUYYhpBc8oBJBgSk";

interface LocationDetails {
  address: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export async function searchLocations(query: string): Promise<{
  formattedAddress: string;
  latitude: number;
  longitude: number;
  placeId: string;
}[]> {
  try {
    const response = await client.placeAutocomplete({
      params: {
        input: query,
        key: API_KEY,
        types: "(cities)" as PlaceAutocompleteType, // Only return cities
      },
    });

    if (response.data.predictions) {
      // Get details for each prediction to get coordinates
      const detailsPromises = response.data.predictions.map(async (prediction) => {
        const details = await client.placeDetails({
          params: {
            place_id: prediction.place_id,
            key: API_KEY,
          },
        });

        const location = details.data.result.geometry?.location;
        if (!location) {
          throw new Error("Location not found");
        }

        return {
          formattedAddress: prediction.description,
          latitude: location.lat,
          longitude: location.lng,
          placeId: prediction.place_id,
        };
      });

      return await Promise.all(detailsPromises);
    }

    return [];
  } catch (error) {
    console.error("Error searching locations:", error);
    throw new Error("Failed to search locations");
  }
}

export async function getLocationDetails(
  latitude: number,
  longitude: number
): Promise<LocationDetails> {
  try {
    // Get timezone
    const timezoneResponse = await client.timezone({
      params: {
        location: { lat: latitude, lng: longitude },
        timestamp: Math.floor(Date.now() / 1000), // Current timestamp in seconds
        key: API_KEY,
      },
    });

    // Get address
    const geocodeResponse = await client.reverseGeocode({
      params: {
        latlng: { lat: latitude, lng: longitude },
        key: API_KEY,
      },
    });

    const address = geocodeResponse.data.results[0]?.formatted_address || "";
    const timezone = timezoneResponse.data.timeZoneId;

    if (!timezone) {
      throw new Error("Could not determine timezone");
    }

    return {
      address,
      latitude,
      longitude,
      timezone,
    };
  } catch (error) {
    console.error("Error getting location details:", error);
    throw new Error("Failed to get location details");
  }
}
