declare module '@google/earthengine' {
  export interface Geometry {
    Point(lon: number, lat: number): Geometry;
    Polygon(coords: number[][]): Geometry;
    buffer(distance: number): Geometry;
    bounds(): Geometry;
    centroid(): {
      coordinates(): {
        getInfo(callback: (coords: number[], err?: any) => void): void;
      };
    };
  }

  export interface Image {
    id?: string;
    normalizedDifference(bands: string[]): Image;
    rename(name: string): Image;
    select(bands: string[]): Image;
    reduceRegion(options: {
      reducer: any;
      geometry: Geometry;
      scale: number;
      maxPixels: number;
    }): {
      getInfo(callback: (info: any, err?: any) => void): void;
    };
    getInfo(callback: (info: any, err?: any) => void): void;
    getThumbURL(options: {
      region: Geometry;
      dimensions: number;
      format: string;
    }, callback: (url: string, err?: any) => void): void;
  }

  export interface ImageCollection {
    filterBounds(geometry: Geometry): ImageCollection;
    filterDate(start: string, end: string): ImageCollection;
    sort(property: string): ImageCollection;
    limit(max: number): ImageCollection;
    first(): Image;
  }

  export interface Reducer {
    mean(): any;
  }

  export interface EE {
    data: {
      authenticateViaPrivateKey(
        privateKey: any,
        callback: (err?: any) => void
      ): void;
    };
    initialize(
      opt_baseurl?: any,
      opt_tileurl?: any,
      success?: () => void,
      error?: (err: any) => void
    ): void;
    Geometry: {
      Point(lon: number, lat: number): Geometry;
      Polygon(coords: number[][]): Geometry;
    };
    Image(id: string): Image;
    ImageCollection(id: string): ImageCollection;
    Reducer: Reducer;
  }

  const ee: EE;
  export default ee;
}