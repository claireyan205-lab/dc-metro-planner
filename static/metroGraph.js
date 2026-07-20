const lines = {
  Red: [
    "A15","A14","A13","A12","A11","A10","A09","A08",
    "A07","A06","A05","A04","A03","A02","A01",
    "B01","B02","B03","B35","B04","B05","B06",
    "B07","B08","B09","B10","B11"
  ],
 
  Orange: [
    "K08","K07","K06","K05","K04","K03","K02","K01",
    "C05","C04","C03","C02","C01",
    "D01","D02","D03","D04","D05","D06","D07",
    "D08","D09","D10","D11","D12","D13"
  ],
 
  Blue: [
    "J03","J02","C13",
    "C12","C11","C10","C09","C08","C07","C06",
    "C05","C04","C03","C02","C01",
    "D01","D02","D03","D04","D05","D06","D07",
    "D08","G01","G02","G03","G04","G05"
  ],
 
  Green: [
    "F11","F10","F09","F08","F07","F06","F05","F04",
    "F03","F02","F01",
    "E01","E02","E03","E04","E05","E06",
    "E07","E08","E09","E10"
  ],
 
  Yellow: [
    "C15","C14","C13",
    "C12","C11","C10","C09","C08","C07",
    "F03","F02","F01",
    "E01","E02","E03","E04","E05","E06",
    "E07","E08","E09","E10"
  ],
 
  Silver: [
    "N12","N11","N10","N09","N08","N07","N06",
    "N04","N03","N02","N01",
    "K05","K04","K03","K02","K01",
    "C05","C04","C03","C02","C01",
    "D01","D02","D03","D04","D05","D06","D07",
    "D08","G01","G02","G03","G04","G05"
  ]
};

const STATION_NAMES = {
  A15: "Shady Grove", A14: "Rockville", A13: "Twinbrook", A12: "North Bethesda",
  A11: "Grosvenor-Strathmore", A10: "Medical Center", A09: "Bethesda",
  A08: "Friendship Heights", A07: "Tenleytown-AU", A06: "Van Ness-UDC",
  A05: "Cleveland Park", A04: "Woodley Park", A03: "Dupont Circle",
  A02: "Farragut North", A01: "Metro Center",
  B01: "Gallery Place-Chinatown", B02: "Judiciary Square", B03: "Union Station",
  B35: "NoMa-Gallaudet U", B04: "Rhode Island Ave-Brentwood", B05: "Brookland-CUA",
  B06: "Fort Totten", B07: "Takoma", B08: "Silver Spring", B09: "Forest Glen",
  B10: "Wheaton", B11: "Glenmont",
 
  K08: "Vienna", K07: "Dunn Loring", K06: "West Falls Church",
  K05: "East Falls Church", K04: "Ballston-MU", K03: "Virginia Square-GMU",
  K02: "Clarendon", K01: "Court House",
  C05: "Rosslyn", C04: "Foggy Bottom-GWU", C03: "Farragut West",
  C02: "McPherson Square", C01: "Metro Center",
  D01: "Federal Triangle", D02: "Smithsonian", D03: "L'Enfant Plaza",
  D04: "Federal Center SW", D05: "Capitol South", D06: "Eastern Market",
  D07: "Potomac Ave", D08: "Stadium-Armory", D09: "Minnesota Ave",
  D10: "Deanwood", D11: "Cheverly", D12: "Landover", D13: "New Carrollton",
 
  J03: "Franconia-Springfield", J02: "Van Dorn Street",
  C13: "King St-Old Town", C12: "Braddock Road",
  C11: "Ronald Reagan National Airport", C10: "Potomac Yard",
  C09: "Crystal City", C08: "Pentagon City", C07: "Pentagon",
  C06: "Arlington Cemetery",
  G01: "Benning Road", G02: "Capitol Heights", G03: "Addison Road-Seat Pleasant",
  G04: "Morgan Boulevard", G05: "Downtown Largo",
 
  F11: "Branch Ave", F10: "Suitland", F09: "Naylor Road", F08: "Southern Avenue",
  F07: "Congress Heights", F06: "Anacostia", F05: "Navy Yard-Ballpark",
  F04: "Waterfront", F03: "L'Enfant Plaza", F02: "Archives-Navy Memorial-Penn Quarter",
  F01: "Gallery Place-Chinatown",
  E01: "Mt Vernon Sq-7th St-Convention Center", E02: "Shaw-Howard University",
  E03: "U Street/African-Amer Civil War Memorial/Cardozo", E04: "Columbia Heights",
  E05: "Georgia Ave-Petworth", E06: "Fort Totten", E07: "West Hyattsville",
  E08: "Hyattsville Crossing", E09: "College Park-U of Md", E10: "Greenbelt",
 
  C15: "Huntington", C14: "Eisenhower Avenue",
 
  N12: "Ashburn", N11: "Loudoun Gateway",
  N10: "Washington Dulles International Airport", N09: "Innovation Center",
  N08: "Herndon", N07: "Reston Town Center", N06: "Wiehle-Reston East",
  N04: "Spring Hill", N03: "Greensboro", N02: "Tysons", N01: "McLean"
};

const nameOf = (code) => STATION_NAMES[code] || code;
 
const TRANSFERS = [
  ["A01", "C01"], // Metro Center (Red <-> Orange/Blue/Silver)
  ["B01", "F01"], // Gallery Place-Chinatown (Red <-> Green/Yellow)
  ["B06", "E06"], // Fort Totten (Red <-> Green/Yellow)
  ["D03", "F03"], // L'Enfant Plaza (Orange/Blue/Silver <-> Green/Yellow)
];

function buildGraph(lines) {
    const graph = new Map();

    const addNode = (name) => {
        if (!graph.has(name)) {
            graph.set(name, []);
        }
    };

    const addEdge = (a, b, line) => {
        addNode(a);
        addNode(b);

        graph.get(a).push({station: b, line});
        graph.get(b).push({station: a, line});
    };

    for (const [line, stations] of Object.entries(lines)) {
        for (let i = 0; i < stations.length; i++) {
            addNode(stations[i]);
            if (i > 0) {
                addEdge(stations[i-1], stations[i], line);
            }
        }
    } 

    return graph;
}

function addTransfers(graph, transfers) {
  for (const [a, b] of transfers) {
    if (!graph.has(a) || !graph.has(b)) {
      console.warn(`Transfer skipped, unknown code: ${a} or ${b}`);
      continue;
    }
    graph.get(a).push({ station: b, line: "Transfer" });
    graph.get(b).push({ station: a, line: "Transfer" });
  }
}

function bfs(graph, start, end) {
    if (!graph.has(start)) throw new Error(`Unknown station: "${start}"`);
    if (!graph.has(end)) throw new Error(`Unknown station: "${end}"`);
    if (start === end) return {path: [start], lines:[], stops: 0};

    const visited = new Set([start]);
    const queue = [start];
    const cameFrom = new Map();

    while (queue.length) {
        const curr = queue.shift();

        if (curr === end) {
            break;
        }

        for (const {station: neighbor, line} of graph.get(curr)) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                cameFrom.set(neighbor, {from: curr, line});
                queue.push(neighbor);
            }
        }
    }

    if (!cameFrom.has(end)) {
        return null;
    }

    const path = [end];
    const lines = [];
    let node = end;

    while (node !== start) {
        const {from, line} = cameFrom.get(node);
        path.push(from);
        lines.push(line);
        node = from;
    }

    path.reverse();
    lines.reverse();

    return {path, lines, stops: path.length - 1};
}

function format(result) {
  if (!result) {
    return 'No path found.';
  }

  let output = nameOf(result.path[0]);

  for (let i = 0; i < result.lines.length; i++) {
    output += `\n   │\n   │ ${result.lines[i]}\n   ▼\n`;
    output += nameOf(result.path[i + 1]);
  }

  output += `\n\n(${result.stops} stops)`;

  return output;
}

const graph = buildGraph(lines);
addTransfers(graph, TRANSFERS);