import { NextRequest, NextResponse } from 'next/server';
import { getVegetationIndexByRegion, generateThumbnailUrlByRegion } from '@/lib/earthEngine';
import { validateBands, validateDateRange, validateRegionCoordinates } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      regionCoords, 
      bands = ['RED', 'GREEN', 'BLUE'], 
      startDate = '2021-07-01', 
      endDate = '2021-07-15', 
      type = 'ndvi' 
    } = body;
    
    // Validate inputs
    validateRegionCoordinates(regionCoords);
    validateBands(bands);
    validateDateRange(startDate, endDate);
    
    if (type === 'thumbnail') {
      const thumbnailUrl = await generateThumbnailUrlByRegion(regionCoords, bands, startDate, endDate);
      
      return NextResponse.json({
        success: true,
        type: 'thumbnail',
        thumbnailUrl,
        parameters: { regionCoords, bands, startDate, endDate }
      });
    } else {
      const result = await getVegetationIndexByRegion(regionCoords, startDate, endDate);
      
      return NextResponse.json({
        success: true,
        type: 'ndvi',
        data: result,
        parameters: { regionCoords, bands, startDate, endDate }
      });
    }
    
  } catch (error) {
    console.error('getByRegion API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process request',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 400 }
    );
  }
}

// GET method for simple rectangle regions using query parameters
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    
    // Parse rectangle coordinates: minLon,minLat,maxLon,maxLat
    const rectParam = url.searchParams.get('rect');
    if (!rectParam) {
      return NextResponse.json(
        { success: false, error: 'Missing rect parameter', message: 'Provide rect as minLon,minLat,maxLon,maxLat' },
        { status: 400 }
      );
    }
    
    const rectCoords = rectParam.split(',').map(Number);
    if (rectCoords.length !== 4) {
      return NextResponse.json(
        { success: false, error: 'Invalid rect format', message: 'Rect must be minLon,minLat,maxLon,maxLat' },
        { status: 400 }
      );
    }
    
    const [minLon, minLat, maxLon, maxLat] = rectCoords;
    
    // Convert rectangle to polygon coordinates
    const regionCoords = [
      [minLon, minLat],
      [maxLon, minLat],
      [maxLon, maxLat],
      [minLon, maxLat],
      [minLon, minLat] // Close the polygon
    ];
    
    const bandsParam = url.searchParams.get('bands');
    const bands = bandsParam ? bandsParam.split(',').map(b => b.trim()) : ['RED', 'GREEN', 'BLUE'];
    const startDate = url.searchParams.get('startDate') || '2021-07-01';
    const endDate = url.searchParams.get('endDate') || '2021-07-15';
    const type = url.searchParams.get('type') || 'ndvi';
    
    // Validate inputs
    validateRegionCoordinates(regionCoords);
    validateBands(bands);
    validateDateRange(startDate, endDate);
    
    if (type === 'thumbnail') {
      const thumbnailUrl = await generateThumbnailUrlByRegion(regionCoords, bands, startDate, endDate);
      
      return NextResponse.json({
        success: true,
        type: 'thumbnail',
        thumbnailUrl,
        parameters: { regionCoords, bands, startDate, endDate }
      });
    } else {
      const result = await getVegetationIndexByRegion(regionCoords, startDate, endDate);
      
      return NextResponse.json({
        success: true,
        type: 'ndvi',
        data: result,
        parameters: { regionCoords, bands, startDate, endDate }
      });
    }
    
  } catch (error) {
    console.error('getByRegion API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process request',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 400 }
    );
  }
}