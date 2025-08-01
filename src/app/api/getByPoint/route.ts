import { NextRequest, NextResponse } from 'next/server';
import { getVegetationIndexByPoint, generateThumbnailUrl } from '@/lib/earthEngine';
import { validateCoordinates, validateRegionSize, validateBands, validateDateRange, parseQueryParams } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const { lon, lat, regionSize, bands, startDate, endDate } = parseQueryParams(new URL(request.url));
    
    // Validate inputs
    validateCoordinates(lon, lat);
    validateRegionSize(regionSize);
    validateBands(bands);
    validateDateRange(startDate, endDate);
    
    const returnType = new URL(request.url).searchParams.get('type') || 'ndvi';
    
    if (returnType === 'thumbnail') {
      const thumbnailUrl = await generateThumbnailUrl(lon, lat, regionSize, bands, startDate, endDate);
      
      return NextResponse.json({
        success: true,
        type: 'thumbnail',
        thumbnailUrl,
        parameters: { lon, lat, regionSize, bands, startDate, endDate }
      });
    } else {
      const result = await getVegetationIndexByPoint(lon, lat, regionSize, startDate, endDate);
      
      return NextResponse.json({
        success: true,
        type: 'ndvi',
        data: result,
        parameters: { lon, lat, regionSize, bands, startDate, endDate }
      });
    }
    
  } catch (error) {
    console.error('getByPoint API error:', error);
    
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lon, lat, regionSize = 5000, bands = ['RED', 'GREEN', 'BLUE'], startDate = '2021-07-01', endDate = '2021-07-15', type = 'ndvi' } = body;
    
    // Validate inputs
    validateCoordinates(lon, lat);
    validateRegionSize(regionSize);
    validateBands(bands);
    validateDateRange(startDate, endDate);
    
    if (type === 'thumbnail') {
      const thumbnailUrl = await generateThumbnailUrl(lon, lat, regionSize, bands, startDate, endDate);
      
      return NextResponse.json({
        success: true,
        type: 'thumbnail',
        thumbnailUrl,
        parameters: { lon, lat, regionSize, bands, startDate, endDate }
      });
    } else {
      const result = await getVegetationIndexByPoint(lon, lat, regionSize, startDate, endDate);
      
      return NextResponse.json({
        success: true,
        type: 'ndvi',
        data: result,
        parameters: { lon, lat, regionSize, bands, startDate, endDate }
      });
    }
    
  } catch (error) {
    console.error('getByPoint API error:', error);
    
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