import sqlite3
import paho.mqtt.client as mqtt
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

app = FastAPI(title="API Monitor de Despegue IoT")

# Habilitamos CORS para que tu Dashboard en React pueda consultar esta API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# 1. Configuración de Base de Datos (SQLite)
# ---------------------------------------------------------
conn = sqlite3.connect("clima.db", check_same_thread=False)
cursor = conn.cursor()
cursor.execute('''CREATE TABLE IF NOT EXISTS historial
                  (id INTEGER PRIMARY KEY AUTOINCREMENT,
                   timestamp DATETIME,
                   temperatura REAL,
                   humedad REAL,
                   viento REAL)''')
conn.commit()

# Estado global para mantener el último valor recibido
estado_actual = {"temperatura": 0.0, "humedad": 0.0, "viento": 0.0}

# ---------------------------------------------------------
# 2. Configuración del Cliente MQTT
# ---------------------------------------------------------
def on_connect(client, userdata, flags, rc):
    print("Conectado al Broker HiveMQ exitosamente")
    # Nos suscribimos a todos los topics de tu equipo
    client.subscribe("cucei/iot/eq_emiliano/#")

def on_message(client, userdata, msg):
    topic = msg.topic
    payload = msg.payload.decode('utf-8')
    print(f"Llegó dato -> {topic}: {payload}")
    
    # Actualizamos el estado global según el topic
    if "temperatura" in topic:
        estado_actual["temperatura"] = float(payload)
    elif "humedad" in topic:
        estado_actual["humedad"] = float(payload)
    elif "viento" in topic:
        estado_actual["viento"] = float(payload)
        
        # Como el viento es lo último que envía el ESP32 en el loop,
        # aprovechamos para guardar la "foto completa" en la base de datos
        cursor.execute(
            "INSERT INTO historial (timestamp, temperatura, humedad, viento) VALUES (?, ?, ?, ?)",
            (datetime.now(), estado_actual["temperatura"], estado_actual["humedad"], estado_actual["viento"])
        )
        conn.commit()

# Iniciar MQTT en segundo plano
mqtt_client = mqtt.Client()
mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message
mqtt_client.connect("broker.hivemq.com", 1883, 60)
mqtt_client.loop_start()

# ---------------------------------------------------------
# 3. Endpoints para tu Dashboard (React/Next.js)
# ---------------------------------------------------------
@app.get("/api/clima/actual")
def obtener_actual():
    """Devuelve las lecturas en tiempo real para el semáforo de despegue"""
    return estado_actual

@app.get("/api/clima/historial")
def obtener_historial():
    """Devuelve los últimos 20 registros para graficar el historial"""
    cursor.execute("SELECT timestamp, temperatura, humedad, viento FROM historial ORDER BY id DESC LIMIT 20")
    filas = cursor.fetchall()
    
    historial = []
    for f in filas:
        historial.append({
            "timestamp": f[0],
            "temperatura": f[1],
            "humedad": f[2],
            "viento": f[3]
        })
    return historial