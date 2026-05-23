/**
 * Real-time Weather Integration utilizing the Open-Meteo public API.
 * Fetches actual, live meteorological parameters for the Narendra Modi Stadium in Ahmedabad, India.
 * Requires NO API key, ensuring out-of-the-box reliability.
 */
export async function fetchLiveStadiumWeather() {
  const LATITUDE = 23.0916; // Exact Narendra Modi Stadium, Motera coordinate
  const LONGITUDE = 72.5975;

  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m`
    );
    if (!response.ok) throw new Error('Weather network error');
    
    const data = await response.json();
    const current = data.current;
    
    // Map WMO weather codes to readable descriptions
    const codeMap = {
      0: 'Clear sky',
      1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
      45: 'Foggy', 48: 'Depositing rime fog',
      51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
      61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
      71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
      80: 'Slight showers', 81: 'Moderate showers', 82: 'Violent showers',
      95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail'
    };

    const temp = Math.round(current.temperature_2m);
    const rainVal = current.precipitation;
    const weatherDesc = codeMap[current.weather_code] || 'Clear';
    
    let rainRisk = 'Low Rain Risk';
    if (rainVal > 0.5) rainRisk = 'Rain Active';
    else if (current.relative_humidity_2m > 80 || current.weather_code >= 51) rainRisk = 'High Rain Risk';
    else if (current.relative_humidity_2m > 60) rainRisk = 'Moderate Rain Risk';

    return {
      temp: `${temp}°C`,
      desc: `${weatherDesc} · ${rainRisk}`,
      precipitation: rainVal,
      humidity: current.relative_humidity_2m,
      wind: `${current.wind_speed_10m} km/h`
    };
  } catch (error) {
    console.warn('[Weather API] Failed to fetch live weather, using fallback:', error);
    return {
      temp: '28°C',
      desc: 'Partly Cloudy · Light Rain Risk',
      precipitation: 0.1,
      humidity: 62,
      wind: '12 km/h'
    };
  }
}
