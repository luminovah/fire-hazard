const fs = require('fs');
const path = require('path');
const ee = require('@google/earthengine');

// Configuration
const BATCH_SIZE = 2; // Process 2 GEE requests at a time
const INPUT_CSV = 'phase1_output.csv';
const OUTPUT_CSV = 'final_results.csv';

async function authenticateGEE() {
  try {
    console.log('Reading private key JSON...');
    const privateKey = JSON.parse(fs.readFileSync('./secrets/service_account.json', 'utf8'));

    console.log('Authenticating service account...');
    await new Promise((resolve, reject) => {
      ee.data.authenticateViaPrivateKey(privateKey, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('Initializing Earth Engine...');
    await new Promise((resolve, reject) => {
      ee.initialize(null, null, () => resolve(), (err) => reject(err));
    });

    console.log('Google Earth Engine authenticated successfully.');
    return true;
  } catch (error) {
    console.error('GEE Authentication failed:', error.message);
    return false;
  }
}

async function getVegetationIndex(longitude, latitude) {
  try {
    const point = ee.Geometry.Point(longitude, latitude);
    const region = point.buffer(50).bounds(); // 50m buffer around point

    // Get the most recent cloud-free Sentinel-2 image
    const collection = ee.ImageCollection('COPERNICUS/S2_SR')
      .filterBounds(region)
      .filterDate('2023-01-01', '2024-12-31')
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
      .sort('system:time_start', false)
      .limit(1);

    const image = await new Promise((resolve, reject) => {
      collection.first().getInfo((info, err) => {
        if (err || !info) {
          reject(err || new Error('No suitable image found'));
        } else {
          resolve(ee.Image(info.id));
        }
      });
    });

    // Calculate NDVI = (NIR - RED) / (NIR + RED)
    // Sentinel-2 bands: NIR = B8, RED = B4
    const ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');

    // Get NDVI value for the point
    const ndviValue = await new Promise((resolve, reject) => {
      ndvi.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: region,
        scale: 10,
        maxPixels: 1e9
      }).getInfo((info, err) => {
        if (err) reject(err);
        else resolve(info.NDVI);
      });
    });

    return ndviValue !== null ? parseFloat(ndviValue.toFixed(4)) : null;

  } catch (error) {
    console.error(`  GEE error for (${longitude}, ${latitude}):`, error.message);
    return 'failed';
  }
}

function parseCSVRow(row) {
  const parts = row.split(',');
  return {
    lineID: parts[0],
    vegetationIndex: parts[1],
    long: parts[2] === 'null' ? null : parseFloat(parts[2]),
    lat: parts[3] === 'null' ? null : parseFloat(parts[3])
  };
}

function createCSVRow(lineID, vegetationIndex, long, lat) {
  return `${lineID},${vegetationIndex || 'null'},${long || 'null'},${lat || 'null'}\n`;
}

async function processBatch(batch) {
  const promises = batch.map(async (row) => {
    if (row.long === null || row.lat === null) {
      // Skip rows with null coordinates
      return { ...row, vegetationIndex: row.vegetationIndex };
    }

    const ndvi = await getVegetationIndex(row.long, row.lat);
    return { ...row, vegetationIndex: ndvi };
  });

  return Promise.all(promises);
}

async function processPhase2() {
  try {
    console.log('Phase 2: Starting GEE processing...');

    // Authenticate with Google Earth Engine
    const authSuccess = await authenticateGEE();
    if (!authSuccess) {
      throw new Error('Failed to authenticate with Google Earth Engine');
    }

    // Read input CSV
    const inputPath = path.join(__dirname, INPUT_CSV);
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    const csvData = fs.readFileSync(inputPath, 'utf8');
    const lines = csvData.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('Input CSV appears to be empty or invalid');
    }

    const header = lines[0];
    const dataRows = lines.slice(1).map(parseCSVRow);
    
    console.log(`Found ${dataRows.length} rows to process`);

    // Prepare output file
    const outputPath = path.join(__dirname, OUTPUT_CSV);
    fs.writeFileSync(outputPath, header + '\n');

    // Process in batches
    const validRows = dataRows.filter(row => row.long !== null && row.lat !== null);
    const invalidRows = dataRows.filter(row => row.long === null || row.lat === null);
    
    console.log(`Valid coordinates: ${validRows.length}, Invalid coordinates: ${invalidRows.length}`);

    let processedCount = 0;

    // Process invalid rows first (just copy them)
    for (const row of invalidRows) {
      const csvRow = createCSVRow(row.lineID, row.vegetationIndex, row.long, row.lat);
      fs.appendFileSync(outputPath, csvRow);
      processedCount++;
    }

    // Process valid rows in batches
    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE);
      
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(validRows.length / BATCH_SIZE)} (rows ${i + 1}-${Math.min(i + BATCH_SIZE, validRows.length)})`);
      
      const processedBatch = await processBatch(batch);
      
      // Write processed rows to output
      for (const row of processedBatch) {
        const csvRow = createCSVRow(row.lineID, row.vegetationIndex, row.long, row.lat);
        fs.appendFileSync(outputPath, csvRow);
        processedCount++;
      }

      console.log(`GEE processed ${processedCount} of ${dataRows.length} coordinates`);

      // Small delay between batches to avoid overwhelming the API
      if (i + BATCH_SIZE < validRows.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`\nPhase 2 completed! Processed ${processedCount} rows.`);
    console.log(`Output saved to: ${outputPath}`);

    // Show summary
    const finalData = fs.readFileSync(outputPath, 'utf8');
    const finalRows = finalData.split('\n').filter(line => line.trim()).length - 1; // Subtract header
    const successfulVegetation = finalData.split('\n').filter(line => 
      line.includes(',') && !line.includes(',null,') && !line.includes(',failed,') && line !== header
    ).length;
    
    console.log(`Total rows in output: ${finalRows}`);
    console.log(`Successful vegetation index retrievals: ${successfulVegetation}`);

  } catch (error) {
    console.error('Phase 2 failed:', error.message);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  processPhase2();
}

module.exports = { processPhase2 };