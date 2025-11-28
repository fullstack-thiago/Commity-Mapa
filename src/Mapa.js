import React, { useState, useEffect, useRef } from "react";
import {
  GoogleMap,
  Marker,
  Polyline,
  Polygon,
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
  const [route, setRoute] = useState([]); // raw GPS points
  const [routeSnapped, setRouteSnapped] = useState([]); // route after snap-to-roads
  const [roadPolygon, setRoadPolygon] = useState([]); // polygon coordinates for "filled" road
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
  ]);

  // efeitos ativos: guardamos timestamps (ms) de expiração
  const [boostExpiresAt, setBoostExpiresAt] = useState(null);
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
  const [duelOpponent, setDuelOpponent] = useState(null);
  const [duelOpponentDistance, setDuelOpponentDistance] = useState(0);
  const duelTimerRef = useRef(null);
  const duelEndTimeoutRef = useRef(null);
  const DUEL_DURATION_SECONDS = 10 * 60;
  const [duelSecondsElapsed, setDuelSecondsElapsed] = useState(0);

  // Batalha real state
  const [battleLog, setBattleLog] = useState([]);
  const [enemyHp, setEnemyHp] = useState(100);
  const [playerHp, setPlayerHp] = useState(100);
  const [battleActive, setBattleActive] = useState(false);

  // Google maps loader: adicionamos 'geometry' porque vamos usar computeOffset
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyDRxsExWSYPrpobbvyd1sIm0lUPa1OKbAo",
    libraries: ["geometry"],
  });

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

  // ------------------ SNAP-TO-ROADS + ROAD POLYGON ------------------
  // Ajuste estes valores conforme desejado:
  const SNAP_BATCH_SIZE = 8; // quantos pontos por chamada snap
  const SNAP_DELAY_MS = 700; // debounce/espera entre snaps (para não chamar toda posição)
  const ROAD_HALF_WIDTH_METERS = 6; // metade da largura do "preenchimento" da rua

  const snapQueueRef = useRef([]); // acumula pontos para enviar em batch
  const snapTimerRef = useRef(null);

  // Constrói string path para Roads API (lat,lng|lat,lng)
  function buildPathParam(points) {
    return points.map((p) => `${p.lat},${p.lng}`).join("|");
  }

  // Chama Google Roads API Snap to Roads (interpolate=true)
  async function snapToRoadsBatch(points) {
    if (!points || points.length === 0) return [];
    const key = "AIzaSyDRxsExWSYPrpobbvyd1sIm0lUPa1OKbAo"; // sua chave (atenção ao uso em cliente)
    const path = buildPathParam(points);
    try {
      const url = `https://roads.googleapis.com/v1/snapToRoads?path=${encodeURIComponent(path)}&interpolate=true&key=${key}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.warn("Roads API erro:", res.status, await res.text());
        return [];
      }
      const data = await res.json();
      if (!data.snappedPoints) return [];
      // transforma em [{lat,lng}, ...] na ordem retornada
      const snapped = data.snappedPoints.map((sp) => ({
        lat: sp.location.latitude,
        lng: sp.location.longitude,
      }));
      return snapped;
    } catch (e) {
      console.error("Erro snapToRoads:", e);
      return [];
    }
  }

  // Cria polígono "buffer" a partir do path, largura em metros
  function createRoadPolygonFromPath(path, halfWidthMeters = ROAD_HALF_WIDTH_METERS) {
    if (!isLoaded || !path || path.length < 2) return [];
    const left = [];
    const right = [];
    for (let i = 0; i < path.length; i++) {
      const curr = path[i];
      // definir heading: se houver próximo, use heading para próximo; senão use heading do anterior
      let heading;
      if (i < path.length - 1) {
        heading = window.google.maps.geometry.spherical.computeHeading(curr, path[i + 1]);
      } else {
        heading = window.google.maps.geometry.spherical.computeHeading(path[i - 1], curr);
      }
      // perpendiculars:
      const leftPoint = window.google.maps.geometry.spherical.computeOffset(curr, halfWidthMeters, heading - 90);
      const rightPoint = window.google.maps.geometry.spherical.computeOffset(curr, halfWidthMeters, heading + 90);
      left.push(leftPoint);
      right.push(rightPoint);
    }
    // polygon path: left side forward + right side reversed
    const rightReversed = right.slice().reverse();
    const polygonCoords = left.concat(rightReversed).map((pt) => ({ lat: pt.lat(), lng: pt.lng() }));
    return polygonCoords;
  }

  // Enfileira pontos para snap (chamado a cada novo GPS)
  function enqueueSnapPoint(pt) {
    snapQueueRef.current.push(pt);
    if (snapQueueRef.current.length >= SNAP_BATCH_SIZE) {
      // dispara imediatamente
      flushSnapQueue();
      return;
    }
    // caso contrário, agendar flush após SNAP_DELAY_MS
    if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
    snapTimerRef.current = setTimeout(() => {
      flushSnapQueue();
    }, SNAP_DELAY_MS);
  }

  async function flushSnapQueue() {
    if (!snapQueueRef.current || snapQueueRef.current.length === 0) return;
    const batch = snapQueueRef.current.splice(0, snapQueueRef.current.length);
    if (batch.length === 0) return;
    const snapped = await snapToRoadsBatch(batch);
    if (snapped && snapped.length > 0) {
      // mesclar snapped com routeSnapped mantendo ordem e evitando duplicatas próximas
      setRouteSnapped((prev) => {
        const merged = prev.concat(snapped);
        // opcional: remover pontos duplicados muito próximos
        const filtered = [];
        for (let p of merged) {
          if (filtered.length === 0) filtered.push(p);
          else {
            const last = filtered[filtered.length - 1];
            if (haversineMeters(last, p) > 0.6) filtered.push(p); // > 0.6m
          }
        }
        // atualizar polygon com base no filtered
        const polygonCoords = createRoadPolygonFromPath(filtered, ROAD_HALF_WIDTH_METERS);
        setRoadPolygon(polygonCoords);
        return filtered;
      });
    } else {
      // se snap falhar, usamos o batch raw (fallback)
      setRouteSnapped((prev) => {
        const merged = prev.concat(batch);
        const polygonCoords = createRoadPolygonFromPath(merged, ROAD_HALF_WIDTH_METERS);
        setRoadPolygon(polygonCoords);
        return merged;
      });
    }
  }

  // ------------------ TRACKING ------------------
  const beginTrackingImmediate = () => {
    if (!navigator.geolocation) return alert("Geolocalização não suportada pelo navegador.");
    setRoute([]); setRouteSnapped([]); setRoadPolygon([]); setDistance(0); setElapsedSeconds(0);

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
              setBoostExpiresAt(null);
            }

            setDistance((d) => d + meters);
          }

          // enfileira para snap
          enqueueSnapPoint(coords);

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

  // Novo: overlay/contagem
  const [countdownVisible, setCountdownVisible] = useState(false);
  const [countdownValue, setCountdownValue] = useState("");
  const countdownTimersRef = useRef([]);

  const startWithCountdown = () => {
    if (tracking) return;
    countdownTimersRef.current.forEach((t) => clearTimeout(t));
    countdownTimersRef.current = [];

    const sequence = ["3", "2", "1", "GO"];
    setCountdownVisible(true);

    sequence.forEach((label, idx) => {
      const t = setTimeout(() => {
        setCountdownValue(label);
      }, idx * 900);
      countdownTimersRef.current.push(t);
    });

    const finalTimeout = setTimeout(() => {
      setCountdownVisible(false);
      setCountdownValue("");
      countdownTimersRef.current = [];
      beginTrackingImmediate();
    }, sequence.length * 900);
    countdownTimersRef.current.push(finalTimeout);
  };

  const endDuelAndReport = (reason = "final") => {
    if (duelTimerRef.current) { clearInterval(duelTimerRef.current); duelTimerRef.current = null; }
    if (duelEndTimeoutRef.current) { clearTimeout(duelEndTimeoutRef.current); duelEndTimeoutRef.current = null; }

    const playerMeters = distanceRef.current || 0;
    const opponentMeters = duelOpponentDistanceRef.current || 0;

    setDuelActive(false);

    if (reason === "stopped") {
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

    setTimeout(() => {
      setDuelOpponent(null);
      setDuelOpponentDistance(0);
      setDuelSecondsElapsed(0);
    }, 300);
  };

  const stopTracking = () => {
    if (countdownTimersRef.current.length > 0) {
      countdownTimersRef.current.forEach((t) => clearTimeout(t));
      countdownTimersRef.current = [];
      setCountdownVisible(false);
      setCountdownValue("");
    }

    if (watchId.current !== null) { navigator.geolocation.clearWatch(watchId.current); watchId.current = null; }
    if (timerRef.current !== null) { clearInterval(timerRef.current); timerRef.current = null; }
    setTracking(false);

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
    const it = inventoryItems.find((i) => i.id === itemId);
    if (!it || it.qty <= 0) {
      alert("Item indisponível.");
      return;
    }

    setInventoryItems((list) => list.map((x) => (x.id === itemId ? { ...x, qty: Math.max(0, x.qty - 1) } : x)));

    if (itemId === "boost_x2") {
      const expires = Date.now() + 1000 * 3600;
      setBoostExpiresAt(expires);
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
      setBattleLog((l) => [`Usou ${it.name}`, ...l]);
      alert(`${it.name} usado.`);
    }
    setInventoryOpen(true);
  };

  /* ---------- MISSÕES: atualiza progresso com base em distanceKm ---------- */
  useEffect(() => {
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
    const now = Date.now();
    if (shieldExpiresAt && now < shieldExpiresAt) {
      alert("Você está protegido por um Escudo e não pode ser pareado agora.");
      return;
    }

    setSearchingBattle(true);
    setMatchedOpponent(null);

    const delayMs = 2000 + Math.floor(Math.random() * 4000);

    matchmakingTimerRef.current = setTimeout(() => {
      const now2 = Date.now();
      if (shieldExpiresAt && now2 < shieldExpiresAt) {
        setSearchingBattle(false);
        alert("Durante a busca seu Escudo foi ativado — busca cancelada.");
        return;
      }

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

    setMatchmakingOpen(false);

    setDuelOpponent(matchedOpponent);
    setMatchedOpponent(null);

    setDuelOpponentDistance(0);
    setDuelSecondsElapsed(0);
    setDuelActive(true);

    if (duelTimerRef.current) clearInterval(duelTimerRef.current);
    if (duelEndTimeoutRef.current) clearTimeout(duelEndTimeoutRef.current);

    duelTimerRef.current = setInterval(() => {
      const speed = 0.8 + Math.random() * 0.9;
      setDuelOpponentDistance((d) => {
        const next = d + speed;
        duelOpponentDistanceRef.current = next;
        return next;
      });
      setDuelSecondsElapsed((s) => s + 1);
    }, 1000);

    duelEndTimeoutRef.current = setTimeout(() => {
      if (duelTimerRef.current) { clearInterval(duelTimerRef.current); duelTimerRef.current = null; }
      duelEndTimeoutRef.current = null;
      setDuelActive(false);

      const finalPlayer = distanceRef.current || 0;
      const finalOpponent = duelOpponentDistanceRef.current || 0;

      if (finalPlayer > finalOpponent) {
        alert(`Você venceu o duelo! ${ (finalPlayer/1000).toFixed(2) } km × ${ (finalOpponent/1000).toFixed(2) } km`);
      } else if (finalPlayer < finalOpponent) {
        alert(`Você perdeu o duelo... ${ (finalPlayer/1000).toFixed(2) } km × ${ (finalOpponent/1000).toFixed(2) } km`);
      } else {
        alert(`Empate! ${ (finalPlayer/1000).toFixed(2) } km × ${ (finalOpponent/1000).toFixed(2) } km`);
      }

      setTimeout(() => {
        setDuelOpponent(null);
        setDuelOpponentDistance(0);
        setDuelSecondsElapsed(0);
      }, 300);
    }, DUEL_DURATION_SECONDS * 1000);
  };

  const declineMatch = () => {
    setMatchedOpponent(null);
  };

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

    const enemyDmg = Math.floor(Math.random() * 18) + 4;
    setPlayerHp((h) => Math.max(0, h - enemyDmg));
    setBattleLog((l) => [`Inimigo revidou e causou ${enemyDmg} de dano.`, ...l]);

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

        {/* ROAD POLYGON (preenchimento estilo waze) */}
        {roadPolygon && roadPolygon.length > 2 && (
          <Polygon
            paths={roadPolygon}
            options={{
              strokeOpacity: 0.0,
              fillColor: "#00e5ff",
              fillOpacity: 0.16,
              clickable: false,
              zIndex: 2,
            }}
          />
        )}

        {/* faixa estilo Waze: sombra + faixa interna */}
        {(routeSnapped.length > 1 || route.length > 1) && (
          <>
            {/* sombra larga (vai por cima do polygon para dar borda escura) */}
            <Polyline
              path={routeSnapped.length > 1 ? routeSnapped : route}
              options={{ strokeColor: "#0a0a0a", strokeWeight: 16, strokeOpacity: 0.75, geodesic: false, zIndex: 5 }}
            />
            <Polyline
              path={routeSnapped.length > 1 ? routeSnapped : route}
              options={{ strokeColor: "#00e5ff", strokeWeight: 10, strokeOpacity: 0.98, geodesic: false, zIndex: 6 }}
            />
          </>
        )}
      </GoogleMap>

      {/* Contagem animada overlay */}
      {countdownVisible && (
        <div
          aria-live="polite"
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 4000,
            pointerEvents: "none",
          }}
        >
          <div
  className={`countdown-item ${countdownValue === "GO" ? "go" : ""}`}
  key={countdownValue}
  style={{
    fontFamily: "'Cinzel', 'Georgia', serif",
    fontWeight: 900,
    fontSize: "clamp(48px, 18vw, 220px)",
    lineHeight: 1,
    color: countdownValue === "GO" ? "#00FFCC" : "#ffd27a",
    textShadow: "0 6px 30px rgba(0,0,0,0.7), 0 2px 6px rgba(0,0,0,0.6)",
    transformOrigin: "center",
    userSelect: "none",
    pointerEvents: "none",
    animation: "pop 820ms cubic-bezier(.2,.9,.2,1)",
  }}
>
  {countdownValue}
</div>
        </div>
      )}

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
        padding: "12px 18px", borderRadius: "12px", border: "2px solid #8b6f47", boxShadow: "0 4px 15px rgba(0,0,0,0.6)",
        fontFamily: "'Cinzel', 'Georgia', serif", color: "#d4af37", fontSize: "14px", minWidth: "100px", zIndex: 1000,
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
            <g transform="rotate(-45 50 50)">
              <rect x="47" y="20" width="6" height="50" fill="#c0c0c0" stroke="#808080" strokeWidth="1.5" />
              <polygon points="50,15 44,20 56,20" fill="#e0e0e0" stroke="#808080" strokeWidth="1.5" />
              <rect x="43" y="68" width="14" height="8" fill="#8b6f47" stroke="#4a2f1a" strokeWidth="1.5" />
            </g>
            <g transform="rotate(45 50 50)">
              <rect x="47" y="20" width="6" height="50" fill="#c0c0c0" stroke="#808080" strokeWidth="1.5" />
              <polygon points="50,15 44,20 56,20" fill="#e0e0e0" stroke="#808080" strokeWidth="1.5" />
              <rect x="43" y="68" width="14" height="8" fill="#8b6f47" stroke="#4a2f1a" strokeWidth="1.5" />
            </g>
          </svg>
        </div>

        {!menuOpen && (
          <div
            onClick={tracking ? stopTracking : startWithCountdown}
            style={{
              position: "fixed",
              bottom: "30px",
              right: "-10px",
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
              <div style={{ fontSize: 20, fontWeight: 700, color: "#ffd27a" }}>Missões Diárias</div>
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

      {/* MATCHMAKING / BATTLE SEARCH MODAL */}
      {matchmakingOpen && (
        <div className="modal-backdrop" onClick={() => { setMatchmakingOpen(false); cancelSearchingBattle(); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: "min(680px,94%)", background: "linear-gradient(180deg,#2b1a12 0%,#3b2818 100%)", border: "3px solid #d4af37", borderRadius: 12, padding: 18, color: "#d4af37", fontFamily: "'Cinzel', 'Georgia', serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#ffd27a" }}>Buscar Batalha</div>
              <button onClick={() => { setMatchmakingOpen(false); cancelSearchingBattle(); }} style={{ background: "transparent", border: "none", color: "#d4af37", fontSize: 22, cursor: "pointer" }}>×</button>
            </div>

            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <label style={{ fontSize: 13, color: "#e8d7b0" }}>Modo:</label>
                  <select value={selectedMode} onChange={(e) => setSelectedMode(e.target.value)} style={{ padding: "6px 8px", borderRadius: 6, background: "rgba(0,0,0,0.15)", border: "1px solid #8b6f47", color: "#d4af37" }}>
                    <option>Casual</option>
                    <option>Ranqueada</option>
                  </select>
                </div>
              </div>

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

              <div>
                {matchedOpponent && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "stretch", justifyContent: "center", padding: 12, borderRadius: 8, background: "rgba(0,0,0,0.12)", border: "1px solid rgba(139,111,71,0.12)" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontWeight: 700, color: "#ffd27a" }}>{matchedOpponent.name}</div>
                      <div style={{ fontSize: 13, color: "#e8d7b0" }}>Nível {matchedOpponent.level}</div>
                    </div>

                    <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 6 }}>
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

      {/* BATTLE MODAL (mantido) */}
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

  @keyframes popScale {
    0% { transform: scale(0.2); opacity: 0; filter: blur(6px); }
    40% { transform: scale(1.08); opacity: 1; filter: blur(0); }
    70% { transform: scale(0.96); }
    100% { transform: scale(1); }
  }

  .countdown-item {
    animation-name: popScale;
    animation-duration: 820ms;
    animation-timing-function: cubic-bezier(.2,.9,.2,1);
  }

  .modal-backdrop {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 16px;
    box-sizing: border-box;
  }

  .modal-content {
    width: 720px;
    max-width: calc(100% - 48px);
    max-height: 80vh;
    overflow: auto;
    box-sizing: border-box;
    border-radius: 12px;
    padding: 18px;
    background: linear-gradient(180deg,#2b1a12 0%,#3b2818 100%);
    border: 3px solid #d4af37;
    color: #d4af37;
    font-family: 'Cinzel', 'Georgia', serif;
    box-shadow: 0 10px 40px rgba(0,0,0,0.7);
  }

  .modal-content .scrollable {
    overflow: auto;
    max-height: 64vh;
  }

  .modal-content .inventory-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .modal-content button {
    min-height: 44px;
    min-width: 64px;
  }

  @media (max-width: 430px) {
    .modal-backdrop {
      align-items: center;
      padding: 10px;
    }
    .modal-content {
      width: calc(100% - 24px);
      max-width: calc(100% - 24px);
      max-height: 86vh;
      border-radius: 10px;
      padding: 14px;
    }

    .modal-content .inventory-grid {
      grid-template-columns: 1fr;
    }

    .modal-content { gap: 10px; }

    .modal-content h1, .modal-content h2, .modal-content h3 {
      font-size: 18px;
    }

    .modal-content button {
      padding: 12px 14px !important;
      font-size: 16px !important;
    }
  }

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
