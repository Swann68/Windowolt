let landPolygons = null;
var myIcon = L.icon({
    iconUrl: 'boat.png',
});
var map = L.map('map').setView([0, 0], 8);
// Carte de base (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Couche marine (OpenSeaMap)
L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
    attribution: '© OpenSeaMap contributors',
    transparent: true
}).addTo(map);


let marker = L.marker([0, 0], { icon: myIcon }).addTo(map);
let aisMarkers = [];
let firstUpdate = true;
let coo = null
function refreshData() {
    fetch('/donnees')
        .then(res => res.json())
        .then(data => {
            let gps = data.gps;
            console.log(data.capt.temp)
            // Affichage des données GPS
            document.getElementById("lat").textContent = "Latitude : " + gps.lat.toFixed(5);
            document.getElementById("lon").textContent = "Longitude : " + gps.lon.toFixed(5);
            document.getElementById("vitesse").textContent = "Vitesse : " + gps.vitesse + " km/h";
            coo = [gps.lat.toFixed(5), gps.lon.toFixed(5)]
            // Météo
            document.getElementById("weather").innerHTML = `
                    <strong>Météo Marine :</strong><br>
                    <strong>Informations du jour:</strong><br>
                    Température actuelle : ${data.meteo.day_info.temp}°C<br>
                    Température maximale : ${data.meteo.day_info.tempMax}°C<br>
                    Température minimale : ${data.meteo.day_info.tempMin}°C<br>
                    Ressentie : ${data.meteo.day_info.feelsLike}°C<br>
                    Humidité : ${data.meteo.day_info.humidity}%<br>
                    Précipitations : ${data.meteo.day_info.precip} mm<br>
                    Vitesse du vent : ${data.meteo.day_info.windSpeed} km/h<br>
                    Direction du vent : ${data.meteo.day_info.windDir}°<br>
                    Pression : ${data.meteo.day_info.pressure} hPa<br>
                    Couverture nuageuse : ${data.meteo.day_info.cloudCover}%<br>
    
                    <strong>Informations de la dernière heure:</strong><br>
                    Température : ${data.meteo.last_hour_info.temp}°C<br>
                    Ressentie : ${data.meteo.last_hour_info.feelsLike}°C<br>
                    Humidité : ${data.meteo.last_hour_info.humidity}%<br>
                    Précipitations : ${data.meteo.last_hour_info.precip} mm<br>
                    Vitesse du vent : ${data.meteo.last_hour_info.windSpeed} km/h<br>
                    Direction du vent : ${data.meteo.last_hour_info.windDir}°<br>
                    Pression : ${data.meteo.last_hour_info.pressure} hPa<br>
                    Couverture nuageuse : ${data.meteo.last_hour_info.cloudCover}%
                `;
            document.getElementById("capt").innerHTML = `
                    <strong>Infos Capteurs</strong><br>
                    Température : ${data.capt.temp}°C
                    Ressentie : ${data.capt.feelsLike}°C
                    Humidité : ${data.capt.humidity}%
                    Précipitations : ${data.capt.precip} mm
                    Vitesse du vent : ${data.capt.windSpeed} km/h
                    Direction du vent : ${data.capt.windDir}°
                    Pression : ${data.capt.pressure} hPa
                    Couverture nuageuse : ${data.capt.cloudCover}%
                    Conditions : ${data.capt.conditions} 
                    Situation générale : ${data.capt.icon}
                `;
            // Centrage de la carte (1 seule fois)
            if (firstUpdate) {
                map.setView([gps.lat, gps.lon], 8);
                firstUpdate = false;
            }

            // Mise à jour de la position
            marker.setLatLng([gps.lat, gps.lon]);

            // Mise à jour des AIS
            aisMarkers.forEach(m => map.removeLayer(m));
            aisMarkers = data.ais.map(b =>
                L.circle([b.lat, b.lon], { radius: 50, color: 'red' }).addTo(map)
            );
        });
}
refreshData()
// Fonction pour mettre à jour une boussole donnée
function updateCompass(compassId, angle) {
    const compassLine = document.getElementById(compassId);

    // Générer la ligne de la boussole
    compassLine.innerHTML = '';
    for (let i = 0; i <= 360; i += 5) {
        const div = document.createElement('div');
        const angleText = i;
        if (angleText === 0) div.innerText = 'N';
        else if (angleText === 90) div.innerText = 'E';
        else if (angleText === 180) div.innerText = 'S';
        else if (angleText === 270) div.innerText = 'O';
        else if (angleText % 10 === 0) div.innerText = angleText;
        else div.innerText = angleText;

        div.className = `direction ${angleText === 0 || angleText === 90 || angleText === 180 || angleText === 270 ? 'cardinal' : (angleText % 5 === 0 ? 'round' : 'small')}`;
        compassLine.appendChild(div);
    }

    // Mettre à jour l'angle
    const stepWidth = 60;
    const pixelsPerDegree = stepWidth / 5;
    const correctedAngle = angle + 2.5;
    const totalShift = correctedAngle * pixelsPerDegree;
    compassLine.style.transform = `translateX(calc(50% - ${totalShift}px))`;
}

// Récupérer les angles depuis le backend Flask
function getAngles() {
    fetch('/angles')
        .then(response => response.json())
        .then(data => {
            updateCompass('bateau-line', data.bateau);
            updateCompass('vent-line', data.vent);
            updateCompass('voile-line', data.voile);
        })
        .catch(error => console.error('Erreur lors de la récupération des angles:', error));
}

// Mettre à jour les boussoles toutes les secondes
getAngles()

// Fonction pour vérifier si un point est en mer en utilisant l'API Geonames
function isInSea(lat, lng) {
    const point = turf.point([lng, lat]);

    for (const feature of landPolygons.features) {
        const landCoordinates = feature.geometry.coordinates;

        if (landCoordinates.length >= 1 && landCoordinates[0].length >= 4) {
            const landPolygon = turf.polygon(landCoordinates);

            if (turf.booleanPointInPolygon(point, landPolygon)) {
                return true; // The point is on sea
            }
            else return false;
        } else {
            console.warn('Skipping invalid land polygon with less than 4 coordinates.');
        }
    }
}


// Fonction pour vérifier si le trajet est en mer
function isRouteInSea(route) {
    const promises = route.map(point => isInSea(point.lat, point.lon));
    return Promise.all(promises).then(results => results.every(result => result === true));
}

// Fonction pour définir la destination
function setDestination() {
    destinationMarker = null;
    routeLine = null;
    const destination = [document.getElementById("latitude-input").value, document.getElementById("longitude-input").value];

    if (!destination) {
        alert("Veuillez entrer une destination.");
        return;
    }

    // Vérification si la destination est un port valide
    const port = isInSea(destination[0], destination[1]);

    if (port) {
        const destinationLat = destination[0];
        const destinationLon = destination[1];

        // Position actuelle (remplacez avec vos coordonnées actuelles)
        const currentLat = coo[0];
        const currentLon = coo[1];
        // Mettre à jour la carte pour centrer sur la position actuelle
        map.setView([currentLat, currentLon], 8);

        // Ajouter un marqueur pour la position actuelle
        if (marker) {
            map.removeLayer(marker);
        }
        marker = L.marker([currentLat, currentLon], { icon: myIcon }).addTo(map)
            .bindPopup("Votre position actuelle")
            .openPopup();

        // Ajouter un marqueur pour la destination
        if (destinationMarker) {
            map.removeLayer(destinationMarker);
        }
        destinationMarker = L.marker([destinationLat, destinationLon], { icon: myIcon }).addTo(map)
            .bindPopup(`Destination: ${destination}`)
            .openPopup();

        // Dessiner un itinéraire entre la position actuelle et la destination
        if (routeLine) {
            map.removeLayer(routeLine);
        }

        const route = [marker.getLatLng(), destinationMarker.getLatLng()];

        // Vérifier si le trajet est en mer
        isRouteInSea(route).then(isValid => {
            if (isValid) {
                routeLine = L.polyline(route, { color: 'green' }).addTo(map);
                document.getElementById("route-info").textContent = `Route vers ${destination}: ${currentLat.toFixed(4)}, ${currentLon.toFixed(4)} → ${destinationLat.toFixed(4)}, ${destinationLon.toFixed(4)}`;
            } else {
                alert("Le trajet passe par une zone terrestre. Essayez une autre destination.");
            }
        });
    } else {
        alert("La destination ne semble pas être un port maritime valide.");
    }
}
map.on('click', function (e) {
    const lat = e.latlng.lat;
    const lon = e.latlng.lng;
    alert(isInSea(lat, lon))
});
