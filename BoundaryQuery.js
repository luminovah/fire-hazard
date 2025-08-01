const geolib = require('geolib');

function createBoundingBox(lat1, lon1, lat2, lon2, widthFt = 300) {
    const widthM = widthFt * 0.3048;
    const halfWidth = widthM / 2;

    const point1 = { latitude: lat1, longitude: lon1 };
    const point2 = { latitude: lat2, longitude: lon2 };

    // Calculate bearing from point1 to point2
    const bearing = geolib.getRhumbLineBearing(point1, point2);

    // Perpendicular bearings
    const perp1 = (bearing + 90) % 360;
    const perp2 = (bearing + 270) % 360; // equivalent to -90 mod 360

    // Offset points
    const p1Left = geolib.computeDestinationPoint(point1, halfWidth, perp1);
    const p1Right = geolib.computeDestinationPoint(point1, halfWidth, perp2);
    const p2Left = geolib.computeDestinationPoint(point2, halfWidth, perp1);
    const p2Right = geolib.computeDestinationPoint(point2, halfWidth, perp2);

    // Return rectangle as array of coordinates (closed polygon)
    return [
        { lat: p1Left.latitude, lon: p1Left.longitude },
        { lat: p2Left.latitude, lon: p2Left.longitude },
        { lat: p2Right.latitude, lon: p2Right.longitude },
        { lat: p1Right.latitude, lon: p1Right.longitude },
        { lat: p1Left.latitude, lon: p1Left.longitude } // Close the polygon
    ];
}
