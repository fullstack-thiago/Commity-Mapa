import React, { useState } from "react";
import Login from "./Login";
import Mapa from "./Mapa";

export default function App() {
  const [logado, setLogado] = useState(false);

  if (!logado) {
    return <Login onLogin={() => setLogado(true)} />;
  }

  return <Mapa />;
}
