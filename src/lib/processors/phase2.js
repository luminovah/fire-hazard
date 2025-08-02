import fs from 'fs';
import path from 'path';
// Note: We'll need to handle the TypeScript import differently
// For now, let's use the API approach as a workaround

// Configuration
const BATCH_SIZE = 2; // Process 2 GEE requests at a time
const API_BASE_URL = 'http://localhost:3000/api/getByPoint';

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

async function getVegetationIndexViaAPI(longitude, latitude) {
  try {
    const url = `${API_BASE_URL}?lon=${longitude}&lat=${latitude}`;
    const response = await fetch(url);
    const result = await response.json();
    
    if (result.success) {
      return result.data.ndvi;
    } else {
      throw new Error(result.error || 'API call failed');
    }
  } catch (error) {
    console.error(`  API error for (${longitude}, ${latitude}):`, error.message);
    return 'failed';
  }
}

async function processBatch(batch) {
  const promises = batch.map(async (row) => {
    if (row.long === null || row.lat === null) {
      return { ...row, vegetationIndex: row.vegetationIndex };
    }

    const ndvi = await getVegetationIndexViaAPI(row.long, row.lat);
    return { ...row, vegetationIndex: ndvi };
  });

  return Promise.all(promises);
}

export async function processPhase2(inputFile = 'phase1_output.csv', outputFile = 'final_results.csv') {
  try {
    console.log('Phase 2: Starting GEE processing via API...');

    // Test API connectivity first
    console.log('Testing API connectivity...');
    const testResult = await getVegetationIndexViaAPI(-121.03914851177647, 47.78228015885822);
    if (testResult === 'failed') {
      throw new Error('API connectivity test failed. Make sure Next.js server is running: npm run dev');
    }
    console.log('✅ API connectivity test passed. NDVI:', testResult);

    // Read input CSV
    const inputPath = path.join(process.cwd(), inputFile);
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
    const outputPath = path.join(process.cwd(), outputFile);
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
    const finalRows = finalData.split('\n').filter(line => line.trim()).length - 1;
    const successfulVegetation = finalData.split('\n').filter(line => 
      line.includes(',') && !line.includes(',null,') && !line.includes(',failed,') && line !== header
    ).length;
    
    console.log(`Total rows in output: ${finalRows}`);
    console.log(`Successful vegetation index retrievals: ${successfulVegetation}`);

    return {
      processedRows: processedCount,
      successfulVegetation,
      outputPath
    };

  } catch (error) {
    console.error('Phase 2 failed:', error.message);
    throw error;
  }
}