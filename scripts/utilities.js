function forEach(points, callback) {
    for(var index = 0; index < points.length; index++) {
        callback(points[index]);
    }
}