import fs from 'fs';
import path from 'path';
import { generateSubdividedGrid } from '../utils/boundaryQuery.js';

// Convert GeoJSON [lon, lat] format to BoundaryQuery {lat, lon} format
function convertCoordinates(geoJsonCoords) {
  return geoJsonCoords.map(([lon, lat]) => ({ lat, lon }));
}

function createCSVRow(lineID, vegetationIndex, long, lat) {
  return `${lineID},${vegetationIndex || 'null'},${long || 'null'},${lat || 'null'}\n`;
}

export async function processPhase1(inputFile = 'sample-powerline.geojson', outputFile = 'phase1_output.csv') {
  try {
    console.log('Phase 1: Starting boundary generation...');
    
    // Read the GeoJSON file
    const geoJsonPath = path.join(process.cwd(), inputFile);
    const geoData = JSON.parse(fs.readFileSync(geoJsonPath, 'utf8'));
    
    // Prepare output file
    const outputPath = path.join(process.cwd(), outputFile);
    const csvHeader = 'lineID,vegetationIndex,long,lat\n';
    fs.writeFileSync(outputPath, csvHeader);
    
    const totalLines = geoData.features.length;
    console.log(`Found ${totalLines} powerlines to process`);
    
    let processedCount = 0;
    let totalSquares = 0;
    
    for (const feature of geoData.features) {
      processedCount++;
      const lineID = feature.properties['@id'];
      const coordinates = feature.geometry.coordinates;
      
      console.log(`Processing line ${processedCount} of ${totalLines}: ${lineID}`);
      
      try {
        // Convert coordinates to expected format
        const convertedCoords = convertCoordinates(coordinates);
        
        // Call boundary query function
        const boundaryResult = generateSubdividedGrid(convertedCoords);
        
        // Flatten the nested arrays and write to CSV
        if (boundaryResult && Array.isArray(boundaryResult)) {
          let squareCount = 0;
          
          for (const gridSquares of boundaryResult) {
            if (Array.isArray(gridSquares)) {
              for (const square of gridSquares) {
                if (square && square.lat !== undefined && square.lon !== undefined) {
                  const csvRow = createCSVRow(lineID, null, square.lon, square.lat);
                  fs.appendFileSync(outputPath, csvRow);
                  squareCount++;
                }
              }
            }
          }
          
          console.log(`  Generated ${squareCount} grid squares for line ${lineID}`);
          totalSquares += squareCount;
        } else {
          throw new Error('Invalid boundary query result');
        }
        
      } catch (error) {
        console.error(`  Error processing line ${lineID}: ${error.message}`);
        // Write error row with null values
        const csvRow = createCSVRow(lineID, null, null, null);
        fs.appendFileSync(outputPath, csvRow);
      }
    }
    
    console.log(`\nPhase 1 completed! Processed ${processedCount} lines.`);
    console.log(`Output saved to: ${outputPath}`);
    console.log(`Total grid squares generated: ${totalSquares}`);
    
    return {
      processedLines: processedCount,
      totalSquares,
      outputPath
    };
    
  } catch (error) {
    console.error('Phase 1 failed:', error.message);
    throw error;
  }
}