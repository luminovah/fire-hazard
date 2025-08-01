import ee from '@google/earthengine';
import { readFileSync } from 'fs';

async function main() {
  try {
    console.log('Reading private key JSON...');
    const privateKey = JSON.parse(readFileSync('./secrets/service_account.json', 'utf8'));

    console.log('Authenticating service account...');
    await new Promise((resolve, reject) => {
      ee.data.authenticateViaPrivateKey(privateKey, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('Authentication successful.');

    console.log('Initializing Earth Engine...');
    await new Promise((resolve, reject) => {
      ee.initialize(null, null, () => resolve(), (err) => reject(err));
    });
    console.log('Earth Engine initialized.');

    const lon = -122.292;
    const lat = 37.901;
    const region = ee.Geometry.Point(lon, lat).buffer(5000).bounds();

    console.log(`Searching Sentinel-2 images between 2021-07-01 and 2021-07-15 near ${lon},${lat}...`);
    const collection = ee.ImageCollection('COPERNICUS/S2_SR')
      .filterBounds(region)
      .filterDate('2021-07-01', '2021-07-15')
      .sort('CLOUDY_PIXEL_PERCENTAGE')
      .limit(1);

    const firstImage = await new Promise((resolve, reject) => {
      collection.first().getInfo((info, err) => {
        if (err || !info) reject(err || new Error('No image found'));
        else resolve(ee.Image(info.id));
      });
    });

    console.log('Found image ID:', firstImage.id);

    // Calculate NDVI = (NIR - RED) / (NIR + RED)
    // Sentinel-2 bands: NIR = B8, RED = B4
    const ndvi = firstImage.normalizedDifference(['B8', 'B4']).rename('NDVI');

    // Get NDVI statistics for the region
    const stats = await new Promise((resolve, reject) => {
      ndvi.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: region,
        scale: 10,
        maxPixels: 1e9
      }).getInfo((info, err) => {
        if (err) reject(err);
        else resolve(info);
      });
    });

    console.log('NDVI mean value for region:', stats.NDVI);

  } catch (error) {
    console.error('Error:', error);
  }
}

main();
