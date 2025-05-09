from flask import Flask, jsonify, render_template
# import serial
import threading
import time
import requests
import random
import csv
from io import StringIO
import json


app = Flask(__name__)

# Données GPS partagées
gps_data = {
    "lat": 0.0,
    "lon": 0.0,
    "vitesse": 0.0
}

# Clé API météo (à remplacer si besoin)
API_KEY = "GRF4DXAG9HC8A34UAQSHG7FSP"

# Active/désactive l’utilisation du GPS Arduino
capt = False

# Thread lecture série
def lire_gps():
    if capt:
        try:
            import serial
            ser = serial.Serial('COM3', 9600, timeout=1)
            while True:
                ligne = ser.readline().decode('utf-8').strip()
                if ligne.startswith("LAT:"):
                    try:
                        parts = ligne.split(',')
                        gps_data["lat"] = float(parts[0].split(':')[1])
                        gps_data["lon"] = float(parts[1].split(':')[1])
                        gps_data["vitesse"] = float(parts[2].split(':')[1])
                    except:
                        continue
        except Exception as e:
            print(f"Erreur série : {e}")
    else:
        while True:
            # Coordonnées fixes pour simulation
            gps_data["lat"] = 39.1627943
            gps_data["lon"] = 11.8036229
            gps_data["vitesse"] = 6.0
            time.sleep(2)

# Données météo via Visual Crossing
def get_weather(lat, lon, API_KEY):
    try:
        with open("meteo.json", "r") as f:
            data = json.load(f)
        info_day = data["days"][0]
        day_info = {
            "tempMax": info_day["tempmax"],
            "tempMin": info_day["tempmin"],
            "temp": info_day["temp"],
            "feelsLike": info_day["feelslike"],
            "humidity": info_day["humidity"],
            "precip": info_day["precip"],
            "windSpeed": info_day["windspeed"],
            "windDir": info_day["winddir"],
            "pressure": info_day["pressure"],
            "cloudCover": info_day["cloudcover"]
        }

        last_hour_info = info_day["hours"][-1] if "hours" in info_day and len(info_day["hours"]) > 0 else {}

        last_hour_data = {
            "temp": last_hour_info.get("temp", 0),
            "feelsLike": last_hour_info.get("feelslike", 0),
            "humidity": last_hour_info.get("humidity", 0),
            "precip": last_hour_info.get("precip", 0),
            "windSpeed": last_hour_info.get("windspeed", 0),
            "windDir": last_hour_info.get("winddir", 0),
            "pressure": last_hour_info.get("pressure", 0),
            "cloudCover": last_hour_info.get("cloudcover", 0)
        }

        return {
            "day_info": day_info,
            "last_hour_info": last_hour_data
        }

    except requests.exceptions.RequestException as e:
        print(f"Error with the weather API request: {e}")
        return {"error": "API request failed."}
    except KeyError as e:
        print(f"Missing expected data in the response: {e}")
        return {"error": "Missing data in the response."}
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return {"error": "An unexpected error occurred."}
    

def get_capt():
    try:
        with open("capteurs.json", "r") as f:
            capt_d = json.load(f)
        capt = {
            "temp": capt_d["temp"],
            "feelsLike": capt_d["feelslike"],
            "humidity": capt_d["humidity"],
            "precip": capt_d["precip"],
            "windSpeed": capt_d["windspeed"],
            "windDir": capt_d["winddir"],
            "pressure": capt_d["pressure"],
            "cloudCover": capt_d["cloudcover"],
            "conditions":capt_d["conditions"],
            "icon" : capt_d["icon"]
        }
        return {
            "capt": capt
        }

    except requests.exceptions.RequestException as e:
        print(f"Error with the weather API request: {e}")
        return {"error": "API request failed."}
    except KeyError as e:
        print(f"Missing expected data in the response: {e}")
        return {"error": "Missing data in the response."}
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return {"error": "An unexpected error occurred."}

# Simule 5 bateaux autour
def generate_ais():
    return [
        {
            "lat": gps_data["lat"] + random.uniform(-1, 1),
            "lon": gps_data["lon"] + random.uniform(-1, 1)
        }
        for _ in range(5)
    ]

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/donnees")
def donnees():
    meteo = get_weather(gps_data["lat"], gps_data["lon"],API_KEY)
    print(meteo)
    ais = generate_ais()
    capt = get_capt()
    print(capt)
    return jsonify({
        "gps": gps_data,
        "meteo": meteo,
        "ais": ais,
        "capt": capt["capt"]
    })
@app.route('/angles')
def get_angles():
    angle_bateau = random.randint(0, 360)  # Angle du bateau
    angle_vent = random.randint(0, 360)  # Angle du vent
    angle_voile = random.randint(0, 360)  # Angle de la voile
    
    return jsonify({
        'bateau': angle_bateau,
        'vent': angle_vent,
        'voile': angle_voile
    })
if __name__ == "__main__":
    t = threading.Thread(target=lire_gps)
    t.daemon = True
    t.start()
    app.run(debug=True)
