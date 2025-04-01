import './style.css';
import favorite from './assets/favorite.svg';
import favorited from './assets/favorited.svg';
import cloud from './assets/rain_cloud.gif';

const form = document.querySelector('form');
const search = document.getElementById('searchQuery');
const result = document.getElementById('result');
const resultContainer = document.querySelector('.result');
const heading = document.getElementById('heading');
const resultHeading = document.querySelector('.result-heading');

async function getCoordinates (place) {
    const query = encodeURIComponent(place);
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=geojson`;
    try {
        const res = await fetch(url);
        const data = await res.json();

        localStorage.setItem('currentSearch', JSON.stringify(data));

        return convertToGeocode(data.features[0].geometry.coordinates);

    }
    catch (error) {
        console.log(error)
    }
  }

function convertToGeocode (array) {
    const [long, lat] = array;
    return {long, lat};
}

async function fetchWeather(long, lat) {
    const query = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${long}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&forecast_days=7&timezone=auto&temperature_unit=fahrenheit`;
    try {
        const res = await fetch(query);
        const data = await res.json();
        displayWeather(data);
    }
    catch (error) {
        console.log(error)
    }
}

function displayWeather(data) {
    const daily = data.daily;
    const favoriteImg = document.createElement('img');
    const search = JSON.parse(localStorage.getItem('currentSearch'));
    const placeName = search.features[0].properties.display_name;
    const heading = document.createElement('h1');
    
    if (checkFavorites(placeName)) {
        favoriteImg.setAttribute('src', favorited);
    } else {
        favoriteImg.setAttribute('src', favorite);
    }

    heading.textContent = search.features[0].properties.display_name;
    resultHeading.append(heading);
    resultHeading.prepend(favoriteImg);
    
    
   
    const weatherCodeMap = {
        0: { label: "Clear sky", icon: "☀️" },
        1: { label: "Mainly clear", icon: "🌤️" },
        2: { label: "Partly cloudy", icon: "⛅" },
        3: { label: "Overcast", icon: "☁️" },
        45: { label: "Fog", icon: "🌫️" },
        48: { label: "Depositing rime fog", icon: "🌫️" },
        51: { label: "Light drizzle", icon: "🌦️" },
        53: { label: "Moderate drizzle", icon: "🌧️" },
        55: { label: "Dense drizzle", icon: "🌧️" },
        61: { label: "Slight rain", icon: "🌦️" },
        63: { label: "Moderate rain", icon: "🌧️" },
        65: { label: "Heavy rain", icon: "🌧️" },
        71: { label: "Slight snow", icon: "🌨️" },
        73: { label: "Moderate snow", icon: "🌨️" },
        75: { label: "Heavy snow", icon: "❄️" },
        77: { label: "Snow grains", icon: "🌨️" },
        80: { label: "Rain showers", icon: "🌦️" },
        81: { label: "Moderate rain showers", icon: "🌧️" },
        82: { label: "Violent rain showers", icon: "🌩️" },
        85: { label: "Slight snow showers", icon: "🌨️" },
        86: { label: "Heavy snow showers", icon: "❄️" },
        95: { label: "Thunderstorm", icon: "⛈️" },
        96: { label: "Thunderstorm with slight hail", icon: "🌩️" },
        99: { label: "Thunderstorm with heavy hail", icon: "🌩️" },
      };

    for (let i=0; i < daily.time.length; i++) {
        const day = {
            day:  daily.time[i],
            high: daily.temperature_2m_max[i],
            low: daily.temperature_2m_min[i],
            precip: (daily.precipitation_sum[i]/25.4), //mm -> inches
            weathercode: daily.weathercode[i]
        }

            const codeInfo = weatherCodeMap[day.weathercode] || { label: "Unknown", icon: "❓" };
          
            const card = document.createElement("div");
            card.className = "result-item";
          
            card.innerHTML = `
              <h3>${new Date(`${day.day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</h3>
              <div class="weather-icon">${codeInfo.icon}</div>
              <p class="weather-label">${codeInfo.label}</p>
              <p><strong>High:</strong> ${Math.round(day.high)}°F</p>
              <p><strong>Low:</strong> ${Math.round(day.low)}°F</p>
              <p><strong>Precipitation:</strong> ${day.precip > 0 ? (day.precip).toFixed(2) + "in" : "None"}</p>
            `;
          
            result.append(card);
    }

    favoriteImg.addEventListener('click', () => {
        if (checkFavorites(placeName)) {
            favoriteImg.setAttribute('src', favorite);
            removeFavorite(placeName);    
            return;
        }

        favoriteImg.setAttribute('src', favorited);
        

        const storage = JSON.parse(localStorage.getItem('favorites'));

        if (!storage) {
            localStorage.setItem('favorites', JSON.stringify([{name: search.features[0].properties.name, display: search.features[0].properties.display_name}]));
            return;
        } 
        
        if (storage.length > 4) {
            console.log('You can have up to five favorites!');
        }
        else {
            storage.push({name: search.features[0].properties.name, display: search.features[0].properties.display_name});
            localStorage.setItem('favorites', JSON.stringify(storage))
            displayFavorites();
        }
    })

}

function removeFavorite (displayName) {
    const storage = JSON.parse(localStorage.getItem('favorites'));
    if (!storage) return;

    const index = storage.findIndex(item => item.display === displayName);
    if (index === -1) return;

    storage.splice(index, 1);
    localStorage.setItem('favorites', JSON.stringify(storage));
    displayFavorites();
}

function checkFavorites(displayName) {
  const stored = JSON.parse(localStorage.getItem('favorites'));
  if (!stored) return false;
  return stored.some(item => item.display === displayName);
}

function runSearch (name = search.value) {
    resultHeading.innerHTML = "";
    result.innerHTML = "";
    result.classList.remove('filled-result', 'result-grid'); 
    result.classList.add('empty-result');
    const loader = document.createElement('img');
    loader.src = cloud;
    loader.alt = 'Loading...';
    loader.className = 'loading-icon';
    result.appendChild(loader);
    
    getCoordinates(name).then( ({long, lat}) => {
        result.removeChild(loader);
        result.classList.remove('empty-result');
        resultContainer.classList.add('filled');
        result.style.display = 'grid';
        result.classList.add('filled-result', 'result-grid');   
        fetchWeather(long, lat);
        
    });

}

function displayFavorites() {
    if (localStorage.getItem('favorites')) {
        const favorites = JSON.parse(localStorage.getItem('favorites'));
        const favoriteArea = document.getElementById('favorites');
        favoriteArea.innerHTML = "";
        for (let fave of favorites) {
            const button = document.createElement('button');
            button.className = 'favorite';
            button.setAttribute('data-display', fave.display);
            button.innerHTML = `<img src="${favorited}">${fave.name}`;
    
            favoriteArea.append(button);
          
            button.addEventListener('click', () => {
              search.value = fave.name;
              runSearch(fave.display);
            });
          
        }
    }
}

form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!search.value) {
        return;
    }
    runSearch();       
})

displayFavorites();

if (checkFavorites) {
    runSearch(JSON.parse(localStorage.getItem('favorites'))[0].display)
}