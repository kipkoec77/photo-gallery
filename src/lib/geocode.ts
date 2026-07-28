export interface Coordinates {
  lat: number;
  lng: number;
}

const UNKNOWN_LOCATION = "Unknown location";

export async function reverseGeocode(
  coordinates: Coordinates | null | undefined
): Promise<string> {
  if (
    !coordinates ||
    !Number.isFinite(coordinates.lat) ||
    !Number.isFinite(coordinates.lng)
  ) {
    return UNKNOWN_LOCATION;
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(coordinates.lat));
    url.searchParams.set("lon", String(coordinates.lng));

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": process.env.NOMINATIM_USER_AGENT ?? "photo-gallery/1.0",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return UNKNOWN_LOCATION;
    }

    const data: { display_name?: unknown } = await response.json();

    if (typeof data.display_name !== "string" || !data.display_name.trim()) {
      return UNKNOWN_LOCATION;
    }

    return data.display_name;
  } catch {
    return UNKNOWN_LOCATION;
  }
}