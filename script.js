'use strict';


const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

let map, mapEvent;
let IDs = [];
const calcID = function () {
    const id = Math.trunc(Math.random() * 1000);
    if (IDs.includes(id)) {
        calcID();
    }
    else {
        IDs.push(id);
        return id
    }
}


class Workout {
    date = new Date();
    id = calcID();
    constructor(coords, distance, duration) {
        this.coords = coords;
        this.distance = distance;
        this.duration = duration;
    }
    _setDescription() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }
}

class Running extends Workout {
    type = "running";
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

class Cycling extends Workout {
    type = "cycling";
    constructor(coords, distance, duration, elevation) {
        super(coords, distance, duration);
        this.elevation = elevation;
        this.calcSpeed();
        this._setDescription();
    }
    calcSpeed() {
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}

class App {
    _map;
    _mapEvent;
    _workouts = [];
    _zoomLevel = 13;
    constructor() {
        this._getPosition();
        this._getLocalStorage();
        form.addEventListener("submit", this._newWorkout.bind(this));
        inputType.addEventListener("change", this._toggleInputs);
        containerWorkouts.addEventListener("click", this._moveToPopup.bind(this))
    }

    _getPosition() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
                alert("Could not get your position.");
            });
        }
    }

    _loadMap(position) {
        const { latitude } = position.coords;
        const { longitude } = position.coords;
        const coords = [latitude, longitude];

        this._map = L.map("map").setView(coords, this._zoomLevel);
        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this._map);

        this._map.on('click', this._showForm.bind(this));
        this._workouts.forEach(workout => {
            this._renderWorkout(workout);
            this._renderWorkoutMarker(workout);
        });


    }

    _showForm(mapE) {
        this._mapEvent = mapE;
        form.classList.remove("hidden");
        inputDistance.focus();
    }

    _newWorkout(e) {
        e.preventDefault();
        //get data from form
        const type = inputType.value;
        const distance = Number(inputDistance.value);
        const duration = Number(inputDuration.value);
        const { lat, lng } = this._mapEvent.latlng;
        let workout;



        //if running
        if (type === "running") {
            inputElevation.closest('.form__row').classList.add('form__row--hidden');
            inputCadence.closest('.form__row').classList.remove('form__row--hidden');
            const cadence = +inputCadence.value;
            if (validateInputs(distance, duration, cadence) || !isPositive(distance, duration, cadence) || noValues(distance, duration, cadence)) {
                return alert("Inputs have to be positive numbers!");
            }
            workout = new Running([lat, lng], distance, duration, cadence);
            this._workouts.push(workout);
        }

        //if cycling
        if (type === "cycling") {
            const elevation = +inputElevation.value;
            if (validateInputs(distance, duration) || !isPositive(distance, duration) || noValues(distance, duration, elevation)) {
                return alert("Inputs have to be positive numbers!");
            }
            workout = new Cycling([lat, lng], distance, duration, elevation);
            this._workouts.push(workout);
        }


        //render workout
        this._renderWorkoutMarker(workout);
        this._clearInputs();
        form.classList.add("hidden");
        this._renderWorkout(workout);

        this._setLocalStorage();



    }

    _toggleInputs() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _clearInputs() {
        inputCadence.value = "";
        inputDistance.value = "";
        inputDuration.value = "";
        inputElevation.value = "";
    }

    _renderWorkoutMarker(workout) {
        L.marker(workout.coords).addTo(this._map).bindPopup(L.popup({
            autoclose: false,
            maxWidth: 250,
            maxHeight: 100,
            closeOnClick: false,
            className: `${workout.type}-popup`
        })).setPopupContent(`${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀"} ${workout.description}`).openPopup();

    }

    _renderWorkout(workout) {
        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
            <h2 class="workout__title">${workout.description}</h2>
            <div class="workout__details">
                <span class="workout__icon">${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀"}</span>
                <span class="workout__value">${workout.distance}</span>
                <span class="workout__unit">km</span>
            </div >
    <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
    </div>`;

        if (workout.type === "running") {
            html += `
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${Math.trunc(workout.pace)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`;
        } else {
            html += `
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${Math.trunc(workout.speed)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevation}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>`;
        }
        form.insertAdjacentHTML("afterend", html);
    }
    _moveToPopup(e) {
        const workoutEl = e.target.closest(".workout");
        if (!workoutEl) return;
        const workout = this._workouts.find(work => work.id === Number(workoutEl.dataset.id));

        this._map.setView(workout.coords, this._zoomLevel, {
            animate: true,
            pan: {
                duration: 1
            }
        });

    }

    _setLocalStorage() {
        localStorage.setItem("workouts", JSON.stringify(this._workouts));
        localStorage.setItem("ids", JSON.stringify(IDs));
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem("workouts"));
        const localIds = JSON.parse(localStorage.getItem("ids"));

        if (!data || !localIds) {
            return
        }
        this._workouts = data;
        IDs = localIds;
    }
}

const validateInputs = function (...inputs) {
    return inputs.every(inp => isNaN(inp));
}

const isPositive = function (...inputs) {
    return inputs.every(inp => inp >= 0);
}

const noValues = function (...inputs) {
    return inputs.some(inp => !inp);
}

const app = new App();
