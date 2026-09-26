import { useState, useEffect, useRef, useCallback } from 'react';
import MasterTopLogo from './components/MasterTopLogo';
import ScheduleScreen, { startReminderWatcher } from './components/ScheduleScreen';
import {
  Question,
  SUBJECTS,
  getStateFromCPF,
  getQuestionsForState,
  getQuestionsBySubject,
  DETRAN_APPROVAL,
} from './data/questions';

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserData {
  name: string;
  cpf: string;
  state: string;
}

interface SimResult {
  date: string;
  score: number;
  total: number;
  approved: boolean;
  subject: string | null;
}

type Screen =
  | 'login'
  | 'home'
  | 'simulator'
  | 'results'
  | 'performance'
  | 'change-user'
  | 'subject-select'
  | 'schedule';

// ─── Local storage helpers ────────────────────────────────────────────────────

function loadHistory(): SimResult[] {
  try {
    return JSON.parse(localStorage.getItem('mta_history') || '[]');
  } catch {
    return [];
  }
}

function saveHistory(history: SimResult[]) {
  localStorage.setItem('mta_history', JSON.stringify(history));
}

function loadUser(): UserData | null {
  try {
    const s = localStorage.getItem('mta_user');
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

function saveUser(u: UserData) {
  localStorage.setItem('mta_user', JSON.stringify(u));
}

// ─── CPF mask ────────────────────────────────────────────────────────────────

function maskCPF(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

// ─── Timer hook ──────────────────────────────────────────────────────────────

function useCountdown(initialSeconds: number, active: boolean) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) return;
    ref.current = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [active]);

  const reset = useCallback(() => setSeconds(initialSeconds), [initialSeconds]);
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return { seconds, display: `${mm}:${ss}`, reset };
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [userData, setUserData] = useState<UserData | null>(loadUser);
  const [history, setHistory] = useState<SimResult[]>(loadHistory);
  const [menuOpen, setMenuOpen] = useState(false);

  // Simulator state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [simFinished, setSimFinished] = useState(false);
  const [simSubject, setSimSubject] = useState<string | null>(null);
  const [simSeed, setSimSeed] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const { seconds, display: timerDisplay, reset: resetTimer } = useCountdown(3600, timerActive);

  // Results state
  const [resultData, setResultData] = useState<SimResult | null>(null);

  // Login state
  const [loginName, setLoginName] = useState('');
  const [loginCPF, setLoginCPF] = useState('');
  const [loginError, setLoginError] = useState('');

  // Change user state
  const [changeName, setChangeName] = useState('');
  const [changeCPF, setChangeCPF] = useState('');

  // Restore user on mount and start reminder watcher
  useEffect(() => {
    const u = loadUser();
    if (u) {
      setUserData(u);
      setScreen('home');
      startReminderWatcher(u.cpf);
    }
  }, []);

  // Auto-finish when timer hits zero
  useEffect(() => {
    if (seconds === 0 && timerActive && !simFinished) finishSim();
  }, [seconds, timerActive, simFinished]);

  function startSimulator(subject: string | null = null) {
    if (!userData) return;
    const seed = Date.now();
    setSimSeed(seed);
    setSimSubject(subject);
    const qs = subject
      ? getQuestionsBySubject(subject, 30, seed)
      : getQuestionsForState(userData.state, 30, seed);
    setQuestions(qs);
    setCurrentQ(0);
    setAnswers({});
    setSimFinished(false);
    resetTimer();
    setTimerActive(true);
    setScreen('simulator');
  }

  function finishSim() {
    setTimerActive(false);
    setSimFinished(true);
    const correct = questions.filter((q, i) => answers[i] === q.correct).length;
    const state = userData?.state || 'SP';
    const rule = DETRAN_APPROVAL[state] || { min: 21, total: 30 };
    const approved = correct >= rule.min;
    const result: SimResult = {
      date: new Date().toLocaleDateString('pt-BR'),
      score: correct,
      total: questions.length,
      approved,
      subject: simSubject,
    };
    setResultData(result);
    const newHistory = [result, ...history].slice(0, 50);
    setHistory(newHistory);
    saveHistory(newHistory);
    setScreen('results');
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const name = loginName.trim();
    const cpf = loginCPF.replace(/\D/g, '');
    if (!name) { setLoginError('Digite seu nome.'); return; }
    if (cpf.length !== 11) { setLoginError('CPF inválido. Digite 11 dígitos.'); return; }
    const state = getStateFromCPF(cpf);
    const u: UserData = { name, cpf, state };
    setUserData(u);
    saveUser(u);
    setLoginError('');
    setScreen('home');
  }

  function handleChangeUser(e: React.FormEvent) {
    e.preventDefault();
    const name = changeName.trim();
    const cpf = changeCPF.replace(/\D/g, '');
    if (!name || cpf.length !== 11) return;
    const state = getStateFromCPF(cpf);
    const u: UserData = { name, cpf, state };
    setUserData(u);
    saveUser(u);
    setMenuOpen(false);
    setScreen('home');
  }

  function selectAnswer(ans: string) {
    setAnswers((prev) => ({ ...prev, [currentQ]: ans }));
  }

  // ─── Screens ────────────────────────────────────────────────────────────────

  if (screen === 'login') {
    return (
      <div className="min-h-screen bg-yellow-400 flex flex-col items-center justify-center px-5 py-10">
        <div className="mb-8">
          <MasterTopLogo size="lg" />
        </div>
        <p className="text-gray-900 font-semibold text-base mb-6 text-center">
          Simulado de CNH — Primeira Habilitação
        </p>
        <div className="w-full max-w-sm mb-4 text-center">
          <p className="text-gray-900 text-sm font-semibold leading-relaxed">
            Seja bem-vindo ao nosso app Master Top. Aqui você estuda com facilidade e qualidade.
          </p>
        </div>
        <div className="w-full max-w-sm bg-white/80 rounded-2xl px-5 py-4 mb-4 shadow-lg border-l-4 border-gray-900">
          <p className="text-yellow-600 text-xs font-black uppercase tracking-widest mb-1">
            Prepare-se
          </p>
          <p className="text-gray-900 text-lg font-black leading-tight">
            Para dirigir com consciência.
          </p>
        </div>
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 flex flex-col gap-4">
          <h2 className="text-xl font-bold text-gray-900 text-center">Entrar</h2>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Seu nome completo</label>
            <input
              type="text"
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              placeholder="Ex: João da Silva"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-yellow-400 transition"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">CPF</label>
            <input
              type="text"
              value={loginCPF}
              onChange={(e) => setLoginCPF(maskCPF(e.target.value))}
              placeholder="000.000.000-00"
              inputMode="numeric"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-yellow-400 transition"
            />
          </div>
          {loginError && <p className="text-red-600 text-sm font-medium text-center">{loginError}</p>}
          <button
            type="submit"
            className="w-full bg-gray-900 text-yellow-400 font-bold text-lg py-3 rounded-xl hover:bg-gray-800 active:scale-95 transition"
          >
            Começar
          </button>
        </form>
      </div>
    );
  }

  if (screen === 'home') {
    const name = userData?.name.split(' ')[0] || '';
    const lastResult = history[0];
    return (
      <div className="min-h-screen bg-yellow-400 flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-5 pt-10 pb-4">
          <MasterTopLogo size="sm" />
          <button onClick={() => setMenuOpen(true)} className="w-10 h-10 flex flex-col items-center justify-center gap-1.5">
            <span className="w-6 h-0.5 bg-gray-900 rounded-full" />
            <span className="w-6 h-0.5 bg-gray-900 rounded-full" />
            <span className="w-6 h-0.5 bg-gray-900 rounded-full" />
          </button>
        </header>

        <div className="px-5 flex-1 flex flex-col gap-4 pb-10">
          {/* Greeting */}
          <div className="bg-gray-900 rounded-2xl p-5 text-white">
            <p className="text-yellow-400 font-bold text-2xl">Olá, {name}! 👋</p>
            <p className="text-gray-300 text-sm mt-1">Estado: DETRAN-{userData?.state}</p>
            {lastResult && (
              <p className="text-gray-400 text-xs mt-2">
                Último simulado: {lastResult.score}/{lastResult.total} em {lastResult.date}
                {' — '}<span className={lastResult.approved ? 'text-green-400' : 'text-red-400'}>
                  {lastResult.approved ? 'Aprovado' : 'Reprovado'}
                </span>
              </p>
            )}
          </div>

          {/* Main actions */}
          <button
            onClick={() => startSimulator(null)}
            className="w-full bg-gray-900 text-yellow-400 font-bold text-lg py-5 rounded-2xl shadow-lg active:scale-95 transition"
          >
            🚗 Fazer Novo Simulado
          </button>

          <button
            onClick={() => setScreen('subject-select')}
            className="w-full bg-white text-gray-900 font-bold text-lg py-5 rounded-2xl shadow-lg active:scale-95 transition"
          >
            📚 Estudar por Matéria
          </button>

          <button
            onClick={() => setScreen('performance')}
            className="w-full bg-white text-gray-900 font-bold text-lg py-5 rounded-2xl shadow-lg active:scale-95 transition"
          >
            📊 Meu Desempenho
          </button>

          <button
            onClick={() => setScreen('schedule')}
            className="w-full bg-white text-gray-900 font-bold text-lg py-5 rounded-2xl shadow-lg active:scale-95 transition"
          >
            📅 Agenda de Aulas
          </button>

          {/* Info card */}
          <div className="bg-white/70 rounded-2xl p-4 text-sm text-gray-700">
            <p className="font-semibold mb-1">Como funciona:</p>
            <ul className="list-disc ml-4 space-y-1 text-xs">
              <li>30 questões sorteadas do banco do DETRAN-{userData?.state}</li>
              <li>Precisa de 21 acertos para ser aprovado</li>
              <li>60 minutos para responder</li>
            </ul>
          </div>
        </div>

        {/* Menu Drawer */}
        {menuOpen && (
          <MenuDrawer
            user={userData!}
            onClose={() => setMenuOpen(false)}
            onChangeUser={() => { setMenuOpen(false); setChangeName(userData?.name || ''); setChangeCPF(maskCPF(userData?.cpf || '')); setScreen('change-user'); }}
            onPerformance={() => { setMenuOpen(false); setScreen('performance'); }}
            onSchedule={() => { setMenuOpen(false); setScreen('schedule'); }}
          />
        )}
      </div>
    );
  }

  if (screen === 'subject-select') {
    return (
      <div className="min-h-screen bg-yellow-400 flex flex-col">
        <header className="flex items-center gap-3 px-5 pt-10 pb-4">
          <button onClick={() => setScreen('home')} className="text-gray-900 font-bold text-2xl">←</button>
          <h1 className="text-xl font-bold text-gray-900">Estudar por Matéria</h1>
        </header>
        <div className="px-5 flex flex-col gap-3 pb-10">
          {SUBJECTS.map((s) => (
            <button
              key={s}
              onClick={() => startSimulator(s)}
              className="w-full bg-gray-900 text-yellow-400 font-semibold text-base py-4 px-5 rounded-2xl text-left active:scale-95 transition"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (screen === 'change-user') {
    return (
      <div className="min-h-screen bg-yellow-400 flex flex-col items-center justify-center px-5 py-10">
        <div className="mb-8"><MasterTopLogo size="lg" /></div>
        <form onSubmit={handleChangeUser} className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 flex flex-col gap-4">
          <h2 className="text-xl font-bold text-gray-900 text-center">Alterar Dados</h2>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nome completo</label>
            <input
              type="text"
              value={changeName}
              onChange={(e) => setChangeName(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-yellow-400 transition"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">CPF</label>
            <input
              type="text"
              value={changeCPF}
              onChange={(e) => setChangeCPF(maskCPF(e.target.value))}
              inputMode="numeric"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-yellow-400 transition"
            />
          </div>
          <button type="submit" className="w-full bg-gray-900 text-yellow-400 font-bold text-lg py-3 rounded-xl hover:bg-gray-800 active:scale-95 transition">
            Salvar
          </button>
          <button type="button" onClick={() => setScreen('home')} className="text-gray-500 text-sm text-center">
            Cancelar
          </button>
        </form>
      </div>
    );
  }

  if (screen === 'simulator' && questions.length > 0) {
    const q = questions[currentQ];
    const selected = answers[currentQ];
    const opts: Array<{ key: string; text: string }> = [
      { key: 'a', text: q.options.a },
      { key: 'b', text: q.options.b },
      { key: 'c', text: q.options.c },
      { key: 'd', text: q.options.d },
    ];
    const answeredCount = Object.keys(answers).length;
    const timerDanger = seconds <= 300;

    return (
      <div className="min-h-screen bg-gray-950 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-8 pb-3 bg-gray-900">
          <button onClick={() => { setTimerActive(false); setScreen('home'); }} className="text-yellow-400 text-sm font-semibold">
            ← Menu
          </button>
          <span className={`font-mono font-bold text-lg ${timerDanger ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`}>
            ⏱ {timerDisplay}
          </span>
          <span className="text-gray-400 text-sm">{currentQ + 1}/{questions.length}</span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-gray-800">
          <div
            className="h-full bg-yellow-400 transition-all"
            style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Subject badge */}
        <div className="px-4 pt-4">
          <span className="text-xs font-semibold text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full">
            {q.subject}
          </span>
        </div>

        {/* Question */}
        <div className="px-4 pt-4 pb-2 flex-1 flex flex-col">
          <p className="text-white font-semibold text-base leading-relaxed mb-5">
            {currentQ + 1}. {q.text}
          </p>

          {/* Options */}
          <div className="flex flex-col gap-3 flex-1">
            {opts.map(({ key, text }) => {
              const isSelected = selected === key;
              return (
                <button
                  key={key}
                  onClick={() => selectAnswer(key)}
                  className={`w-full text-left px-4 py-4 rounded-2xl border-2 transition font-medium text-sm leading-snug
                    ${isSelected
                      ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400'
                      : 'border-gray-700 bg-gray-900 text-gray-200 active:border-yellow-400'
                    }`}
                >
                  <span className={`font-bold mr-2 ${isSelected ? 'text-yellow-400' : 'text-gray-500'}`}>
                    {key.toUpperCase()})
                  </span>
                  {text}
                </button>
              );
            })}
          </div>

          {/* Navigation */}
          <div className="flex gap-3 mt-5 pb-6">
            {currentQ > 0 && (
              <button
                onClick={() => setCurrentQ((q) => q - 1)}
                className="flex-1 py-3 rounded-2xl border-2 border-gray-700 text-gray-400 font-semibold active:border-yellow-400 transition"
              >
                ← Anterior
              </button>
            )}

            {currentQ < questions.length - 1 ? (
              <button
                onClick={() => { if (selected) setCurrentQ((q) => q + 1); }}
                className={`flex-1 py-3 rounded-2xl font-bold text-base transition
                  ${selected ? 'bg-yellow-400 text-gray-900 active:scale-95' : 'bg-gray-800 text-gray-600'}`}
              >
                Próxima →
              </button>
            ) : (
              <button
                onClick={finishSim}
                className={`flex-1 py-3 rounded-2xl font-bold text-base transition
                  ${answeredCount === questions.length
                    ? 'bg-green-500 text-white active:scale-95'
                    : 'bg-yellow-400 text-gray-900 active:scale-95'
                  }`}
              >
                {answeredCount < questions.length
                  ? `Finalizar (${answeredCount}/${questions.length})`
                  : 'Ver Resultado ✓'
                }
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'results' && resultData) {
    const { score, total, approved, subject } = resultData;
    const pct = Math.round((score / total) * 100);
    const name = userData?.name.split(' ')[0] || '';

    // Build review data
    const review = questions.map((q, i) => ({
      q,
      userAnswer: answers[i] as string | undefined,
      correct: q.correct,
      isCorrect: answers[i] === q.correct,
    }));

    return (
      <ResultsScreen
        name={name}
        score={score}
        total={total}
        approved={approved}
        pct={pct}
        subject={subject}
        review={review}
        onRetry={() => startSimulator(subject)}
        onHome={() => setScreen('home')}
        onPerformance={() => setScreen('performance')}
      />
    );
  }

  if (screen === 'performance') {
    return (
      <PerformanceScreen
        history={history}
        name={userData?.name.split(' ')[0] || ''}
        onBack={() => setScreen('home')}
      />
    );
  }

  if (screen === 'schedule' && userData) {
    return (
      <ScheduleScreen
        userCPF={userData.cpf}
        userName={userData.name}
        onBack={() => setScreen('home')}
      />
    );
  }

  return null;
}

// ─── Menu Drawer ─────────────────────────────────────────────────────────────

function MenuDrawer({
  user,
  onClose,
  onChangeUser,
  onPerformance,
  onSchedule,
}: {
  user: UserData;
  onClose: () => void;
  onChangeUser: () => void;
  onPerformance: () => void;
  onSchedule: () => void;
}) {
  const waLuminarias = 'https://wa.me/5535999323727';
  const waSaoBento = 'https://wa.me/5535997049051';

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50" onClick={onClose} />
      <div className="w-72 bg-gray-900 flex flex-col h-full shadow-2xl">
        <div className="px-5 pt-10 pb-5 border-b border-gray-800">
          <MasterTopLogo size="sm" />
          <p className="text-gray-300 text-sm mt-3 font-medium">{user.name}</p>
          <p className="text-gray-500 text-xs">DETRAN-{user.state}</p>
        </div>

        <div className="flex flex-col flex-1 px-4 py-4 gap-2">
          <MenuBtn icon="📅" label="Agenda de Aulas" onClick={onSchedule} />
          <MenuBtn icon="📊" label="Meu Desempenho" onClick={onPerformance} />
          <MenuBtn icon="👤" label="Alterar Dados" onClick={onChangeUser} />

          <div className="mt-4 border-t border-gray-800 pt-4">
            <p className="text-yellow-400 text-xs font-bold uppercase mb-3 px-1">
              Entrar em contato com a recepção da Top Master
            </p>
            <a
              href={waLuminarias}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-3 rounded-xl bg-green-600/20 hover:bg-green-600/30 transition mb-2"
            >
              <span className="text-xl">💬</span>
              <div>
                <p className="text-white text-sm font-semibold">Luminárias MG</p>
                <p className="text-green-400 text-xs">(35) 99932-3727</p>
              </div>
            </a>
            <a
              href={waSaoBento}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-3 rounded-xl bg-green-600/20 hover:bg-green-600/30 transition"
            >
              <span className="text-xl">💬</span>
              <div>
                <p className="text-white text-sm font-semibold">São Bento Abade</p>
                <p className="text-green-400 text-xs">(35) 99704-9051</p>
              </div>
            </a>
          </div>
        </div>

        <button onClick={onClose} className="px-5 py-5 text-gray-500 text-sm text-center border-t border-gray-800">
          Fechar
        </button>
      </div>
    </div>
  );
}

function MenuBtn({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 transition w-full text-left"
    >
      <span className="text-xl">{icon}</span>
      <span className="text-white font-medium text-sm">{label}</span>
    </button>
  );
}

// ─── Results Screen ───────────────────────────────────────────────────────────

function ResultsScreen({
  name,
  score,
  total,
  approved,
  pct,
  subject,
  review,
  onRetry,
  onHome,
  onPerformance,
}: {
  name: string;
  score: number;
  total: number;
  approved: boolean;
  pct: number;
  subject: string | null;
  review: Array<{ q: Question; userAnswer?: string; correct: string; isCorrect: boolean }>;
  onRetry: () => void;
  onHome: () => void;
  onPerformance: () => void;
}) {
  const [showReview, setShowReview] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <div className="px-5 pt-12 pb-4 text-center">
        <div className="text-5xl mb-3">{approved ? '🎉' : '😔'}</div>
        <p className="text-yellow-400 font-bold text-2xl mb-1">
          {approved ? `Parabéns, ${name}!` : `Que pena, ${name}!`}
        </p>
        <p className="text-gray-400 text-sm mb-4">
          {approved
            ? 'Você foi bem no seu simulado! Deseja tentar novamente para uma nota melhor?'
            : 'Você não atingiu a pontuação mínima. Estude mais e tente novamente!'}
        </p>

        {/* Score circle */}
        <div className="flex justify-center mb-4">
          <div className={`w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center ${approved ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10'}`}>
            <span className={`text-4xl font-black ${approved ? 'text-green-400' : 'text-red-400'}`}>{score}</span>
            <span className="text-gray-500 text-sm">de {total}</span>
          </div>
        </div>

        <div className={`inline-block px-5 py-2 rounded-full font-bold text-base mb-2 ${approved ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {approved ? 'APROVADO ✓' : 'REPROVADO ✗'} — {pct}%
        </div>
        {subject && <p className="text-gray-500 text-xs">Matéria: {subject}</p>}
        <p className="text-gray-600 text-xs mt-1">Mínimo para aprovação: 21 acertos</p>
      </div>

      <div className="flex flex-col gap-3 px-5 pb-4">
        <button onClick={onRetry} className="w-full bg-yellow-400 text-gray-900 font-bold py-4 rounded-2xl active:scale-95 transition">
          🔄 Tentar Novamente
        </button>
        <button onClick={onHome} className="w-full bg-gray-800 text-white font-bold py-4 rounded-2xl active:scale-95 transition">
          🏠 Tela Principal
        </button>
        <button onClick={onPerformance} className="w-full bg-gray-800 text-gray-300 font-semibold py-3 rounded-2xl active:scale-95 transition">
          📊 Ver Desempenho
        </button>
        <button
          onClick={() => setShowReview(!showReview)}
          className="w-full border-2 border-gray-700 text-gray-400 font-semibold py-3 rounded-2xl active:scale-95 transition"
        >
          {showReview ? '▲ Ocultar Revisão' : '📋 Revisar Erros'}
        </button>
      </div>

      {showReview && (
        <div className="px-5 pb-10 flex flex-col gap-4">
          {review.map(({ q, userAnswer, correct, isCorrect }, i) => (
            <div
              key={i}
              className={`rounded-2xl p-4 border-2 ${isCorrect ? 'border-green-700 bg-green-900/20' : 'border-red-700 bg-red-900/20'}`}
            >
              <p className="text-white text-sm font-semibold mb-2">{i + 1}. {q.text}</p>
              {(['a', 'b', 'c', 'd'] as const).map((k) => {
                const isCorrectOpt = k === correct;
                const isUserOpt = k === userAnswer;
                return (
                  <p
                    key={k}
                    className={`text-xs py-0.5 px-2 rounded mb-1 ${
                      isCorrectOpt
                        ? 'text-green-400 font-bold'
                        : isUserOpt && !isCorrectOpt
                        ? 'text-red-400 line-through'
                        : 'text-gray-500'
                    }`}
                  >
                    {k.toUpperCase()}) {q.options[k]}
                    {isCorrectOpt && ' ✓'}
                    {isUserOpt && !isCorrectOpt && ' ✗'}
                  </p>
                );
              })}
              <p className="text-gray-400 text-xs mt-2 italic">{q.explanation}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Performance Screen ───────────────────────────────────────────────────────

function PerformanceScreen({
  history,
  name,
  onBack,
}: {
  history: SimResult[];
  name: string;
  onBack: () => void;
}) {
  const last10 = history.slice(0, 10).reverse();
  const totalSims = history.length;
  const totalApproved = history.filter((h) => h.approved).length;
  const avgScore = totalSims > 0 ? Math.round(history.reduce((a, h) => a + h.score, 0) / totalSims) : 0;
  const maxScore = totalSims > 0 ? Math.max(...history.map((h) => h.score)) : 0;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-10 pb-4 bg-gray-900">
        <button onClick={onBack} className="text-yellow-400 font-bold text-xl">←</button>
        <h1 className="text-white font-bold text-lg">Desempenho de {name}</h1>
      </header>

      <div className="px-5 py-5 flex flex-col gap-4 pb-10">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Simulados" value={totalSims.toString()} />
          <StatCard label="Aprovados" value={totalApproved.toString()} color="green" />
          <StatCard label="Média" value={`${avgScore}/30`} />
          <StatCard label="Melhor nota" value={`${maxScore}/30`} color="yellow" />
        </div>

        {/* Chart */}
        {last10.length > 0 ? (
          <div className="bg-gray-900 rounded-2xl p-4">
            <p className="text-white font-bold mb-4">Últimos {last10.length} simulados</p>
            <div className="flex items-end gap-2 h-32">
              {last10.map((r, i) => {
                const h = Math.max(8, Math.round((r.score / 30) * 120));
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-400">{r.score}</span>
                    <div
                      className={`w-full rounded-t-lg ${r.approved ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ height: `${h}px` }}
                    />
                    <span className="text-xs text-gray-600 rotate-0" style={{ fontSize: '8px' }}>
                      {r.date.slice(0, 5)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-3 justify-center">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span className="text-gray-400 text-xs">Aprovado</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded" />
                <span className="text-gray-400 text-xs">Reprovado</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-2xl p-8 text-center">
            <p className="text-gray-500">Nenhum simulado realizado ainda.</p>
            <p className="text-gray-600 text-sm mt-1">Faça seu primeiro simulado!</p>
          </div>
        )}

        {/* History list */}
        {history.length > 0 && (
          <div className="bg-gray-900 rounded-2xl p-4">
            <p className="text-white font-bold mb-3">Histórico</p>
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
              {history.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <div>
                    <p className="text-gray-300 text-sm">{r.date}</p>
                    <p className="text-gray-500 text-xs">{r.subject || 'Simulado geral'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">{r.score}/30</p>
                    <span className={`text-xs font-semibold ${r.approved ? 'text-green-400' : 'text-red-400'}`}>
                      {r.approved ? 'Aprovado' : 'Reprovado'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  const colors: Record<string, string> = {
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    default: 'text-white',
  };
  return (
    <div className="bg-gray-900 rounded-2xl p-4 text-center">
      <p className={`text-2xl font-black ${colors[color || 'default']}`}>{value}</p>
      <p className="text-gray-500 text-xs mt-1">{label}</p>
    </div>
  );
}
