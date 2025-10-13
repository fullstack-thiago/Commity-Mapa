import React, { useState, useEffect, useRef } from "react";
import {
  GoogleMap,
  Marker,
  Polyline,
  useJsApiLoader,
} from "@react-google-maps/api";

// estilo container
const containerStyle = {
  width: "100vw",
  height: "100vh",
};

const centerDefault = {
  lat: -23.55052,
  lng: -46.633308,
};

// Função haversine para distância em metros (digit-by-digit correto)
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

// Exemplo de estilo "night mode" (você pode substituir por outro JSON)
const nightStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
];

export default function App() {
  // Estados base
  const [current, setCurrent] = useState(null); // posição bruta atual (sem suavização)
  const [route, setRoute] = useState([]); // pontos aceitos e suavizados para polyline
  const [tracking, setTracking] = useState(false);
  const [distance, setDistance] = useState(0); // metros

  // Configurações de precisão / suavização
  const MIN_DISTANCE_METERS = 3; // distancia minima para aceitar ponto (ajustar)
  const MAX_SPEED_M_S = 50; // ignora pontos com velocidade > 50 m/s (ajustar)
  const SMOOTH_ALPHA = 0.6; // alpha para EMA: 0..1 (maior = menos suavização)

  const watchId = useRef(null);
  const mapRef = useRef(null);
  const lastAcceptedRef = useRef(null); // último ponto aceito (sem suavização)
  const lastTimestampRef = useRef(null);
  const lastSmoothedRef = useRef(null); // último ponto suavizado

  // Map style state
  const [mapType, setMapType] = useState("roadmap"); // roadmap, satellite, hybrid, terrain
  const [nightMode, setNightMode] = useState(false);

  // Carrega Google Maps API (mova a key para .env em produção)
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "AIzaSyBspZ4qJ8FFQH7AIQQ0woXY_cT4_-uZdIM",
  });

  // Posicao inicial para centralizar
  useEffect(() => {
    if (!navigator.geolocation) {
      alert("Geolocalização não suportada pelo navegador.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrent(coords);
        // inicializa refs
        lastAcceptedRef.current = coords;
        lastSmoothedRef.current = coords;
        lastTimestampRef.current = pos.timestamp;
      },
      (err) => {
        alert("Erro ao obter localização: " + err.message);
      }
    );
  }, []);

  // Aplica novas opções no mapa quando mapType ou nightMode mudam
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setOptions({
        mapTypeId: mapType,
        styles: nightMode ? nightStyle : null,
      });
    }
  }, [mapType, nightMode]);

  // Função central que processa cada posição retornada pelo watchPosition
  const handlePosition = (pos) => {
    if (!pos || !pos.coords) return;
    const candidate = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    setCurrent(candidate); // sempre atualizar marcador atual (opcional)

    const nowTs = pos.timestamp || Date.now();

    // Se não há último aceito, aceita imediatamente
    if (!lastAcceptedRef.current) {
      lastAcceptedRef.current = candidate;
      lastSmoothedRef.current = candidate;
      lastTimestampRef.current = nowTs;
      setRoute((r) => [...r, candidate]);
      return;
    }

    const lastAccepted = lastAcceptedRef.current;
    const dist = haversineMeters(lastAccepted, candidate);

    // tempo em segundos entre pontos
    const deltaTime = (nowTs - (lastTimestampRef.current || nowTs)) / 1000;
    const speed = deltaTime > 0 ? dist / deltaTime : 0; // m/s

    // FILTROS:
    // 1) distancia minima
    if (dist < MIN_DISTANCE_METERS) {
      // desconsidera como drift
      return;
    }
    // 2) velocidade maxima (salto espurio)
    if (speed > MAX_SPEED_M_S) {
      // salto muito rapido - ignora
      return;
    }

    // Se passou nos filtros, aceita ponto:
    lastAcceptedRef.current = candidate;
    lastTimestampRef.current = nowTs;

    // Suavizacao (EMA)
    const lastSmoothed = lastSmoothedRef.current || candidate;
    const smoothed = {
      lat: SMOOTH_ALPHA * candidate.lat + (1 - SMOOTH_ALPHA) * lastSmoothed.lat,
      lng: SMOOTH_ALPHA * candidate.lng + (1 - SMOOTH_ALPHA) * lastSmoothed.lng,
    };
    lastSmoothedRef.current = smoothed;

    // Atualiza distancia acumulada usando o último ponto ACEITO (não o suavizado)
    setDistance((d) => d + dist);

    // Centraliza mapa
    if (mapRef.current) {
      mapRef.current.panTo(smoothed);
    }

    // Armazena ponto suavizado para desenho
    setRoute((r) => [...r, smoothed]);
  };

  // Inicia tracking com watchPosition
  const startTracking = () => {
    if (!navigator.geolocation) {
      alert("Geolocalização não suportada pelo navegador.");
      return;
    }
    setRoute([]);
    setDistance(0);
    lastAcceptedRef.current = null;
    lastSmoothedRef.current = null;
    lastTimestampRef.current = null;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        try {
          handlePosition(pos);
        } catch (e) {
          console.error("Erro ao processar posição:", e);
        }
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

  // Para tracking
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
        onLoad={(map) => {
          mapRef.current = map;
          // aplica opções iniciais
          map.setOptions({ mapTypeId: mapType, styles: nightMode ? nightStyle : null });
        }}
      >
        {current && <Marker position={current} label="Você" />}
        {route.length > 1 && <Polyline path={route} options={{ strokeWeight: 4 }} />}
      </GoogleMap>

      {/* Painel de controle (fixed) */}
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
          width: 300,
          fontFamily: "Arial, sans-serif",
          zIndex: 999,
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

        {/* Controles do tipo de mapa */}
        <div style={{ marginTop: 8, textAlign: "left" }}>
          <label style={{ fontSize: 12 }}>Tipo de mapa</label>
          <select
            value={mapType}
            onChange={(e) => setMapType(e.target.value)}
            style={{ width: "100%", padding: 6, marginTop: 4 }}
          >
            <option value="roadmap">Padrão (Roadmap)</option>
            <option value="satellite">Satélite</option>
            <option value="hybrid">Híbrido</option>
            <option value="terrain">Terreno</option>
          </select>
        </div>

        <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <label style={{ fontSize: 12 }}>Night mode</label>
          <input type="checkbox" checked={nightMode} onChange={(e) => setNightMode(e.target.checked)} />
        </div>

        <div style={{ marginTop: 8, fontSize: 14 }}>
          <div>Distância: {(distance / 1000).toFixed(3)} km</div>
          <div>Pontos: {route.length}</div>
        </div>
      </div>
    </div>
  );
}
