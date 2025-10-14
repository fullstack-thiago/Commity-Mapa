import React, { useState, useEffect, useRef } from "react";
import {
  GoogleMap,
  Marker,
  Polyline,
  useJsApiLoader,
} from "@react-google-maps/api";

// Componente auxiliar para botões do menu
function MenuButton({ icon, label, onClick }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 16px",
        borderRadius: "25px",
        background: isHovered
          ? "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
          : "linear-gradient(135deg, rgba(45,24,16,0.95) 0%, rgba(31,15,8,0.95) 100%)",
        border: "2px solid #8b6f47",
        boxShadow: isHovered
          ? "0 6px 20px rgba(212,175,55,0.5)"
          : "0 4px 15px rgba(0,0,0,0.6)",
        cursor: "pointer",
        transition: "all 0.3s ease",
        transform: isHovered ? "scale(1.05)" : "scale(1)",
        minWidth: "160px",
      }}
    >
      <span style={{ fontSize: "24px" }}>{icon}</span>
      <span
        style={{
          fontFamily: "'Cinzel', 'Georgia', serif",
          color: isHovered ? "#1a0f0a" : "#d4af37",
          fontWeight: "bold",
          fontSize: "14px",
          letterSpacing: "1px",
        }}
      >
        {label}
      </span>
    </div>
  );
}

const containerStyle = {
  width: "100vw",
  height: "100vh",
};

const centerDefault = {
  lat: -23.55052,
  lng: -46.633308,
};

// Estilo rústico/medieval para o mapa (inspirado em "Old Timey")
const mapStyles = [
  {
    featureType: "administrative",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi",
    stylers: [{ visibility: "simplified" }],
  },
  {
    featureType: "road",
    stylers: [{ visibility: "simplified" }],
  },
  {
    featureType: "water",
    stylers: [
      { visibility: "simplified" },
      { color: "#6b5d4f" },
      { lightness: 20 },
    ],
  },
  {
    featureType: "transit",
    stylers: [{ visibility: "simplified" }],
  },
  {
    featureType: "landscape",
    stylers: [
      { visibility: "simplified" },
      { color: "#8b7355" },
      { lightness: 30 },
    ],
  },
  {
    featureType: "road.highway",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road.local",
    stylers: [
      { visibility: "on" },
      { color: "#a0826d" },
    ],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [
      { visibility: "on" },
      { color: "#8b6f47" },
    ],
  },
  {
    stylers: [{ saturation: -60 }],
  },
];

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

export default function Mapa() {
  const [current, setCurrent] = useState(null); // {lat, lng}
  const [route, setRoute] = useState([]); // array de {lat, lng}
  const [tracking, setTracking] = useState(false);
  const [distance, setDistance] = useState(0); // metros
  const [menuOpen, setMenuOpen] = useState(false); // controle do menu radial
  const watchId = useRef(null);
  const mapRef = useRef(null);

  // Carrega Google Maps API
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyBspZ4qJ8FFQH7AIQQ0woXY_cT4_-uZdIM", // Key api aqui
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
    setMenuOpen(false); // Fecha o menu ao iniciar
  };

  // Para rastreamento
  const stopTracking = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setTracking(false);
  };

  // Funções do menu
  const handleInventory = () => {
    alert("⚔️ Inventário - Em breve!");
    setMenuOpen(false);
  };

  const handleQuests = () => {
    alert("📜 Missões - Em breve!");
    setMenuOpen(false);
  };

  const handleBattle = () => {
    alert("⚔️ Batalha - Em breve!");
    setMenuOpen(false);
  };

  const handleMap = () => {
    alert("🗺️ Mapa - Você já está aqui!");
    setMenuOpen(false);
  };

  if (!isLoaded) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #1a0f0a 0%, #3d2817 50%, #1a0f0a 100%)",
          color: "#d4af37",
          fontFamily: "'Cinzel', 'Georgia', serif",
          fontSize: "20px",
        }}
      >
        ⚔️ Carregando mapa...
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      {/* Mapa */}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={current ?? centerDefault}
        zoom={16}
        onLoad={(map) => (mapRef.current = map)}
        options={{
          disableDefaultUI: true,
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: mapStyles,
        }}
      >
        {current && (
          <Marker
            position={current}
            icon={{
              path: "M 0,-24 L -8,-8 L -24,-8 L -10,2 L -16,18 L 0,8 L 16,18 L 10,2 L 24,-8 L 8,-8 Z",
              fillColor: "#d4af37",
              fillOpacity: 1,
              strokeColor: "#8b6f47",
              strokeWeight: 2,
              scale: 1,
            }}
          />
        )}
        {route.length > 1 && (
          <Polyline
            path={route}
            options={{
              strokeColor: "#d4af37",
              strokeWeight: 4,
              strokeOpacity: 0.8,
            }}
          />
        )}
      </GoogleMap>

      {/* Perfil no canto superior esquerdo */}
      <div
        style={{
          position: "fixed",
          top: "20px",
          left: "20px",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #8b6f47 0%, #4a2f1a 100%)",
          border: "3px solid #d4af37",
          boxShadow: "0 4px 15px rgba(0,0,0,0.6), inset 0 2px 5px rgba(0,0,0,0.3)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          cursor: "pointer",
          transition: "all 0.3s ease",
          zIndex: 1000,
        }}
        onClick={() => alert("👤 Perfil - Em breve!")}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.boxShadow = "0 6px 20px rgba(212,175,55,0.5), inset 0 2px 5px rgba(0,0,0,0.3)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 15px rgba(0,0,0,0.6), inset 0 2px 5px rgba(0,0,0,0.3)";
        }}
      >
        <svg width="35" height="35" viewBox="0 0 100 100">
          <circle cx="50" cy="35" r="20" fill="#d4af37" />
          <path
            d="M 30 85 Q 30 60 50 60 Q 70 60 70 85 Z"
            fill="#d4af37"
          />
        </svg>
      </div>

      {/* Painel de informações superior */}
      <div
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          background: "linear-gradient(180deg, rgba(45,24,16,0.95) 0%, rgba(31,15,8,0.95) 100%)",
          padding: "12px 18px",
          borderRadius: "8px",
          border: "2px solid #8b6f47",
          boxShadow: "0 4px 15px rgba(0,0,0,0.6)",
          fontFamily: "'Cinzel', 'Georgia', serif",
          color: "#d4af37",
          fontSize: "14px",
          minWidth: "150px",
          zIndex: 1000,
        }}
      >
        <div style={{ marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>🗺️</span>
          <span style={{ fontWeight: "bold" }}>{(distance / 1000).toFixed(2)} km</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span>📍</span>
          <span style={{ fontWeight: "bold" }}>{route.length} pontos</span>
        </div>
      </div>

      {/* Botão central de espadas cruzadas */}
      <div
        style={{
          position: "fixed",
          bottom: "30px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
        }}
      >
        {/* Menu radial de opções */}
        {menuOpen && (
          <div
            style={{
              position: "absolute",
              bottom: "90px",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              animation: "fadeInUp 0.3s ease",
            }}
          >
            {/* Botão Inventário */}
            <MenuButton
              icon="🎒"
              label="Inventário"
              onClick={handleInventory}
            />
            {/* Botão Missões */}
            <MenuButton
              icon="📜"
              label="Missões"
              onClick={handleQuests}
            />
            {/* Botão Batalha */}
            <MenuButton
              icon="⚔️"
              label="Batalha"
              onClick={handleBattle}
            />
            {/* Botão Mapa */}
            <MenuButton
              icon="🗺️"
              label="Mapa"
              onClick={handleMap}
            />
          </div>
        )}

        {/* Botão principal - Espadas Cruzadas */}
        <div
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            width: "80px",
            height: "80px",
            bottom: "12px",
            right: "-130px",
            borderRadius: "50%",
            background: menuOpen
              ? "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
              : "linear-gradient(135deg, #8b6f47 0%, #4a2f1a 100%)",
            border: "4px solid #d4af37",
            boxShadow: menuOpen
              ? "0 8px 25px rgba(212,175,55,0.6), inset 0 2px 5px rgba(0,0,0,0.3)"
              : "0 6px 20px rgba(0,0,0,0.7), inset 0 2px 5px rgba(0,0,0,0.3)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            cursor: "pointer",
            transition: "all 0.3s ease",
            transform: menuOpen ? "rotate(45deg) scale(1.1)" : "rotate(0deg) scale(1)",
            position: "fixed",
          }}
        >
          <svg width="50" height="50" viewBox="0 0 100 100">
            {/* Espada 1 */}
            <g transform="rotate(-45 50 50)">
              <rect x="47" y="20" width="6" height="50" fill="#c0c0c0" stroke="#808080" strokeWidth="1.5" />
              <polygon points="50,15 44,20 56,20" fill="#e0e0e0" stroke="#808080" strokeWidth="1.5" />
              <rect x="43" y="68" width="14" height="8" fill="#8b6f47" stroke="#4a2f1a" strokeWidth="1.5" />
            </g>
            {/* Espada 2 */}
            <g transform="rotate(45 50 50)">
              <rect x="47" y="20" width="6" height="50" fill="#c0c0c0" stroke="#808080" strokeWidth="1.5" />
              <polygon points="50,15 44,20 56,20" fill="#e0e0e0" stroke="#808080" strokeWidth="1.5" />
              <rect x="43" y="68" width="14" height="8" fill="#8b6f47" stroke="#4a2f1a" strokeWidth="1.5" />
            </g>
          </svg>
        </div>

        {/* Botão de tracking (Iniciar/Parar) */}
{!menuOpen && (
  <div
    onClick={tracking ? stopTracking : startTracking}
    style={{
      position: "fixed",
      bottom: "30px",
      right: "-10px", // distância da borda direita
      padding: "12px 24px",
      borderRadius: "25px",
      background: tracking
        ? "linear-gradient(135deg, #e53935 0%, #b71c1c 100%)"
        : "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)",
      border: "2px solid #d4af37",
      boxShadow: "0 4px 15px rgba(0,0,0,0.6)",
      color: "white",
      fontFamily: "'Cinzel', 'Georgia', serif",
      fontWeight: "bold",
      fontSize: "16px",
      cursor: "pointer",
      transition: "all 0.3s ease",
      whiteSpace: "nowrap",
      textTransform: "uppercase",
      letterSpacing: "1px",
      zIndex: 1000,
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "scale(1.05)";
      e.currentTarget.style.boxShadow =
        "0 6px 20px rgba(212,175,55,0.5)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "scale(1)";
      e.currentTarget.style.boxShadow =
        "0 4px 15px rgba(0,0,0,0.6)";
    }}
  >
    {tracking ? "⛔ PARAR" : "▶️ INICIAR"}
  </div>
)}

      </div>

      {/* Importar fonte Cinzel e animações */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');
          
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateX(-50%) translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateX(-50%) translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
}
