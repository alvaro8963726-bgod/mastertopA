import { useState, useEffect, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ScheduleSlot {
  id: string;          // "YYYY-MM-DD-HH:MM"
  date: string;        // "YYYY-MM-DD"
  time: string;        // "HH:MM"
  available: boolean;  // recepção ativa/desativa
  bookedBy: string | null;     // CPF do aluno
  bookedByName: string | null;
  vehicle: string | null;
}

interface LicensePrice {
  id: string;
  category: string;
  service: string;
  totalPrice: string;
  details: string;
}

interface Props {
  userCPF: string;
  userName: string;
  onBack: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STUDENT_PASSWORD = 'mastertopjoao123';
const ADMIN_PIN = '5432';
const PRICE_TABLE_VERSION = '2026-05-18-image-v3';
const TIME_SLOTS = ['07:00','08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00','18:00'];
const DAYS_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const DAYS_FULL  = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

const DEFAULT_LICENSE_PRICES: LicensePrice[] = [
  ...makePriceRows('carro', 'Carro', [
    ['Tx inscrição', '170,00'], ['Psicotécnico', '464,46'], ['Material/revisão', '150,00'], ['Tx legislação', '170,00'],
    ['Aulas práticas (2 aulas)', '200,00'], ['Aulas práticas (5 aulas)', '450,00'], ['Aulas práticas (10 aulas)', '800,00'], ['Aulas práticas (20 aulas)', '1.100,00'],
    ['Tx direção', '170,00'], ['Aluguel do carro', '180,00'],
    ['Total (2 aulas)', '1.504,46'], ['Total (5 aulas)', '1.754,46'], ['Total (10 aulas)', '2.104,46'], ['Total (20 aulas)', '2.404,46'],
  ]),
  ...makePriceRows('moto', 'Moto', [
    ['Tx inscrição', '170,00'], ['Psicotécnico', '464,46'], ['Material/revisão', '150,00'], ['Tx legislação', '170,00'],
    ['Aulas práticas (2 aulas)', '180,00'], ['Aulas práticas (5 aulas)', '400,00'], ['Aulas práticas (10 aulas)', '600,00'], ['Aulas práticas (20 aulas)', '1.000,00'],
    ['Tx direção', '170,00'], ['Aluguel da moto', '180,00'], ['Aluguel da pista', '100,00'],
    ['Total (2 aulas)', '1.584,46'], ['Total (5 aulas)', '1.804,46'], ['Total (10 aulas)', '2.004,46'], ['Total (15 aulas)', '2.404,46'],
  ]),
  ...makePriceRows('carro-moto', 'Carro e Moto', [
    ['Tx inscrição', '170,00'], ['Psicotécnico', '464,46'], ['Material/revisão', '150,00'], ['Tx legislação', '170,00'],
    ['Aulas práticas de carro (2 aulas)', '200,00'], ['Aulas práticas de carro (5 aulas)', '450,00'], ['Aulas práticas de carro (10 aulas)', '800,00'], ['Aulas práticas de carro (20 aulas)', '1.100,00'],
    ['Aulas práticas de moto (2 aulas)', '180,00'], ['Aulas práticas de moto (5 aulas)', '400,00'], ['Aulas práticas de moto (10 aulas)', '600,00'], ['Aulas práticas de moto (20 aulas)', '1.000,00'],
    ['Tx direção carro', '170,00'], ['Tx direção moto', '170,00'], ['Aluguel do carro', '180,00'], ['Aluguel da moto', '180,00'], ['Aluguel da pista', '100,00'],
    ['Total (2 aulas)', '2.134,46'], ['Total (5 aulas)', '2.604,46'], ['Total (10 aulas)', '3.154,46'], ['Total (20 aulas)', '3.854,46'],
  ]),
  ...makePriceRows('adicao-carro', 'Adição de Carro', [
    ['Tx de adição de categoria', '170,00'], ['Psicotécnico', '232,23'],
    ['Aulas práticas (2 aulas)', '200,00'], ['Aulas práticas (5 aulas)', '450,00'], ['Aulas práticas (10 aulas)', '800,00'], ['Aulas práticas (15 aulas)', '900,00'],
    ['Tx direção', '170,00'], ['Aluguel do carro', '180,00'],
    ['Total (2 aulas)', '952,23'], ['Total (5 aulas)', '1.202,23'], ['Total (10 aulas)', '1.552,23'], ['Total (15 aulas)', '1.652,23'],
  ]),
  ...makePriceRows('adicao-moto', 'Adição de Moto', [
    ['Tx de adição de categoria', '170,00'], ['Psicotécnico', '232,23'],
    ['Aulas práticas (2 aulas)', '180,00'], ['Aulas práticas (5 aulas)', '400,00'], ['Aulas práticas (10 aulas)', '600,00'], ['Aulas práticas (15 aulas)', '900,00'],
    ['Tx direção', '170,00'], ['Aluguel da moto', '180,00'], ['Aluguel da pista', '100,00'],
    ['Total (2 aulas)', '1.032,23'], ['Total (5 aulas)', '1.252,23'], ['Total (10 aulas)', '1.452,23'], ['Total (15 aulas)', '1.752,23'],
  ]),
  ...makePriceRows('onibus', 'Ônibus', [
    ['Tx mudança de categoria', '170,00'], ['Psicotécnico', '464,46'],
    ['Aulas práticas (10 aulas)', '1.000,00'], ['Aulas práticas (15 aulas)', '1.200,00'], ['Aulas práticas (20 aulas)', '1.400,00'],
    ['Tx direção carro', '170,00'], ['Aluguel do ônibus', '250,00'],
    ['Total (10 aulas)', '2.054,46'], ['Total (15 aulas)', '2.254,46'], ['Total (20 aulas)', '2.454,46'],
  ]),
];

function makePriceRows(
  idPrefix: string,
  category: string,
  rows: Array<[string, string]>,
): LicensePrice[] {
  return rows.map(([service, totalPrice], index) => ({
    id: `${idPrefix}-${index + 1}`,
    category,
    service,
    totalPrice,
    details: '',
  }));
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

function loadSlots(): Record<string, ScheduleSlot> {
  try { return JSON.parse(localStorage.getItem('mta_schedule') || '{}'); }
  catch { return {}; }
}
function saveSlots(s: Record<string, ScheduleSlot>) {
  localStorage.setItem('mta_schedule', JSON.stringify(s));
}

function loadPrices(): LicensePrice[] {
  try {
    if (localStorage.getItem('mta_license_prices_version') !== PRICE_TABLE_VERSION) {
      savePrices(DEFAULT_LICENSE_PRICES);
      return DEFAULT_LICENSE_PRICES;
    }

    const stored = JSON.parse(localStorage.getItem('mta_license_prices') || '[]');
    return stored.map((price: LicensePrice & { cashPrice?: string; installmentPrice?: string }) => ({
      id: price.id,
      category: price.category,
      service: price.service,
      totalPrice: price.totalPrice ?? price.cashPrice ?? '',
      details: price.details ?? (price.installmentPrice ? `Parcelamento: ${price.installmentPrice}` : ''),
    }));
  } catch {
    return DEFAULT_LICENSE_PRICES;
  }
}

function savePrices(prices: LicensePrice[]) {
  localStorage.setItem('mta_license_prices', JSON.stringify(prices));
  localStorage.setItem('mta_license_prices_version', PRICE_TABLE_VERSION);
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getMonday(d: Date): Date {
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function addDays(d: Date, n: number): Date {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt;
}

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function slotId(date: string, time: string) {
  return `${date}-${time}`;
}

function formatDisplayDate(ymd: string): string {
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
}

function slotDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`);
}

function isPast(date: string, time: string): boolean {
  return slotDateTime(date, time) < new Date();
}

// ─── Notification helpers ─────────────────────────────────────────────────────

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function fireNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  }
}

// Schedule reminders: checked every 30 seconds
let reminderInterval: ReturnType<typeof setInterval> | null = null;
const firedReminders = new Set<string>();

export function startReminderWatcher(userCPF: string) {
  if (reminderInterval) clearInterval(reminderInterval);
  reminderInterval = setInterval(() => {
    const slots = loadSlots();
    const now = Date.now();
    Object.values(slots).forEach((slot) => {
      if (slot.bookedBy !== userCPF) return;
      const dt = slotDateTime(slot.date, slot.time).getTime();
      const diffMin = (dt - now) / 60000;
      // Fire between 55 and 65 minutes before class
      if (diffMin >= 55 && diffMin <= 65 && !firedReminders.has(slot.id)) {
        firedReminders.add(slot.id);
        fireNotification(
          '🚗 Aula em 1 hora! — Master Top A',
          `Sua aula está marcada para hoje às ${slot.time}. Prepare-se!`
        );
      }
    });
  }, 30_000);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ScheduleScreen({ userCPF, userName, onBack }: Props) {
  const [slots, setSlots] = useState<Record<string, ScheduleSlot>>(loadSlots);
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [accessMode, setAccessMode] = useState<'locked' | 'student' | 'admin'>('locked');
  const [accessType, setAccessType] = useState<'student' | 'admin'>('student');
  const [accessInput, setAccessInput] = useState('');
  const [accessError, setAccessError] = useState('');
  const [adminMode, setAdminMode] = useState(false);
  const [showPIN, setShowPIN] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [toast, setToast] = useState('');
  const [pendingBooking, setPendingBooking] = useState<{ date: string; time: string } | null>(null);
  const [vehicleInput, setVehicleInput] = useState('');
  const [vehicleError, setVehicleError] = useState('');
  const [adminBooking, setAdminBooking] = useState<{ date: string; time: string } | null>(null);
  const [adminStudentName, setAdminStudentName] = useState('');
  const [adminStudentCPF, setAdminStudentCPF] = useState('');
  const [adminVehicle, setAdminVehicle] = useState('');
  const [adminBookingError, setAdminBookingError] = useState('');
  const [viewMode, setViewMode] = useState<'student' | 'admin' | 'prices'>('student');
  const [prices, setPrices] = useState<LicensePrice[]>(loadPrices);
  const [priceDraft, setPriceDraft] = useState<LicensePrice[]>(loadPrices);

  // Days of this week
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    requestNotificationPermission();
    startReminderWatcher(userCPF);
  }, [userCPF]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }, []);

  function persist(updated: Record<string, ScheduleSlot>) {
    setSlots(updated);
    saveSlots(updated);
  }

  function addPriceRow() {
    setPriceDraft((current) => [
      ...current,
      {
        id: `${Date.now()}`,
        category: '',
        service: '',
        totalPrice: '',
        details: '',
      },
    ]);
  }

  function addPriceCategory(category: string) {
    const name = category.trim();
    if (!name) {
      showToast('Digite o nome da nova categoria.');
      return false;
    }

    if (priceDraft.some((price) => price.category.toLowerCase() === name.toLowerCase())) {
      showToast('Essa categoria já existe.');
      return false;
    }

    setPriceDraft((current) => [
      ...current,
      {
        id: `category-${Date.now()}`,
        category: name,
        service: 'Novo item',
        totalPrice: '',
        details: '',
      },
    ]);
    showToast(`Categoria “${name}” criada. Adicione os valores e publique.`);
    return true;
  }

  function updatePriceRow(id: string, field: keyof Omit<LicensePrice, 'id'>, value: string) {
    setPriceDraft((current) =>
      current.map((price) => price.id === id ? { ...price, [field]: value } : price)
    );
  }

  function removePriceRow(id: string) {
    setPriceDraft((current) => current.filter((price) => price.id !== id));
  }

  function publishPrices() {
    const published = priceDraft.filter((price) =>
      price.category.trim() || price.service.trim() || price.totalPrice.trim() || price.details.trim()
    );
    setPriceDraft(published);
    setPrices(published);
    savePrices(published);
    showToast('Tabela de preços publicada com sucesso.');
  }

  function submitAccess(e: React.FormEvent) {
    e.preventDefault();
    const expected = accessType === 'student' ? STUDENT_PASSWORD : ADMIN_PIN;

    if (accessInput !== expected) {
      setAccessError(accessType === 'student' ? 'Senha de aluno incorreta.' : 'Senha da recepção incorreta.');
      return;
    }

    const isAdmin = accessType === 'admin';
    setAccessMode(isAdmin ? 'admin' : 'student');
    setAdminMode(isAdmin);
    setViewMode(isAdmin ? 'admin' : 'student');
    setAccessInput('');
    setAccessError('');
  }

  // ── Admin: toggle slot availability ──────────────────────────────────────
  function adminToggleAvailability(date: string, time: string) {
    const id = slotId(date, time);
    const updated = { ...slots };
    const existing = updated[id];
    if (existing) {
      if (existing.bookedBy) {
        showToast('⚠️ Horário já reservado por um aluno. Cancele a reserva antes de desativar.');
        return;
      }
      updated[id] = { ...existing, available: !existing.available };
    } else {
      updated[id] = { id, date, time, available: true, bookedBy: null, bookedByName: null, vehicle: null };
    }
    persist(updated);
  }

  // Admin: cancel a student booking
  function adminCancelBooking(id: string) {
    const updated = { ...slots };
    if (updated[id]) {
      updated[id] = { ...updated[id], bookedBy: null, bookedByName: null, vehicle: null };
      persist(updated);
      showToast('Reserva cancelada pela recepção.');
    }
  }

  function startAdminBooking(date: string, time: string) {
    setAdminBooking({ date, time });
    setAdminStudentName('');
    setAdminStudentCPF('');
    setAdminVehicle('');
    setAdminBookingError('');
  }

  function closeAdminBooking() {
    setAdminBooking(null);
    setAdminStudentName('');
    setAdminStudentCPF('');
    setAdminVehicle('');
    setAdminBookingError('');
  }

  function confirmAdminBooking() {
    if (!adminBooking) return;

    const name = adminStudentName.trim();
    const cpf = adminStudentCPF.replace(/\D/g, '');
    const vehicle = adminVehicle.trim();
    if (!name) {
      setAdminBookingError('Informe o nome do aluno.');
      return;
    }
    if (cpf.length !== 11) {
      setAdminBookingError('Informe o CPF do aluno com 11 números.');
      return;
    }
    if (!vehicle) {
      setAdminBookingError('Informe qual veículo será usado.');
      return;
    }

    const id = slotId(adminBooking.date, adminBooking.time);
    const slot = slots[id];
    if (!slot?.available || slot.bookedBy) {
      closeAdminBooking();
      showToast('Este horário não está mais disponível.');
      return;
    }

    persist({
      ...slots,
      [id]: { ...slot, bookedBy: cpf, bookedByName: name, vehicle },
    });
    showToast(`Aula marcada para ${name} em ${formatDisplayDate(adminBooking.date)} às ${adminBooking.time}.`);
    closeAdminBooking();
  }

  function blockAdminBookingSlot() {
    if (!adminBooking) return;
    adminToggleAvailability(adminBooking.date, adminBooking.time);
    closeAdminBooking();
  }

  // ── Student: book or cancel slot ─────────────────────────────────────────
  function studentToggleBooking(date: string, time: string) {
    const id = slotId(date, time);
    const slot = slots[id];

    if (isPast(date, time)) {
      showToast('Este horário já passou.');
      return;
    }

    if (!slot || !slot.available) {
      showToast('❌ Horário indisponível. Tente outro ou entre em contato com a Auto Escola.');
      return;
    }

    if (slot.bookedBy && slot.bookedBy !== userCPF) {
      showToast('❌ Este horário já foi reservado por outro aluno.');
      return;
    }

    const updated = { ...slots };
    if (slot.bookedBy === userCPF) {
      // Cancel own booking
      updated[id] = { ...slot, bookedBy: null, bookedByName: null, vehicle: null };
      persist(updated);
      showToast('✅ Aula desmarcada com sucesso.');
    } else {
      setPendingBooking({ date, time });
      setVehicleInput('');
      setVehicleError('');
    }
  }

  function confirmStudentBooking() {
    if (!pendingBooking) return;

    const vehicle = vehicleInput.trim();
    if (!vehicle) {
      setVehicleError('Informe qual veículo será usado na aula.');
      return;
    }

    const id = slotId(pendingBooking.date, pendingBooking.time);
    const slot = slots[id];
    if (!slot?.available || slot.bookedBy) {
      setPendingBooking(null);
      setVehicleInput('');
      showToast('Este horário não está mais disponível.');
      return;
    }

    const updated = {
      ...slots,
      [id]: { ...slot, bookedBy: userCPF, bookedByName: userName, vehicle },
    };
    persist(updated);
    showToast(`Aula marcada para ${formatDisplayDate(pendingBooking.date)} às ${pendingBooking.time}.`);
    setPendingBooking(null);
    setVehicleInput('');
    setVehicleError('');
  }

  // ── PIN auth ──────────────────────────────────────────────────────────────
  function submitPIN() {
    if (pinInput === ADMIN_PIN) {
      setAccessMode('admin');
      setAdminMode(true);
      setViewMode('admin');
      setShowPIN(false);
      setPinInput('');
      setPinError('');
    } else {
      setPinError('PIN incorreto. Tente novamente.');
    }
  }

  // ── My bookings (student) ─────────────────────────────────────────────────
  const myBookings = Object.values(slots)
    .filter((s) => s.bookedBy === userCPF && !isPast(s.date, s.time))
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

  // ─── Render ────────────────────────────────────────────────────────────────

  if (accessMode === 'locked') {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col">
        <header className="bg-gray-900 px-4 pt-10 pb-4 flex items-center gap-3">
          <button onClick={onBack} className="text-yellow-400 text-xl font-bold" aria-label="Voltar">←</button>
          <div>
            <h1 className="text-white font-bold text-lg">Acesso à Agenda</h1>
            <p className="text-gray-500 text-xs">Exclusivo para alunos e recepção Master Top</p>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-5 py-8">
          <form onSubmit={submitAccess} className="w-full max-w-sm bg-gray-900 rounded-2xl p-6 flex flex-col gap-4 shadow-2xl">
            <div className="grid grid-cols-2 gap-2 bg-gray-800 rounded-xl p-1">
              <button
                type="button"
                onClick={() => { setAccessType('student'); setAccessInput(''); setAccessError(''); }}
                className={`py-2 rounded-lg text-sm font-bold transition ${accessType === 'student' ? 'bg-yellow-400 text-gray-900' : 'text-gray-400'}`}
              >
                Sou aluno
              </button>
              <button
                type="button"
                onClick={() => { setAccessType('admin'); setAccessInput(''); setAccessError(''); }}
                className={`py-2 rounded-lg text-sm font-bold transition ${accessType === 'admin' ? 'bg-yellow-400 text-gray-900' : 'text-gray-400'}`}
              >
                Recepção
              </button>
            </div>

            <div>
              <label htmlFor="schedule-access" className="block text-sm font-semibold text-gray-300 mb-2">
                {accessType === 'student' ? 'Senha do aluno' : 'Senha da recepção'}
              </label>
              <input
                id="schedule-access"
                type="password"
                value={accessInput}
                onChange={(e) => { setAccessInput(e.target.value); setAccessError(''); }}
                placeholder="Digite a senha"
                autoComplete="off"
                autoFocus
                className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 border-2 border-gray-700 focus:border-yellow-400 focus:outline-none"
              />
            </div>

            {accessError && <p className="text-red-400 text-sm text-center">{accessError}</p>}

            <button type="submit" className="w-full bg-yellow-400 text-gray-900 font-bold py-3 rounded-xl active:scale-95 transition">
              Acessar agenda
            </button>
            <p className="text-gray-500 text-xs text-center">
              O simulado e as demais funções continuam disponíveis para todos.
            </p>
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">

      {/* Header */}
      <header className="bg-gray-900 px-4 pt-10 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-yellow-400 text-xl font-bold">←</button>
          <div>
            <h1 className="text-white font-bold text-lg">Agenda de Aulas</h1>
            <p className="text-gray-500 text-xs">{adminMode ? '👷 Modo Recepção' : `📅 Aluno: ${userName.split(' ')[0]}`}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!adminMode && (
            <button
              onClick={() => setShowPIN(true)}
              className="text-xs text-gray-500 border border-gray-700 px-2 py-1 rounded-lg"
            >
              Recepção
            </button>
          )}
          {adminMode && (
            <button
              onClick={() => {
                setAccessMode('locked');
                setAccessType('student');
                setAdminMode(false);
                setViewMode('student');
              }}
              className="text-xs text-yellow-400 border border-yellow-400/30 px-2 py-1 rounded-lg"
            >
              Sair
            </button>
          )}
        </div>
      </header>

      {/* Mode tabs */}
      {adminMode && (
        <div className="flex bg-gray-900 border-t border-gray-800">
          <button
            onClick={() => setViewMode('admin')}
            className={`flex-1 py-2 text-sm font-semibold ${viewMode === 'admin' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-500'}`}
          >
            Gerenciar Horários
          </button>
          <button
            onClick={() => setViewMode('student')}
            className={`flex-1 py-2 text-sm font-semibold ${viewMode === 'student' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-500'}`}
          >
            Ver Reservas
          </button>
          <button
            onClick={() => setViewMode('prices')}
            className={`flex-1 py-2 text-sm font-semibold ${viewMode === 'prices' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-500'}`}
          >
            Publicar Preços
          </button>
        </div>
      )}

      {!adminMode && (
        <div className="flex bg-gray-900 border-t border-gray-800">
          <button
            onClick={() => setViewMode('student')}
            className={`flex-1 py-3 text-sm font-semibold ${viewMode === 'student' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-500'}`}
          >
            Agendar Aula
          </button>
          <button
            onClick={() => setViewMode('prices')}
            className={`flex-1 py-3 text-sm font-semibold ${viewMode === 'prices' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-500'}`}
          >
            Preços da CNH
          </button>
        </div>
      )}

      {/* Week navigation */}
      {viewMode !== 'prices' && (
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-t border-gray-800">
          <button
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="text-yellow-400 font-bold px-3 py-1 rounded-lg bg-gray-800"
          >
            ‹
          </button>
          <p className="text-white text-sm font-semibold">
            {formatDisplayDate(toYMD(weekStart))} – {formatDisplayDate(toYMD(addDays(weekStart, 6)))}
          </p>
          <button
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="text-yellow-400 font-bold px-3 py-1 rounded-lg bg-gray-800"
          >
            ›
          </button>
        </div>
      )}

      {/* ── ADMIN: Manage slots ────────────────────────────────────────── */}
      {adminMode && viewMode === 'admin' && (
        <AdminGrid
          weekDays={weekDays}
          timeSlots={TIME_SLOTS}
          slots={slots}
          onToggle={adminToggleAvailability}
          onBook={startAdminBooking}
          onCancelBooking={adminCancelBooking}
        />
      )}

      {/* ── ADMIN: View all bookings ───────────────────────────────────── */}
      {adminMode && viewMode === 'student' && (
        <AllBookingsView slots={slots} />
      )}

      {adminMode && viewMode === 'prices' && (
        <AdminPrices
          prices={priceDraft}
          onAdd={addPriceRow}
          onAddCategory={addPriceCategory}
          onUpdate={updatePriceRow}
          onRemove={removePriceRow}
          onPublish={publishPrices}
        />
      )}

      {/* ── STUDENT: Book slots ────────────────────────────────────────── */}
      {!adminMode && viewMode === 'student' && (
        <>
          <StudentGrid
            weekDays={weekDays}
            timeSlots={TIME_SLOTS}
            slots={slots}
            userCPF={userCPF}
            onToggle={studentToggleBooking}
          />

          {/* My upcoming bookings */}
          {myBookings.length > 0 && (
            <div className="px-4 pb-6 mt-2">
              <p className="text-yellow-400 font-bold text-sm mb-3">Minhas aulas marcadas</p>
              <div className="flex flex-col gap-2">
                {myBookings.map((s) => (
                  <div key={s.id} className="flex items-center justify-between bg-gray-900 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-white font-semibold text-sm">
                        {DAYS_FULL[new Date(s.date + 'T12:00').getDay()]} — {s.time}
                      </p>
                      <p className="text-gray-500 text-xs">{formatDisplayDate(s.date)}</p>
                      <p className="text-yellow-400 text-xs mt-1">Veículo: {s.vehicle || 'Não informado'}</p>
                    </div>
                    <button
                      onClick={() => studentToggleBooking(s.date, s.time)}
                      className="text-red-400 text-xs border border-red-400/30 px-3 py-1 rounded-lg"
                    >
                      Desmarcar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!adminMode && viewMode === 'prices' && (
        <PublishedPrices prices={prices} />
      )}

      {/* Vehicle confirmation */}
      {pendingBooking && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-6">
          <form
            onSubmit={(event) => { event.preventDefault(); confirmStudentBooking(); }}
            className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4"
          >
            <div>
              <h2 className="text-white font-bold text-lg text-center">Informe o veículo</h2>
              <p className="text-gray-400 text-sm text-center mt-1">
                Aula em {formatDisplayDate(pendingBooking.date)} às {pendingBooking.time}
              </p>
            </div>
            <div>
              <label htmlFor="booking-vehicle" className="block text-gray-300 text-sm font-semibold mb-2">
                Qual veículo será usado na aula?
              </label>
              <input
                id="booking-vehicle"
                type="text"
                value={vehicleInput}
                onChange={(event) => { setVehicleInput(event.target.value); setVehicleError(''); }}
                placeholder="Ex: carro Onix ou moto CG 160"
                autoFocus
                className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 border-2 border-gray-700 focus:border-yellow-400 focus:outline-none"
              />
            </div>
            {vehicleError && <p className="text-red-400 text-sm text-center">{vehicleError}</p>}
            <button type="submit" className="bg-yellow-400 text-gray-900 font-bold py-3 rounded-xl">
              Confirmar agendamento
            </button>
            <button
              type="button"
              onClick={() => { setPendingBooking(null); setVehicleInput(''); setVehicleError(''); }}
              className="text-gray-500 text-sm text-center"
            >
              Cancelar
            </button>
          </form>
        </div>
      )}

      {/* Reception booking */}
      {adminBooking && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-6">
          <form
            onSubmit={(event) => { event.preventDefault(); confirmAdminBooking(); }}
            className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4"
          >
            <div>
              <h2 className="text-white font-bold text-lg text-center">Marcar aula para aluno</h2>
              <p className="text-gray-400 text-sm text-center mt-1">
                {formatDisplayDate(adminBooking.date)} às {adminBooking.time}
              </p>
            </div>
            <div>
              <label htmlFor="admin-student-name" className="block text-gray-300 text-sm font-semibold mb-2">
                Nome completo do aluno
              </label>
              <input
                id="admin-student-name"
                type="text"
                value={adminStudentName}
                onChange={(event) => { setAdminStudentName(event.target.value); setAdminBookingError(''); }}
                placeholder="Nome do aluno"
                autoFocus
                className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 border-2 border-gray-700 focus:border-yellow-400 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="admin-student-cpf" className="block text-gray-300 text-sm font-semibold mb-2">
                CPF do aluno
              </label>
              <input
                id="admin-student-cpf"
                type="text"
                inputMode="numeric"
                value={adminStudentCPF}
                onChange={(event) => {
                  setAdminStudentCPF(event.target.value.replace(/\D/g, '').slice(0, 11));
                  setAdminBookingError('');
                }}
                placeholder="Somente 11 números"
                className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 border-2 border-gray-700 focus:border-yellow-400 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="admin-booking-vehicle" className="block text-gray-300 text-sm font-semibold mb-2">
                Veículo da aula
              </label>
              <input
                id="admin-booking-vehicle"
                type="text"
                value={adminVehicle}
                onChange={(event) => { setAdminVehicle(event.target.value); setAdminBookingError(''); }}
                placeholder="Ex: carro Onix ou moto CG 160"
                className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 border-2 border-gray-700 focus:border-yellow-400 focus:outline-none"
              />
            </div>
            {adminBookingError && <p className="text-red-400 text-sm text-center">{adminBookingError}</p>}
            <button type="submit" className="bg-yellow-400 text-gray-900 font-bold py-3 rounded-xl">
              Confirmar para o aluno
            </button>
            <button
              type="button"
              onClick={blockAdminBookingSlot}
              className="bg-gray-800 text-gray-300 font-semibold py-3 rounded-xl"
            >
              Bloquear este horário
            </button>
            <button type="button" onClick={closeAdminBooking} className="text-gray-500 text-sm text-center">
              Cancelar
            </button>
          </form>
        </div>
      )}

      {/* PIN Modal */}
      {showPIN && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-6">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-xs flex flex-col gap-4">
            <h2 className="text-white font-bold text-lg text-center">Acesso Recepção</h2>
            <p className="text-gray-400 text-sm text-center">Digite o PIN da recepção</p>
            <input
              type="password"
              value={pinInput}
              onChange={(e) => { setPinInput(e.target.value); setPinError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && submitPIN()}
              placeholder="••••"
              inputMode="numeric"
              maxLength={4}
              className="bg-gray-800 text-white text-center text-2xl tracking-widest rounded-xl px-4 py-3 border-2 border-gray-700 focus:border-yellow-400 focus:outline-none"
            />
            {pinError && <p className="text-red-400 text-sm text-center">{pinError}</p>}
            <button onClick={submitPIN} className="bg-yellow-400 text-gray-900 font-bold py-3 rounded-xl">
              Entrar
            </button>
            <button onClick={() => { setShowPIN(false); setPinInput(''); setPinError(''); }} className="text-gray-500 text-sm text-center">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-4 right-4 z-50 bg-gray-800 text-white text-sm font-semibold px-4 py-3 rounded-2xl shadow-2xl text-center animate-bounce-once">
          {toast}
        </div>
      )}
    </div>
  );
}

// ─── Admin Grid ───────────────────────────────────────────────────────────────

function AdminGrid({
  weekDays, timeSlots, slots, onToggle, onBook, onCancelBooking,
}: {
  weekDays: Date[];
  timeSlots: string[];
  slots: Record<string, ScheduleSlot>;
  onToggle: (date: string, time: string) => void;
  onBook: (date: string, time: string) => void;
  onCancelBooking: (id: string) => void;
}) {
  return (
    <div className="flex-1 overflow-auto px-2 pb-6 pt-2">
      <p className="text-gray-500 text-xs text-center mb-3 px-2">
        Toque em um horário verde para marcar uma aula ou bloqueá-lo. Toque em um horário azul para cancelar a reserva.
      </p>

      {/* Day headers */}
      <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: '44px repeat(7, 1fr)' }}>
        <div />
        {weekDays.map((d, i) => (
          <div key={i} className="text-center">
            <p className="text-gray-500 text-xs">{DAYS_SHORT[d.getDay()]}</p>
            <p className="text-white text-xs font-bold">{d.getDate()}</p>
          </div>
        ))}
      </div>

      {/* Grid rows */}
      {timeSlots.map((time) => (
        <div key={time} className="grid gap-1 mb-1" style={{ gridTemplateColumns: '44px repeat(7, 1fr)' }}>
          <div className="flex items-center justify-center">
            <span className="text-gray-500 text-xs">{time}</span>
          </div>
          {weekDays.map((d, di) => {
            const date = toYMD(d);
            const id = slotId(date, time);
            const slot = slots[id];
            const past = isPast(date, time);
            const booked = slot?.bookedBy;

            let bg = 'bg-gray-800 border-gray-700';
            let label = '';
            if (past) bg = 'bg-gray-900 border-gray-800 opacity-40';
            else if (booked) { bg = 'bg-blue-600/40 border-blue-500'; label = slot.bookedByName?.split(' ')[0] || ''; }
            else if (slot?.available) bg = 'bg-green-600/30 border-green-600';
            else bg = 'bg-red-900/20 border-red-900/40';

            return (
              <button
                key={di}
                onClick={() => {
                  if (booked) onCancelBooking(id);
                  else if (!past && slot?.available) onBook(date, time);
                  else if (!past) onToggle(date, time);
                }}
                className={`rounded-lg border text-center py-2 px-0.5 transition ${bg}`}
                title={booked ? `Reservado: ${slot.bookedByName} — Veículo: ${slot.vehicle || 'não informado'}` : slot?.available ? 'Ativo — toque para desativar' : 'Inativo — toque para ativar'}
              >
                {booked
                  ? <span className="text-blue-300 text-xs font-bold leading-none">{label}</span>
                  : slot?.available
                  ? <span className="text-green-400 text-xs">✓</span>
                  : <span className="text-gray-700 text-xs">—</span>
                }
              </button>
            );
          })}
        </div>
      ))}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 justify-center mt-4 px-4">
        <LegendDot color="bg-green-600/40" label="Disponível" />
        <LegendDot color="bg-gray-800" label="Bloqueado" />
        <LegendDot color="bg-blue-600/40" label="Reservado" />
        <LegendDot color="bg-gray-900 opacity-40" label="Passado" />
      </div>
    </div>
  );
}

// ─── Student Grid ─────────────────────────────────────────────────────────────

function StudentGrid({
  weekDays, timeSlots, slots, userCPF, onToggle,
}: {
  weekDays: Date[];
  timeSlots: string[];
  slots: Record<string, ScheduleSlot>;
  userCPF: string;
  onToggle: (date: string, time: string) => void;
}) {
  return (
    <div className="flex-1 overflow-auto px-2 pb-4 pt-2">
      <p className="text-gray-500 text-xs text-center mb-3 px-2">
        Toque em um horário verde para marcar sua aula. Toque novamente para desmarcar.
      </p>

      {/* Day headers */}
      <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: '44px repeat(7, 1fr)' }}>
        <div />
        {weekDays.map((d, i) => {
          const today = toYMD(new Date()) === toYMD(d);
          return (
            <div key={i} className="text-center">
              <p className="text-gray-500 text-xs">{DAYS_SHORT[d.getDay()]}</p>
              <p className={`text-xs font-bold ${today ? 'text-yellow-400' : 'text-white'}`}>{d.getDate()}</p>
            </div>
          );
        })}
      </div>

      {/* Grid rows */}
      {timeSlots.map((time) => (
        <div key={time} className="grid gap-1 mb-1" style={{ gridTemplateColumns: '44px repeat(7, 1fr)' }}>
          <div className="flex items-center justify-center">
            <span className="text-gray-500 text-xs">{time}</span>
          </div>
          {weekDays.map((d, di) => {
            const date = toYMD(d);
            const id = slotId(date, time);
            const slot = slots[id];
            const past = isPast(date, time);
            const isMyBooking = slot?.bookedBy === userCPF;
            const otherBooked = slot?.bookedBy && slot.bookedBy !== userCPF;

            let bg = '';
            let content: React.ReactNode = <span className="text-gray-800 text-xs">·</span>;

            if (past) {
              bg = 'bg-gray-900 border-gray-800 opacity-30 cursor-default';
            } else if (isMyBooking) {
              bg = 'bg-yellow-400/20 border-yellow-400 cursor-pointer';
              content = <span className="text-yellow-400 text-xs font-bold">✓</span>;
            } else if (otherBooked || !slot?.available) {
              bg = 'bg-gray-900 border-gray-800 cursor-default';
              content = <span className="text-gray-800 text-xs">✕</span>;
            } else if (slot?.available) {
              bg = 'bg-green-600/20 border-green-600/60 cursor-pointer hover:bg-green-600/30';
              content = <span className="text-green-400 text-xs">○</span>;
            } else {
              bg = 'bg-gray-900 border-gray-800 cursor-default';
            }

            return (
              <button
                key={di}
                onClick={() => onToggle(date, time)}
                disabled={past || (!isMyBooking && (!slot?.available || !!otherBooked))}
                className={`rounded-lg border text-center py-2 transition ${bg}`}
              >
                {content}
              </button>
            );
          })}
        </div>
      ))}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 justify-center mt-4 px-4">
        <LegendDot color="bg-green-600/30" label="Disponível" border="border-green-600/60" />
        <LegendDot color="bg-yellow-400/20" label="Marcado (meu)" border="border-yellow-400" />
        <LegendDot color="bg-gray-900" label="Indisponível" border="border-gray-800" />
      </div>
    </div>
  );
}

// ─── License prices ──────────────────────────────────────────────────────────

function AdminPrices({
  prices,
  onAdd,
  onAddCategory,
  onUpdate,
  onRemove,
  onPublish,
}: {
  prices: LicensePrice[];
  onAdd: () => void;
  onAddCategory: (category: string) => boolean;
  onUpdate: (id: string, field: keyof Omit<LicensePrice, 'id'>, value: string) => void;
  onRemove: (id: string) => void;
  onPublish: () => void;
}) {
  const [newCategory, setNewCategory] = useState('');

  function submitCategory(event: React.FormEvent) {
    event.preventDefault();
    if (onAddCategory(newCategory)) setNewCategory('');
  }

  return (
    <div className="flex-1 overflow-auto px-2 py-4 pb-10">
      <div className="mb-4">
        <p className="text-yellow-400 font-bold text-lg">Tabela de preços</p>
        <p className="text-gray-500 text-xs mt-1">
          Preencha como uma planilha e publique para os alunos.
        </p>
      </div>

      <form onSubmit={submitCategory} className="bg-gray-900 rounded-xl border border-gray-800 p-3 mb-4">
        <label htmlFor="new-price-category" className="block text-white text-sm font-bold mb-2">
          Criar nova opção para o aluno
        </label>
        <div className="flex gap-2">
          <input
            id="new-price-category"
            type="text"
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value)}
            placeholder="Ex: Categoria D"
            className="min-w-0 flex-1 bg-gray-800 text-white text-sm rounded-xl px-3 py-3 border border-gray-700 focus:border-yellow-400 focus:outline-none"
          />
          <button
            type="submit"
            className="bg-yellow-400 text-gray-900 text-sm font-bold px-4 rounded-xl"
          >
            Criar botão
          </button>
        </div>
        <p className="text-gray-500 text-xs mt-2">
          Depois de preencher os itens, toque em “Salvar e publicar” para a nova opção aparecer aos alunos.
        </p>
      </form>

      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <div className="min-w-2xl">
          <div className="grid grid-cols-[150px_140px_120px_2fr_44px] gap-px bg-gray-800">
            {['Categoria', 'Item da tabela', 'Valor', 'Observação', ''].map((heading) => (
              <p key={heading || 'actions'} className="bg-gray-900 text-gray-400 text-xs font-bold px-3 py-3">
                {heading}
              </p>
            ))}
          </div>

          {prices.map((price) => (
            <div key={price.id} className="grid grid-cols-[150px_140px_120px_2fr_44px] gap-px bg-gray-800 border-t border-gray-800">
              <PriceInput
                value={price.category}
                placeholder="A, B, AB"
                label="Categoria"
                onChange={(value) => onUpdate(price.id, 'category', value)}
              />
              <PriceInput
                value={price.service}
                placeholder="Ex: Tx inscrição"
                label="Item da tabela"
                onChange={(value) => onUpdate(price.id, 'service', value)}
              />
              <PriceInput
                value={price.totalPrice}
                placeholder="R$ 0,00"
                label="Valor"
                onChange={(value) => onUpdate(price.id, 'totalPrice', value)}
              />
              <PriceInput
                value={price.details}
                placeholder="Observação opcional"
                label="Observação"
                onChange={(value) => onUpdate(price.id, 'details', value)}
              />
              <button
                type="button"
                onClick={() => onRemove(price.id)}
                className="bg-gray-900 text-red-400 font-bold"
                aria-label={`Excluir preço da categoria ${price.category || 'sem nome'}`}
              >
                ×
              </button>
            </div>
          ))}

          {prices.length === 0 && (
            <p className="bg-gray-900 text-gray-600 text-sm text-center py-8">
              Nenhum preço cadastrado.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <button
          type="button"
          onClick={onAdd}
          className="bg-gray-800 text-white font-bold py-3 rounded-xl border border-gray-700"
        >
          Adicionar linha
        </button>
        <button
          type="button"
          onClick={onPublish}
          className="bg-yellow-400 text-gray-900 font-bold py-3 rounded-xl"
        >
          Salvar e publicar
        </button>
      </div>
      <p className="text-gray-600 text-xs text-center mt-3">
        Linhas completamente vazias não serão publicadas.
      </p>
    </div>
  );
}

function PriceInput({
  value,
  placeholder,
  label,
  onChange,
}: {
  value: string;
  placeholder: string;
  label: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={label}
      className="min-w-0 bg-gray-900 text-white text-xs px-3 py-3 focus:outline-none focus:bg-gray-800"
    />
  );
}

function PublishedPrices({ prices }: { prices: LicensePrice[] }) {
  const groupedPrices = prices.reduce<Array<{ category: string; plans: LicensePrice[] }>>((groups, price) => {
    const existing = groups.find((group) => group.category === price.category);
    if (existing) {
      existing.plans.push(price);
    } else {
      groups.push({ category: price.category, plans: [price] });
    }
    return groups;
  }, []);
  const [selectedCategory, setSelectedCategory] = useState(groupedPrices[0]?.category ?? '');
  const selectedTable = groupedPrices.find((group) => group.category === selectedCategory) ?? groupedPrices[0];

  return (
    <div className="flex-1 overflow-auto px-2 py-4 pb-10">
      <div className="mb-4">
        <p className="text-yellow-400 font-bold text-lg">Tabela de preços</p>
        <p className="text-gray-500 text-xs mt-1">
          Valores da Auto Escola Master Top.
        </p>
      </div>

      {prices.length === 0 ? (
        <div className="bg-gray-900 rounded-2xl p-6 text-center border border-gray-800">
          <p className="text-white font-semibold">Tabela em atualização</p>
          <p className="text-gray-500 text-sm mt-1">
            A recepção ainda não publicou os valores.
          </p>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {groupedPrices.map(({ category }) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`rounded-xl px-3 py-3 text-sm font-bold transition ${
                  selectedTable?.category === category
                    ? 'bg-yellow-400 text-gray-950'
                    : 'bg-gray-900 text-gray-300 border border-gray-800'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {selectedTable && (
            <section className="bg-white rounded-xl overflow-hidden border-2 border-yellow-400 shadow-xl">
              <div className="bg-yellow-400 px-4 py-3 border-b-2 border-gray-900">
                <p className="text-gray-950 font-black text-lg leading-tight">{selectedTable.category}</p>
              </div>

              <div className="divide-y divide-gray-200">
                {selectedTable.plans.map((plan) => (
                  <PriceTableRow
                    key={plan.id}
                    label={plan.service}
                    value={plan.totalPrice || 'Consulte'}
                    highlight={plan.service.startsWith('Total')}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
      <p className="text-gray-600 text-xs text-center mt-5">
        Valores sujeitos a alteração. Confirme as condições com a recepção.
      </p>
    </div>
  );
}

function PriceTableRow({
  item,
  label,
  value,
  highlight = false,
}: {
  item?: string;
  label?: string;
  value?: string;
  highlight?: boolean;
}) {
  const separatorIndex = item?.lastIndexOf(': ') ?? -1;
  const originalLabel = label ?? (separatorIndex >= 0 ? item?.slice(0, separatorIndex) : item) ?? '';
  const rowLabel = originalLabel
    .replace('Taxa de inscrição', 'Tx inscrição')
    .replace('Taxa de legislação', 'Tx legislação')
    .replace('Taxa de direção do carro', 'Tx direção carro')
    .replace('Taxa de direção da moto', 'Tx direção moto')
    .replace('Taxa de direção', 'Tx direção')
    .replace('Taxa de adição de categoria', 'Tx de adição de categoria')
    .replace('Taxa de mudança de categoria', 'Tx mudança de categoria');
  const rowValue = (value ?? (separatorIndex >= 0 ? item?.slice(separatorIndex + 2) : '') ?? '')
    .replace(/^R\$\s*/, '');
  const labelWithPunctuation = rowLabel.endsWith(':') ? rowLabel : `${rowLabel}:`;

  return (
    <div className={`grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-4 py-3 ${highlight ? 'bg-yellow-100' : 'bg-white'}`}>
      <p className={`text-sm leading-relaxed ${highlight ? 'text-gray-950 font-black' : 'text-gray-800 font-semibold'}`}>
        {labelWithPunctuation}
      </p>
      <p className={`text-sm leading-relaxed text-right whitespace-nowrap ${highlight ? 'text-gray-950 font-black' : 'text-gray-950 font-bold'}`}>
        {rowValue}
      </p>
    </div>
  );
}

// ─── All Bookings View (Admin) ────────────────────────────────────────────────

function AllBookingsView({ slots }: { slots: Record<string, ScheduleSlot> }) {
  const booked = Object.values(slots)
    .filter((s) => s.bookedBy !== null)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

  const upcoming = booked.filter((s) => !isPast(s.date, s.time));
  const past     = booked.filter((s) => isPast(s.date, s.time));

  return (
    <div className="flex-1 overflow-auto px-4 py-4 pb-10">
      <p className="text-yellow-400 font-bold text-sm mb-3">Próximas aulas reservadas ({upcoming.length})</p>
      {upcoming.length === 0 && (
        <p className="text-gray-600 text-sm text-center py-4">Nenhuma aula reservada</p>
      )}
      <div className="flex flex-col gap-2 mb-6">
        {upcoming.map((s) => (
          <BookingCard key={s.id} slot={s} />
        ))}
      </div>

      {past.length > 0 && (
        <>
          <p className="text-gray-600 font-bold text-sm mb-3">Aulas passadas ({past.length})</p>
          <div className="flex flex-col gap-2 opacity-50">
            {past.slice(0, 10).map((s) => (
              <BookingCard key={s.id} slot={s} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function BookingCard({ slot }: { slot: ScheduleSlot }) {
  const dayName = DAYS_FULL[new Date(slot.date + 'T12:00').getDay()];
  return (
    <div className="bg-gray-900 rounded-xl px-4 py-3 flex items-center justify-between">
      <div>
        <p className="text-white font-semibold text-sm">{dayName} às {slot.time}</p>
        <p className="text-gray-500 text-xs">{formatDisplayDate(slot.date)}</p>
      </div>
      <div className="text-right">
        <p className="text-yellow-400 text-sm font-bold">{slot.bookedByName}</p>
        <p className="text-gray-600 text-xs">{slot.bookedBy}</p>
        <p className="text-blue-300 text-xs mt-1">Veículo: {slot.vehicle || 'Não informado'}</p>
      </div>
    </div>
  );
}

function LegendDot({ color, label, border = 'border-transparent' }: { color: string; label: string; border?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-4 h-4 rounded border ${color} ${border}`} />
      <span className="text-gray-500 text-xs">{label}</span>
    </div>
  );
}
