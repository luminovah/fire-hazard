import { NextResponse } from 'next/server';
import { initializeEarthEngine } from '@/lib/earthEngine';

export async function GET() {
  try {
    await initializeEarthEngine();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Earth Engine authentication successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Authentication failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Authentication failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET(); // Same logic for both GET and POST
}