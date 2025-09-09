import React, { useState, useEffect, useRef } from "react";
import {
  GoogleMap,
  Marker,
  Polyline,
  useJsApiLoader,
} from "@react-google-maps/api";

const containerStyle = {
  width: "100vw",
  height: "100vh",
};

const centerDefault = {
  lat: -23.55052,
  lng: -46.633308,
};

// Função haversine para distância em metros
function haversineMeters(a, b) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371000; // raio da Terra em metros
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinHalfLat = Math.sin(dLat / 2);
  const sinHalfLon = Math.sin(dLon / 2);
  const aa =
    sinHalfLat * sinHalfLat +
    Math.cos(lat1) * Math.cos(lat2) * sinHalfLon * sinHalfLon;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}

export default function App() {
  const [current, setCurrent] = useState(null); // {lat, lng}
  const [route, setRoute] = useState([]); // array de {lat, lng}
  const [tracking, setTracking] = useState(false);
  const [distance, setDistance] = useState(0); // metros
  const watchId = useRef(null);
  const mapRef = useRef(null);

  // Carrega Google Maps API
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyBspZ4qJ8FFQH7AIQQ0woXY_cT4_-uZdIM", // substitua aqui
  });

  // Pega posição inicial para centralizar mapa
  useEffect(() => {
    if (!navigator.geolocation) {
      alert("Geolocalização não suportada pelo navegador.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setCurrent(coords);
      },
      (err) => {
        alert("Erro ao obter localização: " + err.message);
      }
    );
  }, []);

  // Inicia rastreamento
  const startTracking = () => {
    if (!navigator.geolocation) {
      alert("Geolocalização não suportada pelo navegador.");
      return;
    }
    setRoute([]);
    setDistance(0);

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setCurrent(coords);
        setRoute((r) => {
          const newRoute = [...r, coords];
          if (r.length > 0) {
            const last = r[r.length - 1];
            setDistance((d) => d + haversineMeters(last, coords));
          }
          // centraliza mapa
          if (mapRef.current) {
            mapRef.current.panTo(coords);
          }
          return newRoute;
        });
      },
      (err) => {
        alert("Erro no rastreamento: " + err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 5000,
      }
    );
    watchId.current = id;
    setTracking(true);
  };

  // Para rastreamento
  const stopTracking = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setTracking(false);
  };

  if (!isLoaded) return <div>Carregando mapa...</div>;

  return (
    <div>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={current ?? centerDefault}
        zoom={16}
        onLoad={(map) => (mapRef.current = map)}
      >
        {current && <Marker position={current} label="Você" />}
        {route.length > 1 && <Polyline path={route} options={{ strokeWeight: 4 }} />}
      </GoogleMap>

      <div
        style={{
          position: "fixed",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "white",
          padding: 12,
          borderRadius: 8,
          boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
          textAlign: "center",
          width: 250,
          fontFamily: "Arial, sans-serif",
        }}
      >
        <button
          onClick={tracking ? stopTracking : startTracking}
          style={{
            padding: "10px 20px",
            borderRadius: 20,
            border: "none",
            backgroundColor: tracking ? "#e53935" : "#1e88e5",
            color: "white",
            fontWeight: "bold",
            cursor: "pointer",
            marginBottom: 8,
            width: "100%",
          }}
        >
          {tracking ? "PARAR" : "INICIAR"}
        </button>
        <div>
          <div>Distância: {(distance / 1000).toFixed(2)} km</div>
          <div>Pontos: {route.length}</div>
        </div>
      </div>
    </div>
  );
}

//teste