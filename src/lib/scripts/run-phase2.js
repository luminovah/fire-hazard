import { processPhase2 } from '../processors/phase2.js';

// Run Phase 2 with Phase 1 output
processPhase2()
  .then(result => {
    console.log('\n=== Phase 2 Summary ===');
    console.log(`Rows processed: ${result.processedRows}`);
    console.log(`Successful vegetation retrievals: ${result.successfulVegetation}`);
    console.log(`Output file: ${result.outputPath}`);
  })
  .catch(error => {
    console.error('Phase 2 failed:', error.message);
    process.exit(1);
  });