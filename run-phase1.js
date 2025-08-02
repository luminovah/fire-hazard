import { processPhase1 } from './src/lib/processors/phase1.js';

// Run Phase 1 with sample data
processPhase1()
  .then(result => {
    console.log('\n=== Phase 1 Summary ===');
    console.log(`Lines processed: ${result.processedLines}`);
    console.log(`Grid squares generated: ${result.totalSquares}`);
    console.log(`Output file: ${result.outputPath}`);
  })
  .catch(error => {
    console.error('Phase 1 failed:', error.message);
    process.exit(1);
  });