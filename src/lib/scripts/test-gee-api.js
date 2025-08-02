// Test the existing GEE API endpoint to verify it's working
async function testGEEAPI() {
  try {
    console.log('Testing GEE API endpoint...');
    
    // Test with one of our grid coordinates from Phase 1
    const testLon = -121.03914851177647;
    const testLat = 47.78228015885822;
    
    const url = `http://localhost:3000/api/getByPoint?lon=${testLon}&lat=${testLat}`;
    console.log(`Calling: ${url}`);
    
    const response = await fetch(url);
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ GEE API working!');
      console.log('NDVI result:', result.data.ndvi);
      console.log('Coordinates:', result.data.coordinates);
      console.log('Image ID:', result.data.imageId);
    } else {
      console.log('❌ GEE API failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ API call failed:', error.message);
    console.log('\n💡 Make sure Next.js dev server is running: npm run dev');
  }
}

testGEEAPI();