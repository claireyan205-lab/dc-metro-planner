const button1 = document.getElementById("searchButton");
const button2 = document.getElementById("findButton");
const results = document.getElementById("results");

const stInput = document.getElementById("stInput");
const stList = document.getElementById("stations");

const startInput = document.getElementById("startInput");
const endInput = document.getElementById("endInput");

const routeTab = document.getElementById("routeTab");
const fareTab = document.getElementById("fareTab");

const pathContent = document.getElementById("pathContent");
const fareContent = document.getElementById("fareContent");

const welcomeText = document.getElementById("welcomeText");
const loginLink = document.getElementById("loginLink");
const signupLink = document.getElementById("signupLink");
const logoutButton = document.getElementById("logoutButton");
const saveTripButton = document.getElementById("saveTripButton");
const savedTrips = document.getElementById("savedTrips");
const favStations = document.getElementById("favStations");

let stations = [];
let selectingStart = true; 
let startButton = null;
let endButton = null;
let arrivalButton = null;
let currentPage = "trip";
let arrivalsTimer = null;

loadStations();

button1.onclick = function () {
    getTrains;
    startArrivalsRefresh();
}

stInput.onchange = getTrains;

button2.onclick = getTripInfo;

stInput.onclick = function () {
    stInput.value = "";
};

startInput.onclick = function () {
    startInput.value = "";
};

endInput.onclick = function () {
    endInput.value = "";
};

async function getTrains() {
    const station = stInput.dataset.codes || getStationCode(stInput);

    if (!station) {
        results.innerHTML = "Please choose a valid station.";
        return;
    }

    stInput.dataset.codes = station;

    favoriteStationButton.style.display = "inline-block";

    results.innerHTML = "Loading...";

    try {
        const response = await fetch(`/arrivals/${station}`);

        if (!response.ok) {
            results.innerHTML = "Could not load train arrivals.";
            return;
        }

        const data = await response.json();

        results.innerHTML = "";

        if (data.Trains.length === 0) {
            results.innerHTML = "No trains available for this line";
            return;
        }

        const destinations = {};

        data.Trains.forEach(train => {
            const key = `${train.DestinationName}-${train.Line}`;

            if (!destinations[key]) {
                destinations[key] = {
                    name: train.DestinationName,
                    line: train.Line,
                    times: []
                };
            }
            destinations[key].times.push(train.Min);   
        });

        for (const key in destinations) {
            const destination = destinations[key];
            
            const section = document.createElement("div");
            section.className = "arrival-card";

            const times = destination.times
                .map(time => {
                    if (time === "ARR") return "Arriving";
                    if (time === "BRD") return "Boarding";
                    return `${time} min`;
                })
                .join(", ");

            section.innerHTML = `
                <div class="arrival-heading">
                    <span class="line-circle line-${destination.line}"></span>
                    <h3>${destination.name}</h3>
                </div>

                <p>${times}</p>
            `;

            results.appendChild(section);
        }
    } catch (error) {
        console.error(error);
        results.innerHTML = "Could not connect to the server.";
    }

    console.log("getTrains ran at", new Date().toLocaleTimeString());
}

async function loadStations() {
    const response = await fetch("/stations");

    if (!response.ok) {
        console.error("Could not load stations");
        return;
    }

    const data = await response.json();

    stations = data.Stations;

    console.log("Stations loaded:", stations.length);

    stList.innerHTML = "";

    stations.forEach(station => {
        const option = document.createElement("option");
        option.value = station.Name;
        stList.appendChild(option);
    });
}

function getStationCode(inp) {
    const selected = inp.value;
    const matches = stations.filter(s => s.Name === selected);

    if (matches.length === 0) {
        results.innerHTML = "Please choose a valid station";
        return null;
    }

    return matches.map(s => s.Code).join(",");
}

function getSingleCode(inp) {
    const selected = inp.value;
    const station = stations.find(s => s.Name === selected);

    if (!station) {
        pathContent.innerHTML = "Please choose a valid station.";
        return null;
    }

    return station.Code;
}

async function getFare(startCode, endCode) {
    try {
        const response = await fetch(`/fare/${startCode}/${endCode}`);

        if (!response.ok) {
            console.error("Fare request failed:", response.status);
            return null;
        }

        return await response.json();
    } catch(error) {
        console.error("Could not load fare:", error);
        return null;
    }
}

function highlightPath(route) {
    if (!route) return;

    route.path.forEach(code => {
        document.querySelectorAll(".map-station").forEach(button => {
            const codes = button.dataset.codes.split(",");

            if (codes.includes(code)) {
                button.classList.add("path-selected");
            }
        });
    });
}

async function getTripInfo() {

    const startCode = startInput.dataset.code || getSingleCode(startInput);
    const endCode = endInput.dataset.code || getSingleCode(endInput);

    if (startCode === null || endCode === null) {
        return;
    }

    const fare = await getFare(startCode, endCode);
    const path = bfs(graph, startCode, endCode);

    if (!path) {
        saveTripButton.style.display = "none";
        return;
    }

    saveTripButton.style.display = "inline-block";

    highlightPath(path);

    let fareText = "Not Available";

    if (
        fare.StationToStationInfos &&
        fare.StationToStationInfos[0] &&
        fare.StationToStationInfos[0].RailFare
    ) {
        fareText1 = "$" + fare.StationToStationInfos[0].RailFare.PeakTime;
        fareText2 = "$" + fare.StationToStationInfos[0].RailFare.OffPeakTime;
        fareText3 = "$" + fare.StationToStationInfos[0].RailFare.SeniorDisabled;
    }

    pathContent.innerHTML = `
    <h2>Route</h2>
    <pre>${format(path)}</pre>`;

    fareContent.innerHTML = `
    <h2>Fare</h2>
    <p>Peak Fare: ${fareText1}</p>
    <p>Off-Peak Fare: ${fareText2}</p>
    <p>Senior/Disabled Fare: ${fareText3}</p>`;
}

const arrTab = document.getElementById("arrivals");
const pathTab = document.getElementById("path");

const arrSec = document.getElementById("arrivalsSec");
const pathSec = document.getElementById("pathSec");

arrTab.onclick = function() {
    arrSec.style.display = "block";
    pathSec.style.display = "none";
};

pathTab.onclick = function() {
    arrSec.style.display = "none";
    pathSec.style.display = "block";
};

const mapStations = document.querySelectorAll(".map-station");

mapStations.forEach(button => {
    button.onclick = function() {
        if (currentPage === 'arrivals') {
            if (arrivalButton) {
                arrivalButton.classList.remove("arrival-selected");
            }

            button.classList.add("arrival-selected");
            arrivalButton = button;

            stInput.value = button.dataset.name;
            stInput.dataset.codes = button.dataset.codes;

            getTrains();
            startArrivalsRefresh();

            return;
        }

        const name = button.dataset.name;
        const codes = button.dataset.codes;

        if (selectingStart) {
            document.querySelectorAll(".map-station").forEach(button => {
                button.classList.remove("path-selected");
            });

            if (startButton) {
                startButton.classList.remove("start-selected");
            }
            
            button.classList.add("start-selected");
            startButton = button;

            startInput.value = name;
            startInput.dataset.codes = codes;

            selectingStart = false;
        } else { 
            if (endButton) {
                endButton.classList.remove("end-selected");
            }
            
            button.classList.add("end-selected");
            endButton = button;

            endInput.value = name;
            endInput.dataset.codes = codes;

            selectingStart = true;
        }
    };
});

stInput.addEventListener("input", () => {
    if (arrivalButton) {
        arrivalButton.classList.remove("arrival-selected");
        arrivalButton = null;
    }
});

routeTab.addEventListener("click", function () {
    console.log("route clicked");

    pathContent.style.display = "block";
    fareContent.style.display = "none";
});

fareTab.addEventListener("click", function () {
    console.log("fare clicked");

    fareContent.style.display = "block";
    pathContent.style.display = "none";
});

arrivals.onclick = async function () {
    currentPage = "arrivals";

    arrivalsSec.style.display = "block";
    pathSec.style.display = "none";

    document.querySelectorAll(".map-station").forEach(button => {
        button.classList.remove(
            "start-selected",
            "end-selected",
            "path-selected",
            "arrival-selected"
        );
    });

    startButton = null;
    endButton = null;
    arrivalButton = null;

    startInput.value = "";
    endInput.value = "";

    await loadFavoriteStations();
};

path.onclick = async function () {
    currentPage = "trip";

    arrivalsSec.style.display = "none";
    pathSec.style.display = "block";

    if (arrivalButton) {
        arrivalButton.classList.remove("arrival-selected");
        arrivalButton = null;
    }

    stInput.value = "";

    clearInterval(arrivalsTimer);
    arrivalsTimer = null;

    await loadSavedTrips();
};

async function updateArrivals() {
    if (currentPage !== "arrivals") return;

    if (!stInput.dataset.code) return;

    await getTrainInfo();
}

function startArrivalsRefresh() {
    clearInterval(arrivalsTimer);

    arrivalsTimer = setInterval(() => {
        console.log("refreshing arrivals");
        getTrains();
    }, 15000);
}

async function loadCurrUser() {
    try {
        const response = await fetch("/current-user");
        const user = await response.json();

        if (user.logged_in) {
            console.log("Logged in as:", user.username);

            welcomeText.textContent = `Welcome, ${user.username}`;

            loginLink.style.display = "none";
            signupLink.style.display = "none";
            logoutButton.style.display = "inline-block";
        }

        else {
            console.log("Not logged in");

            welcomeText.textContent = "";

            loginLink.style.display = "inline";
            signupLink.style.display = "inline";
            logoutButton.style.display = "none";
        }
    } catch (error) {
        console.error("Could not load current user:", error);
    }
}

if (logoutButton) {
    logoutButton.onclick = async function () {
        try {
            const response = await fetch("/logout", {
                method: "POST"
            });

            const result = await response.json();

            console.log("Logout status:", response.status);
            console.log(result);

            if (response.ok) {
                window.location.href = "/login-page";
            } else {
                alert(result.message || "Logout failed.");
            }

        } catch (error) {
            console.error("Actual logout error:", error);
            alert("Could not connect to the Flask server.");
        }
    };
}

loadCurrUser();

async function saveCurrTrip() {
    const startStation = startInput.dataset.codes;
    const endStation = endInput.dataset.codes; 

    console.log("Saving:", startStation, endStation);

    if (!startStation || !endStation) {
        alert("Choose a start and end station first.");
        return;
    }

    const response = await fetch("/save-trip", {
        method: "POST", 
        headers: {
            "Content-Type": "application/json"
        }, 
        body: JSON.stringify({
            start_station: startStation,
            end_station: endStation,
            start_name: startInput.value,
            end_name: endInput.value
        })
    });

    const result = await response.json();

    if (response.status === 401) {
        window.location.href = "/login-page";
        return;
    }

    alert(result.message);

    if (response.ok) {
        loadSavedTrips();
    }
}

saveTripButton.onclick = saveCurrTrip;

async function loadSavedTrips() {
    const response = await fetch("/saved-trips");

    if (response.status === 401) {
        savedTrips.innerHTML =
            '<p><a href="/login-page">Log in</a> to view saved trips.</p>';
        return;
    }
    
    if (!response.ok) {
        console.error("Could not load saved trips:", response.status);
        savedTrips.innerHTML = "<p>Could not load saved trips.</p>";
        return;
    }

    const trips = await response.json();

    savedTrips.innerHTML = "";

    if (trips.length === 0) {
        savedTrips.innerHTML = "<p>No saved trips yet.</p>";
        return;
    }

    trips.forEach(trip => {
        const card = document.createElement("div");
        card.className = "saved-trip-card";

         const startDisplay = trip.start_name || trip.start_station;
        const endDisplay = trip.end_name || trip.end_station;

        card.innerHTML = `
            <strong>${trip.start_name} → ${trip.end_name}</strong>
            <p>Saved: ${trip.created_at}</p>

            <button type="button" class="use-trip-button">Use Trip</button>

            <button type="button" class="delete-trip-button">Delete</button>
        `;

        const useButton = card.querySelector(".use-trip-button");
        const deleteButton = card.querySelector(".delete-trip-button");

        useButton.onclick = async function () {
            startInput.dataset.codes = trip.start_station;
            endInput.dataset.codes = trip.end_station;

            startInput.value = trip.start_name;
            endInput.value = trip.end_name;

            await getTripInfo();
        };

        deleteButton.onclick = async function () {
            const confirmed = confirm(
                `Delete ${startDisplay} → ${endDisplay}?`
            );

            if (!confirmed) {
                return;
            }

            const response = await fetch(`/saved-trips/${trip.id}`, {
                method: "DELETE"
            });

            const result = await response.json();

            if (!response.ok) {
                alert(result.message || "Could not delete trip.");
                return;
            }

            await loadSavedTrips();
        };
        savedTrips.appendChild(card);
    });
}

startInput.addEventListener("input", () => {
    saveTripButton.style.display = "none";
});

endInput.addEventListener("input", () => {
    saveTripButton.style.display = "none";
});

async function saveFavoriteStation() {

    const stationCode = stInput.dataset.codes;
    const stationName = stInput.value;

    if (!stationCode) {
        alert("Choose a station first.");
        return;
    }

    const response = await fetch("/favorite-station", {
        method: "POST",
        headers: {
            "Content-Type":"application/json"
        },
        body: JSON.stringify({
            station_code: stationCode,
            station_name: stationName
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(errorText);
        alert("Could not save favorite station.");
        return;
    }   

    const result = await response.json();

    alert(result.message);

    if(response.ok){
        await loadFavoriteStations();
    }
}

favoriteStationButton.onclick = saveFavoriteStation;

async function loadFavoriteStations() {

    const response = await fetch("/favorite-stations");

    if (response.status === 401) {
        favStations.innerHTML = `
            <p>
                <a href="/login-page">Log in</a> to save and view your favorite stations.
            </p>
        `;
        return;
    }

    if (!response.ok) {
        favStations.innerHTML = "<p>Could not load favorite stations.</p>";
        return;
    }

    const stations = await response.json();

    favStations.innerHTML = "";

    if (stations.length === 0) {
        favStations.innerHTML = "<p>No favorite stations yet.</p>";
        return;
    }

    stations.forEach(station=>{

        const card = document.createElement("div");
        card.className = "favorite-station-card";

        card.innerHTML = `
            <strong>${station.station_name}</strong>

            <button class="favorite-use">View Arrivals</button>

            <button class="favorite-delete">Delete</button>
        `;

        const useButton = card.querySelector(".favorite-use");
        const deleteButton = card.querySelector(".favorite-delete");

        useButton.onclick = async function(){

            stInput.value = station.station_name;
            stInput.dataset.codes = station.station_code;

            await getTrains();
        };

        deleteButton.onclick = async function () {

            const confirmed = confirm(
                `Delete ${station.station_name} from favorites?`
            );

            if (!confirmed) {
                return;
            }

            const response = await fetch(
                `/favorite-stations/${station.id}`,
                {
                    method: "DELETE"
                }
            );

            const result = await response.json();

            if (!response.ok) {
                alert(result.message);
                return;
            }

            alert(result.message);

            await loadFavoriteStations();
        };

        favStations.appendChild(card);
    });
}

stInput.addEventListener("input", () => {
    favoriteStationButton.style.display = "none";
});

async function initializeApp() {
    await loadStations();
    await loadCurrUser();
}

initializeApp();