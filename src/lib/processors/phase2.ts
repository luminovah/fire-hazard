import fs from 'fs';
import path from 'path';
import { getVegetationIndexByPoint, initializeEarthEngine } from '../earthEngine';

// Configuration
const BATCH_SIZE = 2; // Process 2 GEE requests at a time

interface CSVRow {
  lineID: string;
  vegetationIndex: string | null;
  long: number | null;
  lat: number | null;
}

function parseCSVRow(row: string): CSVRow {
  const parts = row.split(',');
  return {
    lineID: parts[0],
    vegetationIndex: parts[1],
    long: parts[2] === 'null' ? null : parseFloat(parts[2]),
    lat: parts[3] === 'null' ? null : parseFloat(parts[3])
  };
}

function createCSVRow(lineID: string, vegetationIndex: string | number | null, long: number | null, lat: number | null): string {
  return `${lineID},${vegetationIndex || 'null'},${long || 'null'},${lat || 'null'}\n`;
}

async function processBatch(batch: CSVRow[]): Promise<CSVRow[]> {
  const promises = batch.map(async (row) => {
    if (row.long === null || row.lat === null) {
      // Skip rows with null coordinates
      return { ...row, vegetationIndex: row.vegetationIndex };
    }

    try {
      const result = await getVegetationIndexByPoint(row.long, row.lat);
      return { ...row, vegetationIndex: result.ndvi?.toString() || 'null' };
    } catch (error: any) {
      console.error(`  GEE error for (${row.long}, ${row.lat}):`, error.message);
      return { ...row, vegetationIndex: 'failed' };
    }
  });

  return Promise.all(promises);
}

export async function processPhase2(inputFile: string = 'phase1_output.csv', outputFile: string = 'final_results.csv') {
  try {
    console.log('Phase 2: Starting GEE processing...');

    // Initialize Google Earth Engine
    console.log('Initializing Google Earth Engine...');
    await initializeEarthEngine();
    console.log('GEE initialization successful.');

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
    const finalRows = finalData.split('\n').filter(line => line.trim()).length - 1; // Subtract header
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

  } catch (error: any) {
    console.error('Phase 2 failed:', error.message);
    throw error;
  }
}