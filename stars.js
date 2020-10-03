//HTML
//<!-- <script src="https://cdnjs.cloudflare.com/ajax/libs/snap.svg/0.4.1/snap.svg.js"></script>-->

//JavaScript:
// Explore the space of pentagram-like stars.
//
// See also the Observable implementation at
//     https://observablehq.com/@perlmonger42/drawing-n-pointed-stars
// or the JSFiddle at
//     https://jsfiddle.net/perlmonger42/e84bqkhx/106/
//
// NOTATION
// ========
// STAR[n,s] names a pentagram-like star,
// constructed on the corners of a regular n-gon.
//
// Each line segment of the star connects a corner of the n-gon to the s-th
// successive corner (the point that is `s` steps clockwise around the corners
// of the n-gon).
//
// As an example, STAR[5,2] is a pentagram, which is constructed on the corners
// of a pentagon.
//
// When n and s are relatively prime, the line segments form a single polygon
// that visits all the corners of the star. (The polygon may be
// self-intersecting, as in the case of a pentagram, and might also be a
// polyline.)
//
// But sometimes it takes more than one polygon to cover all the corners. For
// example, STAR[6,2] is the Star of David, which is made up of two separate but
// overlapping equilateral triangles. Similarly, STAR[9,3] is a 9-pointed star
// made of 3 overlapping equilateral triangles.
//
//
// STAR[n,[s0,s1,...]] is a generalization, where the step size between corners
// is not the same every time. Instead, the first step is s0, then s1, etc.
// When the step sizes are exhausted, they are reused as many times as needed.
// STAR[n,[s]] is equivalent to STAR[n,s].

var snap = Snap(5000, 1200); // create an SVG canvas

// Return the list of points for the regular polygon with the given radius and
// number of sides, whose center is at (centerX, centerY). The polygon is
// oriented with first vertex on the positive Y axis, and subsequent vertices
// are in clockwise order.
//
// The returned value has structure like [[-1,0], [0,1], [1,0], [0,-1]]
function regularPolygonCorners(sides, centerX = 0, centerY = 0, radius = 100) {
  const startAngle = -Math.PI / 2;

  return [...Array(sides).keys()].map(d => {
    const radian = d * ((Math.PI * 2) / sides);
    const x = Math.cos(radian + startAngle) * radius;
    const y = Math.sin(radian + startAngle) * radius;
    return [x + centerX, y + centerY];
  });
}

// Return [start,
//         (start + step0) % size,
//         (start + step0 + step1) % size,
//         (start + step0 + step1 + step2) % size,
//         ...
//         (start + step0 + step1 + step2 + ... + step0) % size,
//         (start + step0 + step1 + step2 + ... + step0 + step1) % size,
//         ...].
// In other words, beginning at `start`, it takes consecutive steps around the
// polygon of different sizes, as indicated by the `steps` array. When the array
// has been exhausted, it goes back through the array again as many times as
// necessary.
//
// Returns a list up to but not including a duplicate line segment.
function cycle(start = 0, size = 5, steps = [1]) {
  const resultSequence = [];
  const edgesAlreadySeen = new Set();
  var prevCornerNumber = '?';
  var nextCornerNumber = start;
  var whichStep = 0;
  while (true) {
    var newEdgeName = `${prevCornerNumber} -> ${nextCornerNumber}`;
    if (edgesAlreadySeen.has(newEdgeName)) break;
    edgesAlreadySeen.add(newEdgeName);
    resultSequence.push(nextCornerNumber);

    prevCornerNumber = nextCornerNumber;
    nextCornerNumber = (prevCornerNumber + steps[whichStep]) % size;
    whichStep = (whichStep + 1) % steps.length;
  }
  return resultSequence;
} // cycle(0, 6, [2, 5])


// Return STAR[size,steps], as a list of list of corner numbers.
//
// Produces the index lists that abstractly describe STAR[size,steps].
// Each list of indices represents an abstract polygon -- abstract in the
// sense that, rather than being a list of points, it's a list of corner
// numbers.
//
// Example 1
// The star indices for the pentagram (a.k.a. STAR[5,2]) are [[0, 2, 4, 1, 3]].
// The top-level list contains only a single list, because the pentagram is a
// single polyline. The content of that list indicates that the polyline starts
// at corner #0, then visits corners #2, #4, #1 and #3 in order. The return to
// corner #0 is implicit.
//
// Example 2
// STAR[6,2], the Star of David, has indices [[0, 2, 4], [1, 3, 5]].
// There are two lists, each containing the vertex numbers of a triangle.
function starIndices(size, stepSizes) {
  const result = []
  const indices = [...Array(size).keys()];
  const visited = new Set(indices);
  do {
    // find 1st corner that hasn't been covered by a polyline
    cornerIndex = indices.find(i => visited.has(i));
    // generate a polyline starting at that corner
    poly = cycle(cornerIndex, size, stepSizes);
    // add the polyline to the output list
    result.push(poly);
    // remove that polyline's indices from the list of corners to cover
    poly.forEach(i => visited.delete(i))
  } while (visited.size > 0);
  return result;
} // starIndices(6, [2, 5])

// Return a canonical string describing the given indexLists.
//
// Any two indexLists that would result in the same line segments being drawn
// should return the same canonical string.
function uniqueKeyForIndexList(indexLists) {
  const starEdges = new Map();
  indexLists.forEach(function(indices) {
    var polyEdges = [...Array(indices.length - 1).keys()].map(i => indices.slice(i, i + 2));
    polyEdges.forEach(function(edge) {
      // put edge's indices in increasing order
      edge.sort((a, b) => a - b)
      starEdges.set(`${edge[0]},${edge[1]}`, edge)
    });
  });
  const sortedEdges = [...starEdges.values()].sort(
    (a, b) => a[0] == b[0] ? a[1] - b[1] : a[0] - b[0]
  );
  return sortedEdges.join('; ');
}

// Rotate the given star one step clockwise.
function rotateIndexLists(sides, indexLists) {
  return indexLists.map(indices => indices.map(i => (i + 1) % sides))
}

// Return a canonical string describing the given shape.
//
// Any two stars that are rotations of each other should return the same
// canonical string.
//
// This implementation just finds the minimum uniqueKeyForIndexList over all
// possible rotations.  Reflections of the same shape are not being detected,
// but I haven't spotted any reflection-duplicates in the output.
function uniqueKeyForShape(sides, indexLists) {
  var key = uniqueKeyForIndexList(indexLists);
  for (var i = 1; i < sides; i++) {
    indexLists = rotateIndexLists(sides, indexLists);
    var newKey = uniqueKeyForIndexList(indexLists);
    if (newKey < key) key = newKey;
  }
  return key;
}

// The stars are rendered on a square grid with this spacing.
const gridSize = 80;

// From https://clrs.cc -- "A nicer color palette for the web"
const colors = {
  aqua: '#7fdbff',
  blue: '#0074d9',
  lime: '#01ff70',
  navy: '#001f3f',
  teal: '#39cccc',
  olive: '#3d9970',
  green: '#2ecc40',
  red: '#ff4136',
  maroon: '#85144b',
  orange: '#ff851b',
  purple: '#b10dc9',
  yellow: '#ffdc00',
  fuchsia: '#f012be',
  gray: '#aaaaaa',
  white: '#ffffff',
  black: '#111111',
  silver: '#dddddd',
}

// Use these colors to draw the stars.
// Single-polygon stars are drawn in black. Multiple-polygon stars use different
// colors for the extra polys.
const polyColors = `black
           blue purple green red orange maroon navy olive
           yellow fuchsia gray aqua lime teal silver`.
split(/\s+/).map(c => colors[c]);

// Return an SVG representation of a star,
// drawn with the given radius and center location.
// The input star is in starIndices format (a list of lists of corner numbers).
function star(sides, starAsIndices, centerX = 0, centerY = 0, radius = (gridSize / 2) * 0.9) {
  const polygonCorners = regularPolygonCorners(sides, centerX, centerY, radius);
  const indexLists = starAsIndices;

  // Convert the lists of vertex numbers into lists of coordinates.
  // The result isn't [[[x0,y0], [x1,y1], [x2,y2], ...], ...].
  // Instead, it's [[x0,y0, x1,y1, x2,y2, ...], ...],
  // because snap.polygon wants a flat list of numbers, not nested coordinate pairs.
  const coordinateLists = indexLists.map(
    indices => indices.flatMap(i => polygonCorners[i])
  );

  // Convert the list of lists of coordinates into a list of SVG polygons.
  var c = 0;
  const polys = coordinateLists.map(
    coordinates => snap.polygon(coordinates).attr({
      fill: 'none',
      strokeWidth: 3,
      stroke: polyColors[c++],
      strokeLinejoin: "round"
    })
  );
  return snap.group(...polys);
} //star(6, [5, 3])


const d = 25; // label offset
var x, y;
y = -gridSize / 2;
for (var size = 3; size < 14; size++) {
  var starsSeenForThisSize = new Map();
  x = gridSize / 2;
  y += gridSize;
  for (var step = 1; step <= size / 2; step++) {
    const indexLists = starIndices(size, [step]);
    const starKey = uniqueKeyForShape(size, indexLists);
    if (!starsSeenForThisSize.has(starKey)) {
      starsSeenForThisSize.set(starKey, [step]);
      snap.group(star(size, indexLists, x, y), snap.text(x + d, y - d, step));
      x += gridSize;
    }
  }
  for (var step = 1; step < size; step++) {
    for (var step2 = 1; step2 < size; step2++) {
      const indexLists = starIndices(size, [step, step2]);
      const starKey = uniqueKeyForShape(size, indexLists);
      if (!starsSeenForThisSize.has(starKey)) {
        starsSeenForThisSize.set(starKey, [step]);
        snap.group(star(size, indexLists, x, y), snap.text(x + d, y - d, `${step},${step2}`));
        x += gridSize;
      }
    }
  }
  // for (var step = 1; step < size; step++) {
  //   for (var step2 = 1; step2 < size; step2++) {
  //     for (var step3 = 1; step3 < size; step3++) {
  //       const indexLists = starIndices(size, [step, step2, step3]);
  //       const starKey = uniqueKeyForShape(size, indexLists);
  //       if (!starsSeenForThisSize.has(starKey)) {
  //         starsSeenForThisSize.set(starKey, [step]);
  //         snap.group(star(size, indexLists, x, y), snap.text(x+d,y-d, `${step},${step2},${step3}`));
  //         x += gridSize;
  //       }
  //     }
  //   }
  // }
}
