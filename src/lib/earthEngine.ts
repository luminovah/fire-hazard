import ee from '@google/earthengine';
import { SentinelBands, VegetationIndexResult } from './types';

let isInitialized = false;

function constructServiceAccountKey(): any {
  // Try individual environment variables first
  const type = process.env.EARTH_ENGINE_TYPE;
  const projectId = process.env.EARTH_ENGINE_PROJECT_ID;
  const privateKeyId = process.env.EARTH_ENGINE_PRIVATE_KEY_ID;
  const privateKey = process.env.EARTH_ENGINE_PRIVATE_KEY;
  const clientEmail = process.env.EARTH_ENGINE_CLIENT_EMAIL;
  const clientId = process.env.EARTH_ENGINE_CLIENT_ID;
  const authUri = process.env.EARTH_ENGINE_AUTH_URI;
  const tokenUri = process.env.EARTH_ENGINE_TOKEN_URI;
  const authProviderCertUrl = process.env.EARTH_ENGINE_AUTH_PROVIDER_CERT_URL;
  const clientCertUrl = process.env.EARTH_ENGINE_CLIENT_CERT_URL;

  // If individual variables are available, construct the JSON
  if (type && projectId && privateKeyId && privateKey && clientEmail && clientId) {
    return {
      type,
      project_id: projectId,
      private_key_id: privateKeyId,
      private_key: privateKey.replace(/\\n/g, '\n'), // Handle escaped newlines
      client_email: clientEmail,
      client_id: clientId,
      auth_uri: authUri || 'https://accounts.google.com/o/oauth2/auth',
      token_uri: tokenUri || 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: authProviderCertUrl || 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: clientCertUrl
    };
  }

  // Fallback to single JSON string (backward compatibility)
  const serviceAccountKey = process.env.EARTH_ENGINE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey) {
    try {
      return JSON.parse(serviceAccountKey);
    } catch {
      throw new Error('Invalid EARTH_ENGINE_SERVICE_ACCOUNT_KEY JSON format');
    }
  }

  throw new Error('Earth Engine service account credentials not found. Please set either individual environment variables (EARTH_ENGINE_TYPE, EARTH_ENGINE_PROJECT_ID, etc.) or EARTH_ENGINE_SERVICE_ACCOUNT_KEY');
}

export async function initializeEarthEngine(): Promise<void> {
  if (isInitialized) {
    return;
  }

  try {
    console.log('Reading service account credentials...');
    
    const privateKey = constructServiceAccountKey();

    console.log('Authenticating service account...');
    await new Promise<void>((resolve, reject) => {
      ee.data.authenticateViaPrivateKey(privateKey, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('Initializing Earth Engine...');
    await new Promise<void>((resolve, reject) => {
      ee.initialize(null, null, () => resolve(), (err) => reject(err));
    });

    isInitialized = true;
    console.log('Earth Engine initialized successfully.');

  } catch (error) {
    console.error('Failed to initialize Earth Engine:', error);
    throw error;
  }
}

export function translateBands(userBands: string[]): string[] {
  return userBands.map(band => {
    // Check if it's already a Sentinel band code
    if (band.match(/^B\d+$/)) {
      return band;
    }
    
    // Convert user-friendly names to band codes
    const bandCode = SentinelBands[band.toUpperCase() as keyof typeof SentinelBands];
    if (!bandCode) {
      throw new Error(`Invalid band: ${band}. Available bands: ${Object.keys(SentinelBands).join(', ')}`);
    }
    return bandCode;
  });
}

export async function getVegetationIndexByPoint(
  lon: number,
  lat: number,
  regionSize: number = 5000,
  startDate: string = '2021-07-01',
  endDate: string = '2021-07-15'
): Promise<VegetationIndexResult> {
  await initializeEarthEngine();

  const region = ee.Geometry.Point(lon, lat).buffer(regionSize).bounds();

  // Get Sentinel-2 image collection
  const collection = ee.ImageCollection('COPERNICUS/S2_SR')
    .filterBounds(region)
    .filterDate(startDate, endDate)
    .sort('CLOUDY_PIXEL_PERCENTAGE')
    .limit(1);

  // Get the first image
  const firstImage = await new Promise<any>((resolve, reject) => {
    collection.first().getInfo((info: any, err: any) => {
      if (err || !info) reject(err || new Error('No image found'));
      else resolve(ee.Image(info.id));
    });
  });

  // Calculate NDVI = (NIR - RED) / (NIR + RED)
  const ndvi = firstImage.normalizedDifference(['B8', 'B4']).rename('NDVI');

  // Get NDVI statistics for the region
  const stats = await new Promise<any>((resolve, reject) => {
    ndvi.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: region,
      scale: 10,
      maxPixels: 1e9
    }).getInfo((info: any, err: any) => {
      if (err) reject(err);
      else resolve(info);
    });
  });

  return {
    ndvi: stats.NDVI,
    coordinates: { lon, lat },
    regionSize,
    timestamp: new Date().toISOString(),
    imageId: firstImage.id
  };
}

export async function getVegetationIndexByRegion(
  regionCoords: number[][],
  startDate: string = '2021-07-01',
  endDate: string = '2021-07-15'
): Promise<VegetationIndexResult> {
  await initializeEarthEngine();

  // Create polygon from coordinates
  const region = ee.Geometry.Polygon(regionCoords);

  // Get Sentinel-2 image collection
  const collection = ee.ImageCollection('COPERNICUS/S2_SR')
    .filterBounds(region)
    .filterDate(startDate, endDate)
    .sort('CLOUDY_PIXEL_PERCENTAGE')
    .limit(1);

  // Get the first image
  const firstImage = await new Promise<any>((resolve, reject) => {
    collection.first().getInfo((info: any, err: any) => {
      if (err || !info) reject(err || new Error('No image found'));
      else resolve(ee.Image(info.id));
    });
  });

  // Calculate NDVI = (NIR - RED) / (NIR + RED)
  const ndvi = firstImage.normalizedDifference(['B8', 'B4']).rename('NDVI');

  // Get NDVI statistics for the region
  const stats = await new Promise<any>((resolve, reject) => {
    ndvi.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: region,
      scale: 10,
      maxPixels: 1e9
    }).getInfo((info: any, err: any) => {
      if (err) reject(err);
      else resolve(info);
    });
  });

  // Calculate centroid for coordinates
  const centroid = await new Promise<any>((resolve, reject) => {
    region.centroid().coordinates().getInfo((coords: any, err: any) => {
      if (err) reject(err);
      else resolve(coords);
    });
  });

  return {
    ndvi: stats.NDVI,
    coordinates: { lon: centroid[0], lat: centroid[1] },
    timestamp: new Date().toISOString(),
    imageId: firstImage.id
  };
}

export async function generateThumbnailUrl(
  lon: number,
  lat: number,
  regionSize: number = 5000,
  bands: string[] = ['B4', 'B3', 'B2'],
  startDate: string = '2021-07-01',
  endDate: string = '2021-07-15'
): Promise<string> {
  await initializeEarthEngine();

  const translatedBands = translateBands(bands);
  const region = ee.Geometry.Point(lon, lat).buffer(regionSize).bounds();

  // Get Sentinel-2 image collection
  const collection = ee.ImageCollection('COPERNICUS/S2_SR')
    .filterBounds(region)
    .filterDate(startDate, endDate)
    .sort('CLOUDY_PIXEL_PERCENTAGE')
    .limit(1);

  const image = collection.first().select(translatedBands);

  // Generate thumbnail URL
  const thumbnail = await new Promise<string>((resolve, reject) => {
    image.getThumbURL({
      region: region,
      dimensions: 512,
      format: 'png'
    }, (url: string, err: any) => {
      if (err) reject(err);
      else resolve(url);
    });
  });

  return thumbnail;
}

export async function generateThumbnailUrlByRegion(
  regionCoords: number[][],
  bands: string[] = ['B4', 'B3', 'B2'],
  startDate: string = '2021-07-01',
  endDate: string = '2021-07-15'
): Promise<string> {
  await initializeEarthEngine();

  const translatedBands = translateBands(bands);
  const region = ee.Geometry.Polygon(regionCoords);

  // Get Sentinel-2 image collection
  const collection = ee.ImageCollection('COPERNICUS/S2_SR')
    .filterBounds(region)
    .filterDate(startDate, endDate)
    .sort('CLOUDY_PIXEL_PERCENTAGE')
    .limit(1);

  const image = collection.first().select(translatedBands);

  // Generate thumbnail URL
  const thumbnail = await new Promise<string>((resolve, reject) => {
    image.getThumbURL({
      region: region,
      dimensions: 512,
      format: 'png'
    }, (url: string, err: any) => {
      if (err) reject(err);
      else resolve(url);
    });
  });

  return thumbnail;
}