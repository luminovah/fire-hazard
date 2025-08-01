# Earth Engine Next.js Setup Guide

This Next.js application provides a web interface for querying Google Earth Engine satellite data to analyze vegetation indices (NDVI) and generate thumbnail images.

## Prerequisites

1. **Google Earth Engine Service Account**
   - Create a Google Cloud Project
   - Enable the Earth Engine API
   - Create a service account with Earth Engine permissions
   - Download the service account JSON key file

2. **Node.js** (version 18 or later)

## Local Development Setup

1. **Clone and Install Dependencies**
   ```bash
   cd earth-engine-nextjs
   npm install
   ```

2. **Environment Variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and set `EARTH_ENGINE_SERVICE_ACCOUNT_KEY` to your service account JSON (as a single line string).

3. **Start Development Server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Endpoints

### Authentication Test
- **GET** `/api/auth` - Test Earth Engine authentication

### Point Queries
- **GET** `/api/getByPoint?lon=-122.292&lat=37.901&regionSize=5000&bands=RED,GREEN,BLUE&type=ndvi`
- **POST** `/api/getByPoint` - JSON body with lon, lat, regionSize, bands, startDate, endDate, type

### Region Queries
- **GET** `/api/getByRegion?rect=-122.3,37.8,-122.2,37.9&bands=RED,GREEN,BLUE&type=thumbnail`
- **POST** `/api/getByRegion` - JSON body with regionCoords (polygon), bands, startDate, endDate, type

## Parameters

### Coordinates
- `lon`: Longitude (-180 to 180)
- `lat`: Latitude (-90 to 90)
- `regionSize`: Buffer size in meters (for point queries)
- `regionCoords`: Array of [lon, lat] coordinate pairs (for region queries)
- `rect`: Rectangle as "minLon,minLat,maxLon,maxLat" (for region queries via GET)

### Bands
User-friendly names that map to Sentinel-2 bands:
- `RED` → B4
- `GREEN` → B3  
- `BLUE` → B2
- `NIR` → B8
- `SWIR1` → B11
- `SWIR2` → B12
- `RE1` → B5
- `RE2` → B6
- `RE3` → B7

### Date Range
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)
- Maximum range: 365 days

### Return Types
- `ndvi`: Returns vegetation index analysis
- `thumbnail`: Returns satellite image URL

## Deployment to Vercel

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/earth-engine-nextjs.git
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Connect your GitHub repository to Vercel
   - Add environment variable: `EARTH_ENGINE_SERVICE_ACCOUNT_KEY`
   - Set the value to your service account JSON (single line)
   - Deploy

3. **Environment Variables in Vercel**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add `EARTH_ENGINE_SERVICE_ACCOUNT_KEY`
   - Paste your service account JSON as one line (escape quotes)

## Example Usage

### Test Authentication
```bash
curl https://your-app.vercel.app/api/auth
```

### Get NDVI for San Francisco
```bash
curl "https://your-app.vercel.app/api/getByPoint?lon=-122.292&lat=37.901&regionSize=5000&type=ndvi"
```

### Get Thumbnail Image
```bash
curl "https://your-app.vercel.app/api/getByPoint?lon=-122.292&lat=37.901&regionSize=5000&bands=RED,GREEN,BLUE&type=thumbnail"
```

### Region Query
```bash
curl -X POST https://your-app.vercel.app/api/getByRegion \
  -H "Content-Type: application/json" \
  -d '{
    "regionCoords": [[-122.3, 37.8], [-122.2, 37.8], [-122.2, 37.9], [-122.3, 37.9], [-122.3, 37.8]],
    "bands": ["RED", "GREEN", "BLUE"],
    "type": "thumbnail"
  }'
```

## Troubleshooting

### Authentication Errors
- Verify service account JSON is properly formatted
- Ensure Earth Engine API is enabled in Google Cloud
- Check service account has Earth Engine permissions

### Missing Dependencies
- Run `npm install` to ensure all packages are installed
- Check Node.js version (requires 18+)

### CORS Issues
- API routes should work from the same domain
- For external requests, consider adding CORS headers

## Development Notes

- Service account authentication avoids browser OAuth flows
- Image thumbnails are generated server-side by Earth Engine
- NDVI calculations use standard (NIR - RED) / (NIR + RED) formula
- Validation ensures coordinates and parameters are within valid ranges