/**
 * Basemap tiles for Leaflet (report location, nearby map, admin demos).
 * Satellite: Esri World Imagery — no API key; respect Esri/OSM terms in production.
 */

export type MapBasemapId = "street" | "satellite";

export function getMapTileLayer(id: MapBasemapId): { url: string; attribution: string } {
  if (id === "satellite") {
    return {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution:
        'Tiles © <a href="https://www.esri.com/">Esri</a> — Earthstar Geographics, Maxar, & GIS community',
    };
  }
  return {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  };
}
