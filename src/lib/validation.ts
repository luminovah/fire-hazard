import { SentinelBands } from './types';

export function validateCoordinates(lon: number, lat: number): void {
  if (typeof lon !== 'number' || typeof lat !== 'number') {
    throw new Error('Longitude and latitude must be numbers');
  }
  
  if (lon < -180 || lon > 180) {
    throw new Error('Longitude must be between -180 and 180');
  }
  
  if (lat < -90 || lat > 90) {
    throw new Error('Latitude must be between -90 and 90');
  }
}

export function validateRegionSize(regionSize: number): void {
  if (typeof regionSize !== 'number' || regionSize <= 0) {
    throw new Error('Region size must be a positive number');
  }
  
  if (regionSize > 100000) {
    throw new Error('Region size cannot exceed 100,000 meters');
  }
}

export function validateBands(bands: string[]): void {
  if (!Array.isArray(bands) || bands.length === 0) {
    throw new Error('Bands must be a non-empty array');
  }
  
  const validBandNames = Object.keys(SentinelBands);
  const validBandCodes = Object.values(SentinelBands);
  
  for (const band of bands) {
    const isValidName = validBandNames.includes(band.toUpperCase());
    const isValidCode = validBandCodes.includes(band as any);
    
    if (!isValidName && !isValidCode) {
      throw new Error(`Invalid band: ${band}. Valid bands: ${validBandNames.join(', ')} or ${validBandCodes.join(', ')}`);
    }
  }
}

export function validateDateRange(startDate: string, endDate: string): void {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date format. Use YYYY-MM-DD');
  }
  
  if (start >= end) {
    throw new Error('Start date must be before end date');
  }
  
  const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  if (daysDiff > 365) {
    throw new Error('Date range cannot exceed 365 days');
  }
}

export function validateRegionCoordinates(regionCoords: number[][]): void {
  if (!Array.isArray(regionCoords) || regionCoords.length < 3) {
    throw new Error('Region coordinates must be an array of at least 3 coordinate pairs');
  }
  
  for (const coord of regionCoords) {
    if (!Array.isArray(coord) || coord.length !== 2) {
      throw new Error('Each coordinate must be an array of [longitude, latitude]');
    }
    
    const [lon, lat] = coord;
    validateCoordinates(lon, lat);
  }
  
  // Check if polygon is closed (first and last coordinates should be the same)
  const first = regionCoords[0];
  const last = regionCoords[regionCoords.length - 1];
  
  if (first[0] !== last[0] || first[1] !== last[1]) {
    // Auto-close the polygon
    regionCoords.push([first[0], first[1]]);
  }
}

export function parseQueryParams(url: URL) {
  const lon = parseFloat(url.searchParams.get('lon') || '');
  const lat = parseFloat(url.searchParams.get('lat') || '');
  const regionSize = parseFloat(url.searchParams.get('regionSize') || '5000');
  const bandsParam = url.searchParams.get('bands');
  const bands = bandsParam ? bandsParam.split(',').map(b => b.trim()) : ['RED', 'GREEN', 'BLUE'];
  const startDate = url.searchParams.get('startDate') || '2021-07-01';
  const endDate = url.searchParams.get('endDate') || '2021-07-15';
  
  return { lon, lat, regionSize, bands, startDate, endDate };
}