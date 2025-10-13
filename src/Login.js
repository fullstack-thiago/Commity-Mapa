// Login.js
import React, { useState } from "react";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [isHoveringButton, setIsHoveringButton] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    // login fixo para teste
    if (email === "teste@teste.com" && senha === "1234") {
      onLogin(); // chama função que vem do App.js
    } else {
      setErro("E-mail ou senha incorretos.");
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #1a0f0a 0%, #3d2817 50%, #1a0f0a 100%)",
        fontFamily: "'Cinzel', 'Georgia', serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Textura de fundo */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E")`,
          opacity: 0.3,
          pointerEvents: "none",
        }}
      />

      {/* Decoração de espadas cruzadas no fundo */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "10%",
          fontSize: "200px",
          opacity: 0.05,
          transform: "rotate(-15deg)",
        }}
      >
        ⚔️
      </div>
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          right: "10%",
          fontSize: "200px",
          opacity: 0.05,
          transform: "rotate(15deg)",
        }}
      >
        🛡️
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          background: "linear-gradient(180deg, #2d1810 0%, #1f0f08 100%)",
          padding: "40px 35px",
          borderRadius: "8px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)",
          width: "380px",
          textAlign: "center",
          border: "3px solid #4a2f1a",
          position: "relative",
          backgroundImage: `
            linear-gradient(180deg, rgba(45,24,16,0.9) 0%, rgba(31,15,8,0.9) 100%),
            url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='wood' x='0' y='0' width='200' height='200' patternUnits='userSpaceOnUse'%3E%3Cline x1='0' y1='0' x2='200' y2='0' stroke='%23000' stroke-width='1' opacity='0.1'/%3E%3Cline x1='0' y1='40' x2='200' y2='40' stroke='%23000' stroke-width='0.5' opacity='0.05'/%3E%3Cline x1='0' y1='80' x2='200' y2='80' stroke='%23000' stroke-width='0.5' opacity='0.05'/%3E%3Cline x1='0' y1='120' x2='200' y2='120' stroke='%23000' stroke-width='0.5' opacity='0.05'/%3E%3Cline x1='0' y1='160' x2='200' y2='160' stroke='%23000' stroke-width='0.5' opacity='0.05'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='200' height='200' fill='url(%23wood)'/%3E%3C/svg%3E")
          `,
        }}
      >
        {/* Ornamentos de canto superior */}
        <div
          style={{
            position: "absolute",
            top: "-3px",
            left: "-3px",
            width: "60px",
            height: "60px",
            borderTop: "3px solid #8b6f47",
            borderLeft: "3px solid #8b6f47",
            borderTopLeftRadius: "8px",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "-3px",
            right: "-3px",
            width: "60px",
            height: "60px",
            borderTop: "3px solid #8b6f47",
            borderRight: "3px solid #8b6f47",
            borderTopRightRadius: "8px",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-3px",
            left: "-3px",
            width: "60px",
            height: "60px",
            borderBottom: "3px solid #8b6f47",
            borderLeft: "3px solid #8b6f47",
            borderBottomLeftRadius: "8px",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-3px",
            right: "-3px",
            width: "60px",
            height: "60px",
            borderBottom: "3px solid #8b6f47",
            borderRight: "3px solid #8b6f47",
            borderBottomRightRadius: "8px",
          }}
        />

        {/* Ícone de escudo com espadas */}
        <div
          style={{
            marginBottom: "20px",
            position: "relative",
            display: "inline-block",
          }}
        >
          <svg
            width="80"
            height="80"
            viewBox="0 0 100 100"
            style={{
              filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))",
            }}
          >
            {/* Escudo */}
            <path
              d="M50 10 L80 25 L80 50 Q80 80 50 95 Q20 80 20 50 L20 25 Z"
              fill="#8b6f47"
              stroke="#4a2f1a"
              strokeWidth="2"
            />
            <path
              d="M50 15 L75 28 L75 50 Q75 76 50 88 Q25 76 25 50 L25 28 Z"
              fill="#a0826d"
              stroke="#6b4423"
              strokeWidth="1.5"
            />
            {/* Detalhe central do escudo */}
            <circle cx="50" cy="50" r="12" fill="#4a2f1a" stroke="#8b6f47" strokeWidth="2" />
            <circle cx="50" cy="50" r="8" fill="#6b4423" />
            
            {/* Espada esquerda */}
            <g transform="translate(-15, 0) rotate(-30 50 50)">
              <rect x="48" y="20" width="4" height="50" fill="#c0c0c0" stroke="#808080" strokeWidth="1" />
              <polygon points="50,15 45,20 55,20" fill="#e0e0e0" stroke="#808080" strokeWidth="1" />
              <rect x="45" y="68" width="10" height="6" fill="#8b6f47" stroke="#4a2f1a" strokeWidth="1" />
            </g>
            
            {/* Espada direita */}
            <g transform="translate(15, 0) rotate(30 50 50)">
              <rect x="48" y="20" width="4" height="50" fill="#c0c0c0" stroke="#808080" strokeWidth="1" />
              <polygon points="50,15 45,20 55,20" fill="#e0e0e0" stroke="#808080" strokeWidth="1" />
              <rect x="45" y="68" width="10" height="6" fill="#8b6f47" stroke="#4a2f1a" strokeWidth="1" />
            </g>
          </svg>
        </div>

        <h2
          style={{
            color: "#d4af37",
            fontSize: "32px",
            marginBottom: "10px",
            marginTop: "10px",
            textShadow: "2px 2px 4px rgba(0,0,0,0.8), 0 0 20px rgba(212,175,55,0.3)",
            letterSpacing: "3px",
            fontWeight: "bold",
            textTransform: "uppercase",
          }}
        >
          Entrar
        </h2>
        
        <div
          style={{
            height: "2px",
            background: "linear-gradient(90deg, transparent, #8b6f47, transparent)",
            marginBottom: "25px",
            boxShadow: "0 1px 3px rgba(139,111,71,0.5)",
          }}
        />

        {/* Campo de E-mail */}
        <div style={{ marginBottom: "18px", position: "relative" }}>
          <div
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#8b6f47",
              fontSize: "18px",
              pointerEvents: "none",
            }}
          >
            👤
          </div>
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "14px 14px 14px 45px",
              borderRadius: "6px",
              border: "2px solid #4a2f1a",
              backgroundColor: "#1a0f0a",
              color: "#d4af37",
              fontSize: "15px",
              fontFamily: "'Cinzel', 'Georgia', serif",
              boxShadow: "inset 0 2px 5px rgba(0,0,0,0.5)",
              outline: "none",
              transition: "all 0.3s ease",
              boxSizing: "border-box",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#8b6f47";
              e.target.style.boxShadow = "inset 0 2px 5px rgba(0,0,0,0.5), 0 0 10px rgba(139,111,71,0.3)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#4a2f1a";
              e.target.style.boxShadow = "inset 0 2px 5px rgba(0,0,0,0.5)";
            }}
          />
        </div>

        {/* Campo de Senha */}
        <div style={{ marginBottom: "20px", position: "relative" }}>
          <div
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#8b6f47",
              fontSize: "18px",
              pointerEvents: "none",
            }}
          >
            🔒
          </div>
          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "14px 14px 14px 45px",
              borderRadius: "6px",
              border: "2px solid #4a2f1a",
              backgroundColor: "#1a0f0a",
              color: "#d4af37",
              fontSize: "15px",
              fontFamily: "'Cinzel', 'Georgia', serif",
              boxShadow: "inset 0 2px 5px rgba(0,0,0,0.5)",
              outline: "none",
              transition: "all 0.3s ease",
              boxSizing: "border-box",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#8b6f47";
              e.target.style.boxShadow = "inset 0 2px 5px rgba(0,0,0,0.5), 0 0 10px rgba(139,111,71,0.3)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#4a2f1a";
              e.target.style.boxShadow = "inset 0 2px 5px rgba(0,0,0,0.5)";
            }}
          />
        </div>

        {/* Mensagem de erro */}
        {erro && (
          <div
            style={{
              color: "#ff6b6b",
              marginBottom: "15px",
              padding: "10px",
              backgroundColor: "rgba(255,107,107,0.1)",
              border: "1px solid #ff6b6b",
              borderRadius: "4px",
              fontSize: "14px",
              textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
            }}
          >
            ⚠️ {erro}
          </div>
        )}

        {/* Botão de Login */}
        <button
          type="submit"
          onMouseEnter={() => setIsHoveringButton(true)}
          onMouseLeave={() => setIsHoveringButton(false)}
          style={{
            width: "100%",
            padding: "14px",
            border: "2px solid #8b6f47",
            borderRadius: "6px",
            background: isHoveringButton
              ? "linear-gradient(180deg, #d4af37 0%, #b8941f 100%)"
              : "linear-gradient(180deg, #b8941f 0%, #8b6f47 100%)",
            color: isHoveringButton ? "#1a0f0a" : "#1a0f0a",
            fontWeight: "bold",
            fontSize: "18px",
            cursor: "pointer",
            fontFamily: "'Cinzel', 'Georgia', serif",
            textTransform: "uppercase",
            letterSpacing: "2px",
            boxShadow: isHoveringButton
              ? "0 6px 20px rgba(212,175,55,0.4), inset 0 1px 0 rgba(255,255,255,0.3)"
              : "0 4px 15px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)",
            transition: "all 0.3s ease",
            transform: isHoveringButton ? "translateY(-2px)" : "translateY(0)",
            textShadow: "1px 1px 2px rgba(0,0,0,0.3)",
          }}
        >
          ⚔️ Vamos lá ⚔️
        </button>

        {/* Texto decorativo */}
        <div
          style={{
            marginTop: "25px",
            color: "#c7c7c7ff",
            fontSize: "12px",
            fontStyle: "italic",
            textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
            letterSpacing: "1px",
          }}
        >
          "Venha conhecer o mundo"
        </div>
      </form>

      {/* Importar fonte Cinzel do Google Fonts */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');
          
          input::placeholder {
            color: #6b4423;
            opacity: 0.8;
          }
        `}
      </style>
    </div>
  );
}

