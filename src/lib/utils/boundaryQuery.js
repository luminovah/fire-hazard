import geolib from 'geolib';

function generatePairBoundingBoxes(coords) {
    const boxes = [];

    for (let i = 0; i < coords.length - 1; i++) {
        const p1 = coords[i];
        const p2 = coords[i + 1];

        const minLat = Math.min(p1.lat, p2.lat);
        const maxLat = Math.max(p1.lat, p2.lat);
        const minLon = Math.min(p1.lon, p2.lon);
        const maxLon = Math.max(p1.lon, p2.lon);

        boxes.push({ minLat, maxLat, minLon, maxLon });
    }

    return boxes;
}

function subdivideBoxInto100mCells(box) {
    const cellSizeM = 100;
    const points = [];

    let currentLat = box.minLat;

    while (currentLat < box.maxLat) {
        let currentLon = box.minLon;

        while (currentLon < box.maxLon) {
            const center = geolib.computeDestinationPoint(
                geolib.computeDestinationPoint(
                    { latitude: currentLat, longitude: currentLon },
                    cellSizeM / 2,
                    0 // north
                ),
                cellSizeM / 2,
                90 // east
            );

            points.push({ lat: center.latitude, lon: center.longitude });

            // Move east by 1 meter
            const nextLonPoint = geolib.computeDestinationPoint(
                { latitude: currentLat, longitude: currentLon },
                cellSizeM,
                90
            );
            currentLon = nextLonPoint.longitude;
        }

        // Move north by 1 meter
        const nextLatPoint = geolib.computeDestinationPoint(
            { latitude: currentLat, longitude: box.minLon },
            cellSizeM,
            0
        );
        currentLat = nextLatPoint.latitude;
    }

    return points;
}

function generateSubdividedGrid(coords) {
    const boxes = generatePairBoundingBoxes(coords);
    const grid = boxes.map(box => subdivideBoxInto100mCells(box));
    return grid;
}

export { generateSubdividedGrid };