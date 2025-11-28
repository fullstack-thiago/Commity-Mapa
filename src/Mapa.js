import React, { useState, useEffect, useRef } from "react";
import {
  GoogleMap,
  Marker,
  Polyline,
  useJsApiLoader,
} from "@react-google-maps/api";

/* ---------- MenuButton (mantido) ---------- */
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
        boxShadow: isHovered ? "0 6px 20px rgba(212,175,55,0.5)" : "0 4px 15px rgba(0,0,0,0.6)",
        cursor: "pointer",
        transition: "all 0.25s ease",
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

/* ---------- Constantes do mapa (mantidas) ---------- */
const containerStyle = { width: "100vw", height: "100vh" };
const centerDefault = { lat: -23.55052, lng: -46.633308 };
const mapStyles = [
  { featureType: "administrative", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "simplified" }] },
  { featureType: "road", stylers: [{ visibility: "simplified" }] },
  { featureType: "water", stylers: [{ visibility: "simplified" }, { color: "#6b5d4f" }, { lightness: 20 }] },
  { featureType: "transit", stylers: [{ visibility: "simplified" }] },
  { featureType: "landscape", stylers: [{ visibility: "simplified" }, { color: "#8b7355" }, { lightness: 30 }] },
  { featureType: "road.highway", stylers: [{ visibility: "off" }] },
  { featureType: "road.local", stylers: [{ visibility: "on" }, { color: "#a0826d" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ visibility: "on" }, { color: "#8b6f47" }] },
  { stylers: [{ saturation: -60 }] },
];

function haversineMeters(a, b) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinHalfLat = Math.sin(dLat / 2);
  const sinHalfLon = Math.sin(dLon / 2);
  const aa = sinHalfLat * sinHalfLat + Math.cos(lat1) * Math.cos(lat2) * sinHalfLon * sinHalfLon;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}

/* ---------- Componente principal Mapa (com inventário, missões e matchmaking) ---------- */
export default function Mapa() {
  // localização / rota / tracking
  const [current, setCurrent] = useState(null);
  const [route, setRoute] = useState([]);
  const [tracking, setTracking] = useState(false);
  const [distance, setDistance] = useState(0); // metros
  const watchId = useRef(null);
  const mapRef = useRef(null);

  // timer + calorias
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef(null);
  const [weightKg, setWeightKg] = useState(70);

  // menu radial
  const [menuOpen, setMenuOpen] = useState(false);

  // profile modal
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState("Marcos");
  const [profileAvatar, setProfileAvatar] = useState(null);
  const [clan, setClan] = useState("");
  const [savedClan, setSavedClan] = useState("");

  // modais de jogo
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [questsOpen, setQuestsOpen] = useState(false);
  const [battleOpen, setBattleOpen] = useState(false);

  // inventário com os itens desejados (Boost x2 e Escudo)
  const [inventoryItems, setInventoryItems] = useState([
    { id: "boost_x2", name: "Boost x2 (1h)", qty: 1, desc: "Dobra a quilometragem por 1 hora." },
    { id: "shield_1h", name: "Escudo (1h)", qty: 1, desc: "Impede pareamento em batalhas por 1 hora." },
    // itens extras de exemplo
  ]);

  // efeitos ativos: guardamos timestamps (ms) de expiração
  const [boostExpiresAt, setBoostExpiresAt] = useState(null); // timestamp ms
  const [shieldExpiresAt, setShieldExpiresAt] = useState(null);

  // Missões como metas (2km,5km,7km)
  const [missions, setMissions] = useState([
    { id: "m1", title: "Ande 2 km", targetKm: 2, completed: false },
    { id: "m2", title: "Ande 5 km", targetKm: 5, completed: false },
    { id: "m3", title: "Ande 7 km", targetKm: 7, completed: false },
  ]);

  // Matchmaking / Batalha
  const [matchmakingOpen, setMatchmakingOpen] = useState(false);
  const [searchingBattle, setSearchingBattle] = useState(false);
  const [selectedMode, setSelectedMode] = useState("Casual");
  const matchmakingTimerRef = useRef(null);
  const [matchedOpponent, setMatchedOpponent] = useState(null);

  // Duelo de caminhada (novo)
  const [duelActive, setDuelActive] = useState(false);
  const [duelOpponent, setDuelOpponent] = useState(null); // { id, name, level }
  const [duelOpponentDistance, setDuelOpponentDistance] = useState(0); // metros
  const duelTimerRef = useRef(null); // interval that updates opponent distance
  const duelEndTimeoutRef = useRef(null);
  const DUEL_DURATION_SECONDS = 10 * 60; // 10 minutos, ajuste se quiser
  const [duelSecondsElapsed, setDuelSecondsElapsed] = useState(0);

  // Batalha real (após aceitar) -- vamos manter para compatibilidade, mas não vamos abrir a modal de "luta"
  const [battleLog, setBattleLog] = useState([]);
  const [enemyHp, setEnemyHp] = useState(100);
  const [playerHp, setPlayerHp] = useState(100);
  const [battleActive, setBattleActive] = useState(false);

  // Google maps loader
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: "AIzaSyDRxsExWSYPrpobbvyd1sIm0lUPa1OKbAo" });

  // refs to read latest values inside timeouts/intervals
  const distanceRef = useRef(distance);
  const duelOpponentDistanceRef = useRef(duelOpponentDistance);

  useEffect(() => {
    distanceRef.current = distance;
  }, [distance]);

  useEffect(() => {
    duelOpponentDistanceRef.current = duelOpponentDistance;
  }, [duelOpponentDistance]);

  // Posição inicial
  useEffect(() => {
    if (!navigator.geolocation) {
      alert("Geolocalização não suportada pelo navegador.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCurrent({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => alert("Erro ao obter localização: " + err.message)
    );
    // tentativa de carregar clan salvo
    try {
      const saved = localStorage.getItem("game_profile_clan");
      if (saved) setSavedClan(saved);
    } catch (e) {}
  }, []);

  // cleanup
  useEffect(() => {
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      if (timerRef.current !== null) clearInterval(timerRef.current);
      if (matchmakingTimerRef.current !== null) clearTimeout(matchmakingTimerRef.current);
      if (duelTimerRef.current !== null) { clearInterval(duelTimerRef.current); duelTimerRef.current = null; }
      if (duelEndTimeoutRef.current !== null) { clearTimeout(duelEndTimeoutRef.current); duelEndTimeoutRef.current = null; }
    };
  }, []);

  // Timer do tracking
  const startTracking = () => {
    if (!navigator.geolocation) return alert("Geolocalização não suportada pelo navegador.");
    setRoute([]); setDistance(0); setElapsedSeconds(0);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrent(coords);
        setRoute((r) => {
          const newRoute = [...r, coords];

          if (r.length > 0) {
            const last = r[r.length - 1];
            let meters = haversineMeters(last, coords);

            // aplica boost se ativo (verifica expiração)
            const now = Date.now();
            if (boostExpiresAt && now < boostExpiresAt) {
              meters = meters * 2; // dobra a quilometragem contabilizada
            } else if (boostExpiresAt && now >= boostExpiresAt) {
              // boost expirou: limpa estado
              setBoostExpiresAt(null);
            }

            setDistance((d) => d + meters);
          }

          if (mapRef.current) mapRef.current.panTo(coords);
          return newRoute;
        });
      },
      (err) => alert("Erro no rastreamento: " + err.message),
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 5000,
      }
    );
    watchId.current = id;
    setTracking(true);
    setMenuOpen(false);
  };

  const endDuelAndReport = (reason = "final") => {
    // limpa timers do duelo
    if (duelTimerRef.current) { clearInterval(duelTimerRef.current); duelTimerRef.current = null; }
    if (duelEndTimeoutRef.current) { clearTimeout(duelEndTimeoutRef.current); duelEndTimeoutRef.current = null; }

    const playerMeters = distanceRef.current || 0;
    const opponentMeters = duelOpponentDistanceRef.current || 0;

    setDuelActive(false);

    // comparar e notificar
    if (reason === "stopped") {
      // duelo cancelado/encerrado prematuramente
      alert(`Duelo encerrado. Você: ${(playerMeters/1000).toFixed(2)} km • Oponente: ${(opponentMeters/1000).toFixed(2)} km`);
    } else {
      if (playerMeters > opponentMeters) {
        alert(`Você venceu o duelo! ${ (playerMeters/1000).toFixed(2) } km × ${ (opponentMeters/1000).toFixed(2) } km`);
      } else if (playerMeters < opponentMeters) {
        alert(`Você perdeu o duelo... ${ (playerMeters/1000).toFixed(2) } km × ${ (opponentMeters/1000).toFixed(2) } km`);
      } else {
        alert(`Empate! ${ (playerMeters/1000).toFixed(2) } km × ${ (opponentMeters/1000).toFixed(2) } km`);
      }
    }

    // limpa estados do duelo (mantemos histórico do adversário por um pequeno tempo visualmente)
    setTimeout(() => {
      setDuelOpponent(null);
      setDuelOpponentDistance(0);
      setDuelSecondsElapsed(0);
    }, 300);
  };

  const stopTracking = () => {
    if (watchId.current !== null) { navigator.geolocation.clearWatch(watchId.current); watchId.current = null; }
    if (timerRef.current !== null) { clearInterval(timerRef.current); timerRef.current = null; }
    setTracking(false);

    // se existia um duelo em andamento, encerra e reporta
    if (duelActive) {
      endDuelAndReport("stopped");
    }
  };

  // Formata tempo
  const formatElapsed = (secs) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, "0");
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
    const s = Math.floor(secs % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  // cálculos calorias (mesma regra do anterior)
  const distanceKm = distance / 1000;
  const calories = weightKg * distanceKm * 1.036;

  /* ---------- INVENTÁRIO: ação ao usar item (nome não começa com 'use') ---------- */
  const handleUseInventoryItem = (itemId) => {
    // procura item
    const it = inventoryItems.find((i) => i.id === itemId);
    if (!it || it.qty <= 0) {
      alert("Item indisponível.");
      return;
    }

    // decrementa qty
    setInventoryItems((list) => list.map((x) => (x.id === itemId ? { ...x, qty: Math.max(0, x.qty - 1) } : x)));

    // efeitos específicos
    if (itemId === "boost_x2") {
      const expires = Date.now() + 1000 * 3600; // 1h
      setBoostExpiresAt(expires);
      // opcional: timer para notificar quando expirar
      setTimeout(() => {
        setBoostExpiresAt((prev) => (prev === expires ? null : prev));
      }, 1000 * 3600);
      alert("Boost x2 ativado por 1 hora! Tudo que você andar será contado em x2.");
    } else if (itemId === "shield_1h") {
      const expires = Date.now() + 1000 * 3600;
      setShieldExpiresAt(expires);
      setTimeout(() => {
        setShieldExpiresAt((prev) => (prev === expires ? null : prev));
      }, 1000 * 3600);
      alert("Escudo ativado por 1 hora! Você está protegido contra pareamento em batalhas.");
    } else {
      // efeito genérico (p.ex., poção)
      setBattleLog((l) => [`Usou ${it.name}`, ...l]);
      alert(`${it.name} usado.`);
    }
    setInventoryOpen(true);
  };

  /* ---------- MISSÕES: atualiza progresso com base em distanceKm ---------- */
  useEffect(() => {
    // atualiza completude das missões sempre que a distância muda
    setMissions((ms) =>
      ms.map((m) => {
        if (m.completed) return m;
        if (distanceKm >= m.targetKm) return { ...m, completed: true };
        return m;
      })
    );
  }, [distanceKm]);

  /* ---------- MATCHMAKING / BATALHA SIMULADA ---------- */
  const openMatchmaking = () => {
    setMatchmakingOpen(true);
    setMenuOpen(false);
  };

  const startSearchingBattle = () => {
    // se protegido, avisa e não inicia
    const now = Date.now();
    if (shieldExpiresAt && now < shieldExpiresAt) {
      alert("Você está protegido por um Escudo e não pode ser pareado agora.");
      return;
    }

    setSearchingBattle(true);
    setMatchedOpponent(null);

    // simula busca: delay aleatório entre 2s e 6s
    const delayMs = 2000 + Math.floor(Math.random() * 4000);

    matchmakingTimerRef.current = setTimeout(() => {
      // se durante a busca o shield foi ativado, bloqueia
      const now2 = Date.now();
      if (shieldExpiresAt && now2 < shieldExpiresAt) {
        setSearchingBattle(false);
        alert("Durante a busca seu Escudo foi ativado — busca cancelada.");
        return;
      }

      // sucesso no pareamento: cria um oponente fake
      const opponent = {
        id: "op_" + Math.floor(Math.random() * 10000),
        name: selectedMode === "Casual" ? "Henrique" : "Thiago",
        level: 8 + Math.floor(Math.random() * 10),
      };
      setMatchedOpponent(opponent);
      setSearchingBattle(false);
    }, delayMs);
  };

  const cancelSearchingBattle = () => {
    setSearchingBattle(false);
    if (matchmakingTimerRef.current) {
      clearTimeout(matchmakingTimerRef.current);
      matchmakingTimerRef.current = null;
    }
  };

  /* ---------- ACEITAR E INICIAR DUELO (substitui abrir a modal de "batalha") ---------- */
  const acceptMatchAndStartDuel = () => {
    if (!matchedOpponent) return;

    // fecha matchmaking
    setMatchmakingOpen(false);

    // marca oponente do duelo
    setDuelOpponent(matchedOpponent);
    setMatchedOpponent(null);

    // inicializa variáveis do duelo
    setDuelOpponentDistance(0);
    setDuelSecondsElapsed(0);
    setDuelActive(true);

    // limpa timers prévios se houver
    if (duelTimerRef.current) clearInterval(duelTimerRef.current);
    if (duelEndTimeoutRef.current) clearTimeout(duelEndTimeoutRef.current);

    // Simula o oponente andando: a cada 1s incrementa por uma velocidade aleatória (entre 0.8 e 1.7 m/s)
    duelTimerRef.current = setInterval(() => {
      const speed = 0.8 + Math.random() * 0.9; // ~0.8 - 1.7 m/s
      setDuelOpponentDistance((d) => {
        const next = d + speed;
        duelOpponentDistanceRef.current = next;
        return next;
      });
      setDuelSecondsElapsed((s) => s + 1);
    }, 1000);

    // Agenda término automático após DUEL_DURATION_SECONDS
    duelEndTimeoutRef.current = setTimeout(() => {
      // encerra e compara, usando refs para obter valores atualizados
      if (duelTimerRef.current) { clearInterval(duelTimerRef.current); duelTimerRef.current = null; }
      duelEndTimeoutRef.current = null;
      setDuelActive(false);

      // ler valores atualizados
      const finalPlayer = distanceRef.current || 0;
      const finalOpponent = duelOpponentDistanceRef.current || 0;

      if (finalPlayer > finalOpponent) {
        alert(`Você venceu o duelo! ${ (finalPlayer/1000).toFixed(2) } km × ${ (finalOpponent/1000).toFixed(2) } km`);
      } else if (finalPlayer < finalOpponent) {
        alert(`Você perdeu o duelo... ${ (finalPlayer/1000).toFixed(2) } km × ${ (finalOpponent/1000).toFixed(2) } km`);
      } else {
        alert(`Empate! ${ (finalPlayer/1000).toFixed(2) } km × ${ (finalOpponent/1000).toFixed(2) } km`);
      }

      // limpa estado do duelo
      setTimeout(() => {
        setDuelOpponent(null);
        setDuelOpponentDistance(0);
        setDuelSecondsElapsed(0);
      }, 300);
    }, DUEL_DURATION_SECONDS * 1000);
  };

  const declineMatch = () => {
    setMatchedOpponent(null);
    // por enquanto apenas cancela
  };

  // batalha: mantive as ações simples caso queira manter log (não usado no duelo)
  const handleBattleAction = (action) => {
    if (!battleActive) {
      setBattleActive(true);
    }
    if (action === "attack") {
      const dmg = Math.floor(Math.random() * 20) + 6;
      setEnemyHp((h) => Math.max(0, h - dmg));
      setBattleLog((l) => [`Você atacou e causou ${dmg} de dano.`, ...l]);
    } else if (action === "defend") {
      setBattleLog((l) => ["Você se defendeu, reduzindo o próximo dano.", ...l]);
    } else if (action === "run") {
      setBattleActive(false);
      setBattleOpen(false);
      setBattleLog((l) => ["Você fugiu da batalha.", ...l]);
      return;
    }

    // inimigo revida
    const enemyDmg = Math.floor(Math.random() * 18) + 4;
    setPlayerHp((h) => Math.max(0, h - enemyDmg));
    setBattleLog((l) => [`Inimigo revidou e causou ${enemyDmg} de dano.`, ...l]);

    // checa fim imediato
    setTimeout(() => {
      setEnemyHp((hp) => {
        if (hp <= 0) {
          setBattleLog((l) => ["Inimigo derrotado!", ...l]);
          setBattleActive(false);
          setBattleOpen(false);
        }
        return hp;
      });
      setPlayerHp((hp) => {
        if (hp <= 0) {
          setBattleLog((l) => ["Você foi derrotado...", ...l]);
          setBattleActive(false);
          setBattleOpen(false);
        }
        return hp;
      });
    }, 50);
  };

  /* ---------- HANDLERS de profile (mantidos) ---------- */
  const openProfile = () => setProfileOpen(true);
  const closeProfile = () => setProfileOpen(false);
  const handleAvatarUpload = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setProfileAvatar(url);
  };
  const handleSaveClan = () => {
    setSavedClan(clan);
    try { localStorage.setItem("game_profile_clan", clan); } catch (e) {}
    alert("Clan salvo!");
  };

  /* ---------- RENDER ---------- */
  if (!isLoaded) {
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #1a0f0a 0%, #3d2817 50%, #1a0f0a 100%)",
        color: "#d4af37",
        fontFamily: "'Cinzel', 'Georgia', serif",
        fontSize: "20px",
      }}>
        ⚔️ Carregando mapa...
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      {/* MAP */}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={current ?? centerDefault}
        zoom={16}
        onLoad={(map) => (mapRef.current = map)}
        options={{ disableDefaultUI: true, zoomControl: false, mapTypeControl: false, streetViewControl: false, fullscreenControl: false, styles: mapStyles }}
      >
        {current && (
          <Marker
            position={current}
            icon={{
              url: require("./assets/pessoa1.png"),
              scaledSize: new window.google.maps.Size(60, 60),
              anchor: new window.google.maps.Point(30, 60),
            }}
          />
        )}
        {route.length > 1 && (
          <>
            {/* faixa estilo Waze: sombra + faixa interna */}
            <Polyline path={route} options={{ strokeColor: "#0a0a0a", strokeWeight: 16, strokeOpacity: 0.65, geodesic: false }} />
            <Polyline path={route} options={{ strokeColor: "#00e5ff", strokeWeight: 10, strokeOpacity: 0.95, geodesic: false }} />
          </>
        )}
      </GoogleMap>

      {/* AVATAR */}
      <div
        style={{
          position: "fixed", top: "20px", left: "20px", width: "60px", height: "60px", borderRadius: "50%",
          background: "linear-gradient(135deg, #8b6f47 0%, #4a2f1a 100%)", border: "3px solid #d4af37",
          boxShadow: "0 4px 15px rgba(0,0,0,0.6), inset 0 2px 5px rgba(0,0,0,0.3)",
          display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer",
          transition: "all 0.3s ease", zIndex: 1000,
        }}
        onClick={openProfile}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(212,175,55,0.5), inset 0 2px 5px rgba(0,0,0,0.3)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 15px rgba(0,0,0,0.6), inset 0 2px 5px rgba(0,0,0,0.3)"; }}
      >
        <svg width="35" height="35" viewBox="0 0 100 100">
          <circle cx="50" cy="35" r="20" fill="#d4af37" />
          <path d="M 30 85 Q 30 60 50 60 Q 70 60 70 85 Z" fill="#d4af37" />
        </svg>
      </div>

      {/* Painel info (tempo, km, pontos, calorias) */}
      <div style={{
        position: "fixed", top: "20px", right: "20px", background: "linear-gradient(180deg, rgba(45,24,16,0.95) 0%, rgba(31,15,8,0.95) 100%)",
        padding: "12px 18px", borderRadius: "8px", border: "2px solid #8b6f47", boxShadow: "0 4px 15px rgba(0,0,0,0.6)",
        fontFamily: "'Cinzel', 'Georgia', serif", color: "#d4af37", fontSize: "14px", minWidth: "180px", zIndex: 1000,
      }}>
        <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
          <span>⏱️</span><span style={{ fontWeight: "bold" }}>{formatElapsed(elapsedSeconds)}</span>
        </div>
        <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
          <span>🗺️</span><span style={{ fontWeight: "bold" }}>{distanceKm.toFixed(2)} km</span>
        </div>
        <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
          <span>🔥</span><span style={{ fontWeight: "bold" }}>{calories.toFixed(0)} kcal</span>
        </div>

        {/* Exibe status de efeitos */}
        <div style={{ marginTop: 8, fontSize: 12, color: "#e8d7b0" }}>
          {boostExpiresAt && Date.now() < boostExpiresAt && <div>✨ Boost ativo até {new Date(boostExpiresAt).toLocaleTimeString()}</div>}
          {shieldExpiresAt && Date.now() < shieldExpiresAt && <div>🛡️ Escudo ativo até {new Date(shieldExpiresAt).toLocaleTimeString()}</div>}
        </div>
      </div>

      {/* DUEL PANEL — aparece quando duelActive === true */}
      {duelActive && duelOpponent && (
        <div style={{
          position: "fixed",
          top: "160px",
          right: "20px",
          zIndex: 1150,
          background: "linear-gradient(180deg, rgba(45,24,16,0.95), rgba(31,15,8,0.95))",
          color: "#ffd27a",
          border: "2px solid #8b6f47",
          padding: "10px 14px",
          borderRadius: 10,
          minWidth: "220px",
          boxShadow: "0 6px 20px rgba(0,0,0,0.6)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontWeight: 700 }}>{duelOpponent.name}</div>
            <div style={{ fontSize: 12, color: "#e8d7b0" }}>{Math.floor(duelSecondsElapsed/60)}:{String(duelSecondsElapsed%60).padStart(2,'0')}</div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
            <div style={{ color: "#e8d7b0" }}>Você</div>
            <div style={{ fontWeight: 700 }}>{(distance/1000).toFixed(2)} km</div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <div style={{ color: "#e8d7b0" }}>{duelOpponent.name}</div>
            <div style={{ fontWeight: 700 }}>{(duelOpponentDistance/1000).toFixed(2)} km</div>
          </div>

          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <button onClick={() => { endDuelAndReport("stopped"); }} style={{ flex: 1, padding: "8px 10px", borderRadius: 8, background: "linear-gradient(135deg,#e53935 0%,#b71c1c 100%)", border: "none", color: "#fff", cursor: "pointer" }}>
              Encerrar
            </button>
            <div style={{ alignSelf: "center", color: "#e8d7b0", fontSize: 12 }}>⏳ {(DUEL_DURATION_SECONDS - duelSecondsElapsed)}s</div>
          </div>
        </div>
      )}

      {/* Botão central / menu */}
      <div style={{ position: "fixed", bottom: "30px", left: "50%", transform: "translateX(-50%)", zIndex: 1000 }}>
        {menuOpen && (
          <div style={{
            position: "absolute",
            bottom: "90px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            animation: "fadeInUp 0.3s ease",
          }}>
            <MenuButton
              icon="🎒"
              label="Inventário"
              onClick={() => { setInventoryOpen(true); setMenuOpen(false); }}
            />
            <MenuButton
              icon="📜"
              label="Missões"
              onClick={() => { setQuestsOpen(true); setMenuOpen(false); }}
            />
            <MenuButton
              icon="⚔️"
              label="Batalha"
              onClick={() => { openMatchmaking(); }}
            />
          </div>
        )}

        <div onClick={() => setMenuOpen(!menuOpen)} style={{
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
        }}>
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

      {/* PROFILE MODAL (mantido) */}
      {profileOpen && (
        <div className="modal-backdrop" onClick={closeProfile} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{
            width: "min(820px, 92%)", background: "linear-gradient(180deg, #2b1a12 0%, #3b2818 100%)", border: "3px solid #d4af37", borderRadius: 12, padding: 20,
            display: "flex", gap: 20, boxShadow: "0 10px 40px rgba(0,0,0,0.7)", color: "#d4af37", fontFamily: "'Cinzel', 'Georgia', serif",
          }}>
            <div style={{ minWidth: 160, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div style={{ width: 140, height: 140, borderRadius: 12, overflow: "hidden", border: "3px solid rgba(212,175,55,0.8)", display: "flex", justifyContent: "center", alignItems: "center", background: "#2b2118" }}>
                {profileAvatar ? <img src={profileAvatar} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (
                  <svg width="80" height="80" viewBox="0 0 100 100"><circle cx="50" cy="35" r="20" fill="#d4af37" /><path d="M 30 85 Q 30 60 50 60 Q 70 60 70 85 Z" fill="#d4af37" /></svg>
                )}
              </div>
              <label style={{ cursor: "pointer", fontSize: 13, padding: "6px 10px", borderRadius: 8, border: "1px solid #8b6f47", background: "rgba(0,0,0,0.2)" }}>
                Trocar foto
                <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: "none" }} />
              </label>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#ffd27a" }}>Olá, {profileName}</div>
                  <div style={{ marginTop: 6, fontSize: 13, color: "#e8d7b0" }}>Bem-vindo ao seu perfil de aventureiro</div>
                </div>
                <button onClick={closeProfile} style={{ background: "transparent", border: "none", color: "#d4af37", fontSize: 22, cursor: "pointer" }} aria-label="Fechar">×</button>
              </div>

              <div>
                <div style={{ fontSize: 13, color: "#e8d7b0", marginBottom: 8 }}>Medalhas</div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", padding: 8, borderRadius: 8, background: "rgba(0,0,0,0.15)", border: "1px solid rgba(139,111,71,0.3)" }}>
                    <span style={{ fontSize: 20 }}>🏆</span><div style={{ fontSize: 13 }}>Campeão</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", padding: 8, borderRadius: 8, background: "rgba(0,0,0,0.15)", border: "1px solid rgba(139,111,71,0.3)" }}>
                    <span style={{ fontSize: 20 }}>⚔️</span><div style={{ fontSize: 13 }}>Conquistador</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", padding: 8, borderRadius: 8, background: "rgba(0,0,0,0.15)", border: "1px solid rgba(139,111,71,0.3)" }}>
                    <span style={{ fontSize: 20 }}>🗺️</span><div style={{ fontSize: 13 }}>Explorador</div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 13, color: "#e8d7b0" }}>🛡️ CLAN</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 20 }}>🔰</span><div style={{ fontSize: 13 }}>BRAZUKAS</div>
                </div>

              </div>

              <div style={{ marginTop: "auto", display: "flex", gap: 12 }}>
                <div style={{ flex: 1, padding: 10, borderRadius: 8, background: "rgba(0,0,0,0.12)", border: "1px solid rgba(139,111,71,0.15)" }}>
                  <div style={{ fontSize: 12, color: "#e8d7b0" }}>Tempo registrado</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#ffd27a" }}>{formatElapsed(elapsedSeconds)}</div>
                </div>
                <div style={{ flex: 1, padding: 10, borderRadius: 8, background: "rgba(0,0,0,0.12)", border: "1px solid rgba(139,111,71,0.15)" }}>
                  <div style={{ fontSize: 12, color: "#e8d7b0" }}>Quilometragem</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#ffd27a" }}>{distanceKm.toFixed(2)} km</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INVENTORY MODAL */}
      {inventoryOpen && (
        <div className="modal-backdrop" onClick={() => setInventoryOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: "min(720px, 94%)", background: "linear-gradient(180deg,#2b1a12 0%,#3b2818 100%)", border: "3px solid #d4af37", borderRadius: 12, padding: 18, color: "#d4af37", fontFamily: "'Cinzel', 'Georgia', serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#ffd27a" }}>Inventário</div>
              <button onClick={() => setInventoryOpen(false)} style={{ background: "transparent", border: "none", color: "#d4af37", fontSize: 22, cursor: "pointer" }}>×</button>
            </div>

            <div className="inventory-grid">
  {inventoryItems.map((it) => (
    <div
      key={it.id}
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        padding: 10,
        borderRadius: 8,
        background: "rgba(0,0,0,0.12)",
        border: "1px solid rgba(139,111,71,0.12)"
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 8,
          background: "rgba(0,0,0,0.2)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: 24,
          flexShrink: 0
        }}
      >
        {it.id === "boost_x2" ? "⚡" : it.id === "shield_1h" ? "🛡️" : "⚗️"}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, color: "#ffd27a" }}>
          {it.name}{" "}
          <span style={{ fontWeight: 400, color: "#e8d7b0" }}>
            x{it.qty}
          </span>
        </div>
        <div style={{ fontSize: 12, color: "#e8d7b0" }}>
          {it.desc}
        </div>
      </div>

      <div>
        {/* botão USAR em branco conforme solicitado */}
        <button
          onClick={() => handleUseInventoryItem(it.id)}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background: "#d4af37",
            border: "1px solid #d4af37",
            cursor: "pointer",
            fontWeight: "700",
            color: "#2b1a12"
          }}
          disabled={it.qty <= 0}
        >
          Usar
        </button>
      </div>
    </div>
  ))}
</div>

          </div>
        </div>
      )}

      {/* MISSIONS MODAL */}
      {questsOpen && (
        <div className="modal-backdrop" onClick={() => setQuestsOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: "min(640px, 94%)", background: "linear-gradient(180deg,#2b1a12 0%,#3b2818 100%)", border: "3px solid #d4af37", borderRadius: 12, padding: 18, color: "#d4af37", fontFamily: "'Cinzel', 'Georgia', serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#ffd27a" }}>Missões</div>
              <button onClick={() => setQuestsOpen(false)} style={{ background: "transparent", border: "none", color: "#d4af37", fontSize: 22, cursor: "pointer" }}>×</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {missions.map((m) => {
                const progress = Math.min(1, distanceKm / m.targetKm);
                const percent = Math.round(progress * 100);
                return (
                  <div key={m.id} style={{ padding: 12, borderRadius: 8, background: "rgba(0,0,0,0.12)", border: "1px solid rgba(139,111,71,0.12)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontWeight: 700, color: "#ffd27a" }}>{m.title}</div>
                      <div style={{ fontSize: 13, color: "#e8d7b0" }}>{percent}%</div>
                    </div>
                    <div style={{ marginTop: 8, height: 10, background: "rgba(0,0,0,0.08)", borderRadius: 6, overflow: "hidden" }}>
                      <div style={{ width: `${percent}%`, height: "100%", background: "linear-gradient(90deg,#ffd27a,#b8941f)", borderRadius: 6 }} />
                    </div>
                    {m.completed && <div style={{ marginTop: 8, fontSize: 13, color: "#cfe8c9" }}>Concluída ✅</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MATCHMAKING / BATTLE SEARCH MODAL - LAYOUT AJUSTADO: botão em linha separada */}
      {matchmakingOpen && (
        <div className="modal-backdrop" onClick={() => { setMatchmakingOpen(false); cancelSearchingBattle(); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: "min(680px,94%)", background: "linear-gradient(180deg,#2b1a12 0%,#3b2818 100%)", border: "3px solid #d4af37", borderRadius: 12, padding: 18, color: "#d4af37", fontFamily: "'Cinzel', 'Georgia', serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#ffd27a" }}>Buscar Batalha</div>
              <button onClick={() => { setMatchmakingOpen(false); cancelSearchingBattle(); }} style={{ background: "transparent", border: "none", color: "#d4af37", fontSize: 22, cursor: "pointer" }}>×</button>
            </div>

            {/* Conteúdo reorganizado em coluna: modos em cima, ação (buscar) em linha abaixo, depois status/resultado */}
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Linha superior: seleção de modo */}
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <label style={{ fontSize: 13, color: "#e8d7b0" }}>Modo:</label>
                  <select value={selectedMode} onChange={(e) => setSelectedMode(e.target.value)} style={{ padding: "6px 8px", borderRadius: 6, background: "rgba(0,0,0,0.15)", border: "1px solid #8b6f47", color: "#d4af37" }}>
                    <option>Casual</option>
                    <option>Ranqueada</option>
                  </select>
                </div>
              </div>

              {/* Linha de ação: botão BUSCAR ocupa 100% da largura */}
              <div>
                {!searchingBattle && !matchedOpponent && (
                  <button onClick={startSearchingBattle} style={{ width: "100%", padding: "12px 14px", borderRadius: 8, background: "#d4af37", border: "1px solid #2b1a12", cursor: "pointer", fontWeight: 700, color: "#2b1a12" }}>
                    Buscar jogador
                  </button>
                )}

                {searchingBattle && (
                  <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ fontSize: 13, color: "#e8d7b0" }}>Buscando jogador...</div>
                      <div style={{ width: 18, height: 18, border: "3px solid rgba(212,175,55,0.2)", borderTopColor: "#ffd27a", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                    </div>
                    <div>
                      <button onClick={cancelSearchingBattle} style={{ padding: "8px 12px", borderRadius: 8, background: "transparent", border: "1px solid #8b6f47", color: "#d4af37" }}>Cancelar</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Linha de resultado: aparece após a busca (aceitar/recusar) */}
              <div>
                {matchedOpponent && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "stretch", justifyContent: "center", padding: 12, borderRadius: 8, background: "rgba(0,0,0,0.12)", border: "1px solid rgba(139,111,71,0.12)" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontWeight: 700, color: "#ffd27a" }}>{matchedOpponent.name}</div>
                      <div style={{ fontSize: 13, color: "#e8d7b0" }}>Nível {matchedOpponent.level}</div>
                    </div>

                    <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 6 }}>
                      {/* botões Aceitar/Recusar em branco com texto escuro */}
                      <button onClick={acceptMatchAndStartDuel} style={{ padding: "8px 12px", borderRadius: 8, background: "#09c003ff", border: "1px solid rgba(0,0,0,0.08)", cursor: "pointer", fontWeight: 700, color: "#ffffffff" }}>
                        Aceitar
                      </button>
                      <button onClick={declineMatch} style={{ padding: "8px 12px", borderRadius: 8, background: "#ce0303ff", border: "1px solid rgba(0,0,0,0.08)", cursor: "pointer", fontWeight: 700, color: "#f8f8f8ff" }}>
                        Recusar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      )}

      {/* BATTLE MODAL (mantido para compatibilidade, mas normalmente não será usado no novo fluxo) */}
      {battleOpen && (
        <div className="modal-backdrop" onClick={() => { setBattleOpen(false); setBattleActive(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 3000 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: "min(720px, 96%)", background: "linear-gradient(180deg,#2b1a12 0%,#3b2818 100%)", border: "3px solid #d4af37", borderRadius: 12, padding: 18, color: "#d4af37", fontFamily: "'Cinzel', 'Georgia', serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#ffd27a" }}>Batalha</div>
              <button onClick={() => { setBattleOpen(false); setBattleActive(false); }} style={{ background: "transparent", border: "none", color: "#d4af37", fontSize: 22, cursor: "pointer" }}>×</button>
            </div>

            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ flex: 1, padding: 12, borderRadius: 8, background: "rgba(0,0,0,0.12)", border: "1px solid rgba(139,111,71,0.12)" }}>
                <div style={{ fontSize: 13, color: "#e8d7b0" }}>Inimigo</div>
                <div style={{ fontWeight: 700, color: "#ffd27a", fontSize: 18 }}>Oponente</div>
                <div style={{ marginTop: 8 }}>HP: <span style={{ color: "#ffd27a", fontWeight: 700 }}>{enemyHp}</span></div>
              </div>

              <div style={{ flex: 1, padding: 12, borderRadius: 8, background: "rgba(0,0,0,0.12)", border: "1px solid rgba(139,111,71,0.12)" }}>
                <div style={{ fontSize: 13, color: "#e8d7b0" }}>Você</div>
                <div style={{ fontWeight: 700, color: "#ffd27a", fontSize: 18 }}>Aventureiro</div>
                <div style={{ marginTop: 8 }}>HP: <span style={{ color: "#ffd27a", fontWeight: 700 }}>{playerHp}</span></div>
              </div>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
              <button onClick={() => handleBattleAction("attack")} style={{ padding: "10px 14px", borderRadius: 8, background: "linear-gradient(135deg,#d4af37 0%,#b8941f 100%)", border: "none", cursor: "pointer", fontWeight: 700 }}>Atacar</button>
              <button onClick={() => handleBattleAction("defend")} style={{ padding: "10px 14px", borderRadius: 8, background: "transparent", border: "1px solid #8b6f47", color: "#d4af37", cursor: "pointer" }}>Defender</button>
              <button onClick={() => handleBattleAction("run")} style={{ padding: "10px 14px", borderRadius: 8, background: "linear-gradient(135deg,#e53935 0%,#b71c1c 100%)", border: "none", cursor: "pointer", fontWeight: 700 }}>Fugir</button>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, color: "#e8d7b0", marginBottom: 8 }}>Registro de combate</div>
              <div style={{ maxHeight: 140, overflowY: "auto", padding: 10, borderRadius: 8, background: "rgba(0,0,0,0.08)", border: "1px solid rgba(139,111,71,0.08)" }}>
                {battleLog.length === 0 ? <div style={{ color: "#c9b78f" }}>Sem eventos ainda.</div> : battleLog.map((l, i) => <div key={i} style={{ fontSize: 13, color: "#e8d7b0" }}>{l}</div>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fonte e animação + estilos responsivos para modais */}
      <style>{`
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');
  @keyframes fadeInUp { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* backdrop geral: centraliza e permite padding para mobile */
  .modal-backdrop {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 16px;
    box-sizing: border-box;
  }

  /* conteúdo dos modais: caixa flutuante, com limites de tamanho e scroll interno */
  .modal-content {
    width: 720px;                 /* tamanho base para desktop */
    max-width: calc(100% - 48px); /* sempre respeita a tela */
    max-height: 80vh;             /* nunca ultrapassa 80% da altura da tela */
    overflow: auto;               /* scroll interno se necessário */
    box-sizing: border-box;
    border-radius: 12px;
    padding: 18px;
    background: linear-gradient(180deg,#2b1a12 0%,#3b2818 100%);
    border: 3px solid #d4af37;
    color: #d4af37;
    font-family: 'Cinzel', 'Georgia', serif;
    box-shadow: 0 10px 40px rgba(0,0,0,0.7);
  }

  /* se você usa estilos inline nos elementos, esta regra garante overflow dentro dos painéis */
  .modal-content .scrollable {
    overflow: auto;
    max-height: 64vh;
  }

  /* inventário: grid padrão 2 colunas */
  .modal-content .inventory-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  /* botões dentro do modal: toca facil no mobile */
  .modal-content button {
    min-height: 44px;
    min-width: 64px;
  }

  /* MOBILE: caixas continuam flutuantes, mas mais estreitas e mais altas (sem ocupar 100% da tela) */
  @media (max-width: 430px) {
    .modal-backdrop {
      align-items: center;
      padding: 10px;
    }
    .modal-content {
      width: calc(100% - 24px); /* bem encaixado à margem lateral */
      max-width: calc(100% - 24px);
      max-height: 86vh;         /* permite barra de status / notch */
      border-radius: 10px;
      padding: 14px;
    }

    /* Inventário: 1 coluna para melhor leitura */
    .modal-content .inventory-grid {
      grid-template-columns: 1fr;
    }

    /* reduz gaps em áreas com muitas linhas para caber melhor */
    .modal-content { gap: 10px; }

    /* aumenta legibilidade dos títulos e botões */
    .modal-content h1, .modal-content h2, .modal-content h3 {
      font-size: 18px;
    }

    /* garante que botões brancos com texto escuro fiquem legíveis e com padding maior */
    .modal-content button {
      padding: 12px 14px !important;
      font-size: 16px !important;
    }
  }

  /*  tablet / médio */
  @media (min-width: 431px) and (max-width: 1024px) {
    .modal-content {
      width: min(720px, 92%);
      max-height: 84vh;
      padding: 16px;
    }
  }
`}</style>
    </div>
  );
}
