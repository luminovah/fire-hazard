export enum SentinelBands {
  RED = "B4",
  GREEN = "B3", 
  BLUE = "B2",
  NIR = "B8",
  SWIR1 = "B11",
  SWIR2 = "B12",
  RE1 = "B5",
  RE2 = "B6",
  RE3 = "B7"
}

export interface VegetationIndexResult {
  ndvi: number;
  coordinates: {
    lon: number;
    lat: number;
  };
  regionSize?: number;
  timestamp: string;
  imageId?: string;
}

export interface ApiError {
  error: string;
  message: string;
}

export interface QueryParams {
  lon: number;
  lat: number;
  regionSize?: number;
  bands?: string[];
  startDate?: string;
  endDate?: string;
}