'use client';

import { useState } from 'react';
import Image from 'next/image';
import { SentinelBands } from '@/lib/types';

interface FormData {
  lon: string;
  lat: string;
  regionSize: string;
  bands: string[];
  startDate: string;
  endDate: string;
  queryType: 'point' | 'region';
  returnType: 'ndvi' | 'thumbnail';
}

interface Result {
  success: boolean;
  type: 'ndvi' | 'thumbnail';
  data?: any;
  thumbnailUrl?: string;
  error?: string;
  message?: string;
}

export default function EarthEngineForm() {
  const [formData, setFormData] = useState<FormData>({
    lon: '-122.292',
    lat: '37.901',
    regionSize: '5000',
    bands: ['RED', 'GREEN', 'BLUE'],
    startDate: '2021-07-01',
    endDate: '2021-07-15',
    queryType: 'point',
    returnType: 'ndvi'
  });

  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  const availableBands = Object.keys(SentinelBands);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBandChange = (band: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      bands: checked 
        ? [...prev.bands, band]
        : prev.bands.filter(b => b !== band)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      let response;
      
      if (formData.queryType === 'point') {
        const params = new URLSearchParams({
          lon: formData.lon,
          lat: formData.lat,
          regionSize: formData.regionSize,
          bands: formData.bands.join(','),
          startDate: formData.startDate,
          endDate: formData.endDate,
          type: formData.returnType
        });
        
        response = await fetch(`/api/getByPoint?${params}`);
      } else {
        // For region queries, we'll use a simple rectangle for demo
        const lon = parseFloat(formData.lon);
        const lat = parseFloat(formData.lat);
        const size = parseFloat(formData.regionSize) / 111000; // Convert meters to degrees (approx)
        
        const regionCoords = [
          [lon - size/2, lat - size/2],
          [lon + size/2, lat - size/2],
          [lon + size/2, lat + size/2],
          [lon - size/2, lat + size/2],
          [lon - size/2, lat - size/2]
        ];

        response = await fetch('/api/getByRegion', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            regionCoords,
            bands: formData.bands,
            startDate: formData.startDate,
            endDate: formData.endDate,
            type: formData.returnType
          })
        });
      }

      const data = await response.json();
      setResult(data);

    } catch (error) {
      setResult({
        success: false,
        type: 'ndvi',
        error: 'Network error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Earth Engine Vegetation Analysis</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Query Type */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Query Type</label>
            <select
              name="queryType"
              value={formData.queryType}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            >
              <option value="point">Point Query</option>
              <option value="region">Region Query</option>
            </select>
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Longitude</label>
              <input
                type="number"
                name="lon"
                value={formData.lon}
                onChange={handleInputChange}
                step="any"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="-122.292"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Latitude</label>
              <input
                type="number"
                name="lat"
                value={formData.lat}
                onChange={handleInputChange}
                step="any"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="37.901"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Region Size (meters)</label>
              <input
                type="number"
                name="regionSize"
                value={formData.regionSize}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="5000"
              />
            </div>
          </div>

          <p className="text-sm text-gray-700">
            Example: -122.292, 37.901, 5000 → San Francisco Bay Area, 5km region
          </p>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Start Date</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">End Date</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
            </div>
          </div>

          {/* Return Type */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Return Type</label>
            <select
              name="returnType"
              value={formData.returnType}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            >
              <option value="ndvi">NDVI Data</option>
              <option value="thumbnail">Thumbnail Image</option>
            </select>
          </div>

          {/* Band Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Bands {formData.returnType === 'thumbnail' ? '(for image)' : '(informational)'}
            </label>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {availableBands.map(band => (
                <label key={band} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.bands.includes(band)}
                    onChange={(e) => handleBandChange(band, e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-400 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="text-sm text-gray-900">{band}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processing...' : 'Query Earth Engine'}
          </button>
        </form>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Results</h3>
          
          {result.success ? (
            <div className="space-y-4">
              {result.type === 'ndvi' && result.data && (
                <div className="bg-green-100 p-4 rounded-md">
                  <h4 className="font-semibold text-green-900 mb-2">NDVI Analysis</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-900">
                    <div>
                      <strong>NDVI Value:</strong> {result.data.ndvi?.toFixed(4) || 'N/A'}
                    </div>
                    <div>
                      <strong>Coordinates:</strong> {result.data.coordinates?.lon?.toFixed(4)}, {result.data.coordinates?.lat?.toFixed(4)}
                    </div>
                    <div>
                      <strong>Region Size:</strong> {result.data.regionSize || 'N/A'}m
                    </div>
                    <div>
                      <strong>Timestamp:</strong> {new Date(result.data.timestamp).toLocaleString()}
                    </div>
                  </div>
                  {result.data.imageId && (
                    <div className="mt-2 text-xs text-gray-900">
                      <strong>Image ID:</strong> {result.data.imageId}
                    </div>
                  )}
                </div>
              )}
              
              {result.type === 'thumbnail' && result.thumbnailUrl && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-900">Satellite Image</h4>
                  <Image
                    src={result.thumbnailUrl}
                    alt="Satellite thumbnail"
                    width={512}
                    height={512}
                    className="max-w-full h-auto rounded-md border border-gray-300"
                    unoptimized
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="bg-red-100 p-4 rounded-md">
              <h4 className="font-semibold text-red-900 mb-2">Error</h4>
              <p className="text-red-800">{result.message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}