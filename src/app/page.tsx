import EarthEngineForm from '@/components/EarthEngineForm';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Earth Engine Vegetation Analysis
          </h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Query satellite data using Google Earth Engine to analyze vegetation indices (NDVI) 
            and generate thumbnail images from Sentinel-2 imagery.
          </p>
        </div>
        
        <EarthEngineForm />
        
        <div className="mt-12 text-center text-sm text-gray-700">
          <p>Powered by Google Earth Engine and Next.js</p>
        </div>
      </div>
    </div>
  );
}
