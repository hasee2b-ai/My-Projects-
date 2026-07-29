const cityInput = document.querySelector(".city-input");
const searchButton = document.querySelector(".search-btn");
const apiKey = "0c638f230ecec700e4140ee258cc8831";
const notfoundsection = document.querySelector(".not-found");
const searchCitySection = document.querySelector(".search-city");
const weatherInfosection = document.querySelector(".weather-info");
const countryTxt = document.querySelector(".country-txt");
const tempTxt = document.querySelector(".temp-txt");
const conditionTxt = document.querySelector(".condition-txt");
const humidityvalueTxt = document.querySelector(".humidity-value-txt");
const windvalueTxt = document.querySelector(".wind-value-txt");
const weathersummaryimg = document.querySelector(".weather-summary-img");
const currentdataTxt = document.querySelector(".current-date-txt");
const foreCastitemContainer = document.querySelector(".forecast-item-container");


function getweathericon(id){
    // console.log(id);
    if(id < 232) return "thunderstorm.svg"
    if(id < 321) return "drizzle.svg"
    if(id < 531) return "rain.svg"
    if(id < 622) return "snow.svg"
    if(id < 781) return "atmosphere.svg"
    if(id < 800) return "clear.svg"
    else return "clouds.svg"
}

function getCurrentdata(){
    const currentDate = new Date();
    const options = {
        weekday : "short",
        day : "2-digit",
        month : "short"
    }
    return currentDate.toLocaleDateString("en-GB" , options)
}

searchButton.addEventListener("click" , ()=>{
    if(cityInput.value.trim() != ""){
        updateweatherInfo(cityInput.value)
        cityInput.value = ""
        cityInput.blur();
    }
})
cityInput.addEventListener("keydown" , (evt)=>{
    if(evt.key == "Enter" && cityInput.value.trim() != ""){
        updateweatherInfo(cityInput.value)
        cityInput.value = ""
        cityInput.blur();
    }
})

async function  getFetchData(endpoint , city){
    const urlApi = `https://api.openweathermap.org/data/2.5/${endpoint}?q=${city}&appid=${apiKey}&units=metric`;

    const response = await fetch(urlApi)
    return response.json()
}

async function updateweatherInfo(city){
    const WeatherData = await getFetchData("weather" , city);
    if(WeatherData.cod != 200){
        showdisplay(notfoundsection)
        return
    }

    const {
        name : country,
        main : {temp , humidity},
        weather : [{id , main}],
        wind : {speed}
    } = WeatherData

   countryTxt.innerText = country;
   tempTxt.innerText = Math.round(temp) + "℃";
   conditionTxt.innerText = main;
   humidityvalueTxt.innerText = humidity + "%";
   windvalueTxt.innerText = speed + "M/s";
   currentdataTxt.innerText = getCurrentdata();   
   weathersummaryimg.src = `assets/weather/${getweathericon(id)}`
   await updateforecastInfo(city);
   showdisplay(weatherInfosection)
}

async function updateforecastInfo(city){
    const forecastData = await getFetchData("forecast" , city);
    const TimeTaken = "12:00:00";
    const todayDate = new Date().toISOString().split("T")[0];
    foreCastitemContainer.innerHTML = ""
    forecastData.list.forEach(forcastweather =>{
        if(forcastweather.dt_txt.includes(TimeTaken) && 
    !forcastweather.dt_txt.includes(todayDate))
       upadteforecastItem(forcastweather)  
    })
    // console.log(todayDate);
}

function upadteforecastItem(weatherData){
    console.log(weatherData);
    const {
        dt_txt : date,
        weather : [{id}],
        main : {temp}
    } = weatherData
 
    const dateTaken = new Date(date);
    const dateOptions = {
        day : "2-digit",
        month : "short"
    }

    const dateResult = dateTaken.toLocaleDateString("en-US" , dateOptions)
    const foreCastitem =  `
    <div class="forecast-item">
            <h5 class="forecast-item-date regular-txt">${dateResult}</h5>
            <img src="./assets/weather/${getweathericon(id)}" alt="" class="forecast-item-img">
            <h5 class="forecast-item-temp">${Math.round(temp)}℃</h5>
          </div>
    `

    foreCastitemContainer.insertAdjacentHTML("beforeend" , foreCastitem)
}

function showdisplay(section){
    [weatherInfosection , searchCitySection , notfoundsection]
    .forEach(section => section.style.display = "none");
    section.style.display = "flex"
}



