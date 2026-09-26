/**
 * Logo MASTER TOP — duas linhas, fiel ao original:
 *   Linha 1: MAS [losango-T] ER
 *   Linha 2:  T  [rotatória] P
 *
 * Fonte grossa amarela com contorno preto.
 * Placa T  = losango amarelo, borda preta, letra T preta.
 * Placa O  = círculo branco, borda vermelha grossa, 3 setas rotatória.
 */
export default function MasterTopLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const scaleMap = { sm: 0.42, md: 0.70, lg: 1.0 };
  const sc = scaleMap[size];
  const W = Math.round(440 * sc);
  const H = Math.round(170 * sc);

  return (
    <svg
      width={W}
      height={H}
      viewBox="0 0 440 170"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Master Top"
    >
      <defs>
        <style>{`
          .TL {
            font-family: 'Black Ops One', 'Oswald', Impact, Arial, sans-serif;
            font-weight: 900;
            font-size: 72px;
            fill: #FFD600;
            stroke: #111;
            stroke-width: 5px;
            paint-order: stroke fill;
          }
        `}</style>
      </defs>

      {/* ══ LINHA 1: MAS [T-sign] ER ═══════════════════════════════════ */}

      {/* MAS */}
      <text x="4"   y="76" className="TL">MAS</text>

      {/* Losango (placa de advertência) com letra T */}
      <g transform="translate(176, 4)">
        <polygon
          points="40,2 76,40 40,78 4,40"
          fill="#FFD600" stroke="#222" strokeWidth="4" strokeLinejoin="round"
        />
        {/* Letra T dentro do losango */}
        <text
          x="40" y="56"
          fontFamily="'Black Ops One', Impact, Arial, sans-serif"
          fontWeight="900"
          fontSize="42"
          fill="#111"
          textAnchor="middle"
          dominantBaseline="auto"
        >T</text>
      </g>

      {/* ER */}
      <text x="258" y="76" className="TL">ER</text>

      {/* ══ LINHA 2:  T [rotatória] P ══════════════════════════════════ */}

      {/* T */}
      <text x="54"  y="156" className="TL">T</text>

      {/* Círculo de rotatória — branco, borda vermelha grossa, 3 setas */}
      <g transform="translate(116, 88)">
        {/* Círculo branco */}
        <circle cx="40" cy="40" r="38" fill="white" stroke="#CC0000" strokeWidth="7"/>
        {/* 3 setas curvas, separadas entre si e afastadas da borda */}
        {/* Seta 1 — topo para direita */}
        <path d="M32 18 A24 24 0 0 1 60 36" stroke="#222" strokeWidth="7" fill="none" strokeLinecap="round"/>
        <polygon points="63,43 53,33 66,31" fill="#222"/>
        {/* Seta 2 — direita para baixo-esquerda */}
        <path d="M59 49 A24 24 0 0 1 32 62" stroke="#222" strokeWidth="7" fill="none" strokeLinecap="round"/>
        <polygon points="24,62 35,55 36,68" fill="#222"/>
        {/* Seta 3 — esquerda para cima */}
        <path d="M20 53 A24 24 0 0 1 24 29" stroke="#222" strokeWidth="7" fill="none" strokeLinecap="round"/>
        <polygon points="29,22 27,35 16,29" fill="#222"/>
      </g>

      {/* P */}
      <text x="200" y="156" className="TL">P</text>
    </svg>
  );
}
