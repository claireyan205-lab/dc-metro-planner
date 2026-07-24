from flask import Flask, render_template, request, jsonify, session
from dotenv import load_dotenv
import os
import requests
import sqlite3
import bcrypt
from init_db import initialize_database

load_dotenv()

WMATA_API_KEY = os.getenv("WMATA_API_KEY")

print("WMATA key loaded:", bool(WMATA_API_KEY))

app = Flask(__name__)

app.secret_key = os.environ.get(
    "SECRET_KEY",
    "temporary-development-key"
)

initialize_database()

wmata_session = requests.Session()
wmata_session.headers.update({
    "api_key": WMATA_API_KEY
})

def get_database():
    connection = sqlite3.connect("database.db")
    connection.row_factory = sqlite3.Row
    return connection

def call_wmata(url):
    if not WMATA_API_KEY:
        return None, "WMATA API key is missing."
    
    try:
        response = requests.get(
            url,
            headers={
                "api_key": WMATA_API_KEY
            },
            timeout=10
        )
    
        response.raise_for_status()
        return response.json(), None

    except requests.RequestException as error:
        print("WMATA request failed:", error)
        return None, "Could not retrieve data from WMATA."

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/signup-page")
def signup_page():
    return render_template("signup.html")

@app.route("/signup", methods = ["POST"])
def signup():
    data = request.get_json()

    if not data:
        return jsonify({"message": "No signup data was received."}), 400 
    
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"message": "Username and password are required."}), 400
    
    if len(username) < 3:
        return jsonify({
            "message": "Username must be at least 3 characters."
        }), 400
    
    if len(password) < 8:
        return jsonify({
            "message": "Password must be at least 8 characters."
        }), 400

    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

    connection = get_database()

    try:
        cursor = connection.execute(
            """
            INSERT INTO users (username, password_hash)
            VALUES (?, ?)
            """,
            (username, password_hash)
        )
    
        connection.commit()
        
        session["user_id"] = cursor.lastrowid
        session["username"] = username

    except sqlite3.IntegrityError:
        return jsonify({
            "message": "That username is already taken."
        }), 409

    finally: 
        connection.close()

    return jsonify({
        "message": "Account created successfully."
    }), 201

@app.route("/login-page")
def login_page():
    return render_template("login.html")

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    if not data:
        return jsonify({"message": "No login data was received."}), 400
    
    username = data.get("username", "").strip()
    password = data.get("password", "")

    connection = get_database()

    user = connection.execute(
        """
        SELECT id, username, password_hash
        FROM users
        WHERE username = ?
        """,
        (username,)
    ).fetchone()

    connection.close()

    if user is None:
        return jsonify({
            "message": "Incorrect username or password."
        }), 401
    
    saved_hash = user["password_hash"]
    
    if isinstance(saved_hash, str):
        saved_hash = saved_hash.encode("utf-8")

    password_correct = bcrypt.checkpw(
        password.encode("utf-8"), saved_hash
    )

    if not password_correct:
        return jsonify({"message": "Incorrect username or password."
        }), 401
    
    session["user_id"] = user["id"]
    session["username"] = user["username"]

    return jsonify({
        "message": "Login successful."
    })

@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "You have been logged out."})

@app.route("/current-user")
def current_user():
    if "user_id" not in session:
        return jsonify({"logged_in": False})
    
    return jsonify({
        "logged_in": True,
        "username": session["username"]
    })

@app.route("/save-trip", methods=["POST"])
def save_trip():
    if "user_id" not in session:
        return jsonify({"message": "Please log in first."}), 401
    
    data = request.get_json()

    start_station = data.get("start_station")
    end_station = data.get("end_station")
    start_name = data.get("start_name")
    end_name = data.get("end_name")

    if not all([start_station, end_station, start_name, end_name]):
        return jsonify({
            "message": "Trip information is incomplete."
        }), 400
    
    connection = get_database()
    try: 
        connection.execute(
            """
            INSERT INTO saved_trips (
                user_id,
                start_station,
                end_station,
                start_name,
                end_name
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                session["user_id"],
                start_station,
                end_station,
                start_name,
                end_name
            )
        )

        connection.commit()
    
    finally:
        connection.close()

    return jsonify({
        "message": "Trip saved."
    }), 201

@app.route("/saved-trips")
def get_saved_trips():
    if "user_id" not in session:
        return jsonify({
            "message": "You must be logged in."
        }), 401

    connection = get_database()

    trips = connection.execute(
        """
        SELECT id, start_station, end_station, start_name, end_name, created_at
        FROM saved_trips
        WHERE user_id = ?
        ORDER BY created_at DESC
        """,
        (session["user_id"],)
    ).fetchall()

    connection.close()

    return jsonify([{
        "id": trip["id"],
        "start_station": trip["start_station"],
        "end_station": trip["end_station"],
        "start_name": trip["start_name"],
        "end_name": trip["end_name"],
        "created_at": trip["created_at"]   
        } for trip in trips
    ]), 200

@app.route("/saved-trips/<int:trip_id>", methods=["DELETE"])
def delete_saved_trip(trip_id):
    if "user_id" not in session:
        return jsonify({
            "message": "Please log in first."
        }), 401

    connection = get_database()

    cursor = connection.execute(
        """
        DELETE FROM saved_trips
        WHERE id = ? AND user_id = ?
        """,
        (trip_id, session["user_id"])
    )

    connection.commit()
    connection.close()

    if cursor.rowcount == 0:
        return jsonify({
            "message": "Saved trip not found."
        }), 404

    return jsonify({
        "message": "Trip deleted."
    }), 200

@app.route("/favorite-station", methods=["POST"])
def favorite_station():
    if "user_id" not in session:
        return jsonify({
            "message":"Please log in first."
        }), 401

    data = request.get_json()

    if not data:
        return jsonify({
            "message": "No station data was received."
        }), 400
    
    station_code = data.get("station_code")
    station_name = data.get("station_name")

    if not station_code or not station_name:
        return jsonify({
            "message": "Station code and name are required."
        }), 400

    connection = get_database()

    connection.execute(
        """
        INSERT INTO favorite_stations
        (user_id, station_code, station_name)
        VALUES (?, ?, ?)
        """,
        (
            session["user_id"],
            data["station_code"],
            data["station_name"]
        )
    )

    connection.commit()
    connection.close()

    return jsonify({
        "message":"Station favorited."
    }),201

@app.route("/favorite-stations")
def favorite_stations():
    if "user_id" not in session:
        return jsonify({
            "message": "Please log in."
        }), 401

    connection = get_database()

    stations = connection.execute("""
        SELECT *
        FROM favorite_stations
        WHERE user_id=?
        ORDER BY created_at DESC
    """,
    (session["user_id"],)
    ).fetchall()

    connection.close()

    return jsonify([
        {
            "id":s["id"],
            "station_code":s["station_code"],
            "station_name":s["station_name"]
        }
        for s in stations
    ])

@app.route("/favorite-stations/<int:station_id>", methods=["DELETE"])
def delete_favorite_station(station_id):
    if "user_id" not in session:
        return jsonify({
            "message": "Please log in first."
        }), 401

    connection = get_database()

    cursor = connection.execute(
        """
        DELETE FROM favorite_stations
        WHERE id = ? AND user_id = ?
        """,
        (station_id, session["user_id"])
    )

    connection.commit()
    connection.close()

    if cursor.rowcount == 0:
        return jsonify({
            "message": "Favorite station not found."
        }), 404

    return jsonify({
        "message": "Favorite station deleted."
    }), 200

@app.route("/arrivals/<station_code>")
def get_arrivals(station_code):
    url = (
        "https://api.wmata.com/"
        "StationPrediction.svc/json/GetPrediction/"
        f"{station_code}"
    )

    response = wmata_session.get(url, timeout=8)
    response.raise_for_status()
    
    return jsonify(response.json())

@app.route("/stations")
def get_stations():
    url = "https://api.wmata.com/Rail.svc/json/jStations"

    response = wmata_session.get(url, timeout=8)
    response.raise_for_status()

    return jsonify(response.json())

@app.route("/fare/<start_code>/<end_code>")
def fare(start_code, end_code):

    url = (
        "https://api.wmata.com/Rail.svc/json/"
        "jSrcStationToDstStationInfo"
        f"?FromStationCode={start_code}"
        f"&ToStationCode={end_code}"
    )

    response = wmata_session.get(url, timeout=8)
    response.raise_for_status()

    return jsonify(response.json())

if __name__ == "__main__":
    app.run(debug=True)