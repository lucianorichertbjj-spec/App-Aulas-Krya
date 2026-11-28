import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Shield, Users, DollarSign, CheckCircle2, Clock, Search,
  LogOut, UserPlus, Camera, KeyRound, Copy, Check,
  QrCode, ChevronRight, AlertCircle, Folder, ArrowLeft, Settings, Trash2, X, Mail
} from 'lucide-react';

// =========================================================================
// CONEXÃO DIRETA COM O SUPABASE
// =========================================================================
const SUPABASE_URL = 'https://rihcrmjdryqjyuqxdapk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ZD9Lf2vJhoTUKXs1jl971A_viY2Ql9A';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =========================================================================
// VALIDAÇÃO SEGURA DO STATUS "USED" (EVITA BUG DE TEXTO "false" SER VERDADEIRO)
// =========================================================================
function isPreRegUsed(val) {
  return val === true || val === 'true' || val === 1 || val === '1';
}

// =========================================================================
// GERADOR DE LOGIN E SENHA ALEATÓRIOS PARA PROFESSORES
// =========================================================================
function generateProfessorCredentials(name) {
  const cleanFirst = (name || 'PROF')
    .replace(/^prof\.?\s*/i, '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(' ')[0]
    .toUpperCase()
    .replace(/[^A-Z]/g, '') || 'PROF';

  const login = `${cleanFirst}${String(Math.floor(10 + Math.random() * 89))}`;
  const password = String(Math.floor(100000 + Math.random() * 900000));
  return { login, password };
}

// =========================================================================
// PLANOS FAMILIARES KRYA BJJ
// =========================================================================
const FAMILY_PLANS = [
  { id: '1a_1k', name: '1 Adulto + 1 Kids (2 pessoas)', fee: 350 },
  { id: '2a', name: '2 Adultos (2 pessoas)', fee: 360 },
  { id: '3p', name: 'Plano Familiar (3 pessoas)', fee: 500 },
  { id: '2a_2k', name: '2 Adultos + 2 Kids (4 pessoas)', fee: 650 },
];

function getFamilyPlanById(planId) {
  return FAMILY_PLANS.find(p => p.id === planId) || null;
}

function getEffectiveFinancialState(student, allStudents, toleranceDays = 3) {
  const isDependent = student.familyRole === 'dependente' && Boolean(student.familyTitularId);
  const titular = isDependent
    ? allStudents.find(s => s.id === student.familyTitularId)
    : student;
  const ref = titular || student;
  const todayDay = new Date().getDate();
  const dueLimit = Number(ref.dueDay || 5) + Number(toleranceDays || 0);
  const isOverdue = ref.paymentStatus === 'Pendente' && todayDay > dueLimit;
  const isBlocked = ref.status === 'Inativo' || isOverdue;

  return {
    isDependent,
    titular: ref,
    paymentStatus: ref.paymentStatus,
    dueDay: ref.dueDay,
    fee: isDependent ? 0 : ref.fee,
    isBlocked,
    isOverdue
  };
}

// =========================================================================
// REMOVE DUPLICIDADES DE PRÉ-CADASTROS POR TOKEN
// =========================================================================
function dedupePreRegs(list) {
  const byToken = new Map();
  for (const item of list || []) {
    if (!item || !item.token) continue;
    const normalized = { ...item, used: isPreRegUsed(item.used) };
    const prev = byToken.get(normalized.token);
    if (!prev || (normalized.used && !prev.used)) {
      byToken.set(normalized.token, normalized);
    }
  }
  return Array.from(byToken.values());
}

// =========================================================================
// GERADOR DE LINK DE PRÉ-CADASTRO (ABRE A FICHA DIRETO NO CELULAR DO ALUNO)
// =========================================================================
function buildPreRegLink(pr) {
  const params = new URLSearchParams();
  params.set('token', pr.token);
  if (pr.name) params.set('n', pr.name);
  if (pr.phone) params.set('p', pr.phone);
  if (pr.email) params.set('e', pr.email);
  return `${window.location.origin}/?${params.toString()}`;
}

function getInitialUrlPreReg() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  if (!token) return null;
  return {
    token: token.trim().toUpperCase(),
    name: params.get('n') || '',
    phone: params.get('p') || '',
    email: params.get('e') || '',
    used: false
  };
}

// =========================================================================
// GERADOR OFICIAL DE PIX COPIA E COLA (PADRÃO EMV / BANCO CENTRAL + CRC16)
// =========================================================================
function crc16CCITT(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function formatEMV(id, value) {
  const len = String(value.length).padStart(2, '0');
  return `${id}${len}${value}`;
}

function generatePixPayload({ key, name, city, amount, txid = '***' }) {
  const cleanName = (name || 'CRISTIANE M G NASCIMENT')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .toUpperCase()
    .slice(0, 25);

  const cleanCity = (city || 'PORTO ALEGRE')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .toUpperCase()
    .slice(0, 15);

  const cleanTxid = (txid || '***').replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || '***';
  const merchantAccount = formatEMV('00', 'br.gov.bcb.pix') + formatEMV('01', key.trim());
  const additionalData = formatEMV('05', cleanTxid);

  const payload =
    formatEMV('00', '01') +
    formatEMV('26', merchantAccount) +
    formatEMV('52', '0000') +
    formatEMV('53', '986') +
    (amount ? formatEMV('54', Number(amount).toFixed(2)) : '') +
    formatEMV('58', 'BR') +
    formatEMV('59', cleanName) +
    formatEMV('60', cleanCity) +
    formatEMV('62', additionalData) +
    '6304';

  return payload + crc16CCITT(payload);
}

// =========================================================================
// MATRIZ OFICIAL DE GRADUAÇÃO KRYA BJJ (CORES SÓLIDAS + CLASSES TAILWIND)
// =========================================================================
const ADULT_BELTS = [
  { id: 'branca', name: 'Branca', bgClass: 'bg-slate-100', borderClass: 'border-slate-300', barClass: 'bg-zinc-950', hex: '#f1f5f9', barHex: '#09090b', classesPerDegree: 30, maxDegrees: 4 },
  { id: 'azul', name: 'Azul', bgClass: 'bg-blue-600', borderClass: 'border-blue-400', barClass: 'bg-zinc-950', hex: '#2563eb', barHex: '#09090b', classesPerDegree: 65, maxDegrees: 4 },
  { id: 'roxa', name: 'Roxa', bgClass: 'bg-purple-600', borderClass: 'border-purple-400', barClass: 'bg-zinc-950', hex: '#9333ea', barHex: '#09090b', classesPerDegree: 75, maxDegrees: 4 },
  { id: 'marrom', name: 'Marrom', bgClass: 'bg-amber-900', borderClass: 'border-amber-700', barClass: 'bg-zinc-950', hex: '#78350f', barHex: '#09090b', classesPerDegree: 85, maxDegrees: 4 },
  { id: 'preta', name: 'Preta', bgClass: 'bg-zinc-950', borderClass: 'border-slate-600', barClass: 'bg-red-600', hex: '#09090b', barHex: '#dc2626', classesPerDegree: 0, maxDegrees: 6, ibjjf: true },
];

const KIDS_BELTS = [
  { id: 'branca', name: 'Branca', bgClass: 'bg-slate-100', mainHex: '#f1f5f9', stripeClass: null, stripeHex: null },
  { id: 'cinza_branca', name: 'Cinza / Branca', bgClass: 'bg-slate-500', mainHex: '#64748b', stripeClass: 'bg-white', stripeHex: '#ffffff' },
  { id: 'cinza', name: 'Cinza', bgClass: 'bg-slate-500', mainHex: '#64748b', stripeClass: null, stripeHex: null },
  { id: 'cinza_preta', name: 'Cinza / Preta', bgClass: 'bg-slate-500', mainHex: '#64748b', stripeClass: 'bg-zinc-950', stripeHex: '#09090b' },
  { id: 'amarela_branca', name: 'Amarela / Branca', bgClass: 'bg-yellow-400', mainHex: '#facc15', stripeClass: 'bg-white', stripeHex: '#ffffff' },
  { id: 'amarela', name: 'Amarela', bgClass: 'bg-yellow-400', mainHex: '#facc15', stripeClass: null, stripeHex: null },
  { id: 'amarela_preta', name: 'Amarela / Preta', bgClass: 'bg-yellow-400', mainHex: '#facc15', stripeClass: 'bg-zinc-950', stripeHex: '#09090b' },
  { id: 'laranja_branca', name: 'Laranja / Branca', bgClass: 'bg-orange-500', mainHex: '#f97316', stripeClass: 'bg-white', stripeHex: '#ffffff' },
  { id: 'laranja', name: 'Laranja', bgClass: 'bg-orange-500', mainHex: '#f97316', stripeClass: null, stripeHex: null },
  { id: 'laranja_preta', name: 'Laranja / Preta', bgClass: 'bg-orange-500', mainHex: '#f97316', stripeClass: 'bg-zinc-950', stripeHex: '#09090b' },
  { id: 'verde_branca', name: 'Verde / Branca', bgClass: 'bg-emerald-600', mainHex: '#059669', stripeClass: 'bg-white', stripeHex: '#ffffff' },
  { id: 'verde', name: 'Verde', bgClass: 'bg-emerald-600', mainHex: '#059669', stripeClass: null, stripeHex: null },
  { id: 'verde_preta', name: 'Verde / Preta', bgClass: 'bg-emerald-600', mainHex: '#059669', stripeClass: 'bg-zinc-950', stripeHex: '#09090b' },
];

function getKidsClassesPerDegree(age, beltId) {
  const isBrancaCinza = beltId.startsWith('branca') || beltId.startsWith('cinza');
  const isAmarelaLaranja = beltId.startsWith('amarela') || beltId.startsWith('laranja');
  if (age <= 6) return 12;
  if (age <= 12) {
    if (isBrancaCinza) return 15;
    if (isAmarelaLaranja) return 20;
    return 22;
  }
  if (isBrancaCinza) return 20;
  if (isAmarelaLaranja) return 22;
  return 25;
}

function getAdultClassesPerDegree(beltId) {
  const b = ADULT_BELTS.find(x => x.id === beltId);
  return b ? b.classesPerDegree : 30;
}

function calculateAge(birthDateStr) {
  if (!birthDateStr) return 18;
  const today = new Date();
  const birth = new Date(birthDateStr + 'T12:00:00');
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return Math.max(4, age);
}

function getCategoryFromAge(age) {
  if (age <= 6) return 'Baby Kids (4-6)';
  if (age <= 16) return 'Kids / Juvenil (7-16)';
  return 'Adultos (16+)';
}

function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max = 300;
        let w = img.width;
        let h = img.height;
        if (w > h) { if (w > max) { h *= max / w; w = max; } }
        else { if (h > max) { w *= max / h; h = max; } }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function buildCredentialsWhatsAppLink(phone, name, code, password) {
  const appUrl = window.location.origin;
  const msg = `Olá ${name}! Seu acesso ao aplicativo Krya BJJ está ativo.\n\nAcesse: ${appUrl}\nLogin: ${code}\nSenha: ${password}`;
  const digits = (phone || '').replace(/\D/g, '');
  const prefix = digits ? `https://wa.me/55${digits}?text=` : 'https://wa.me/?text=';
  return `${prefix}${encodeURIComponent(msg)}`;
}

function buildReceiptWhatsAppLink(academyPhone, student) {
  const digits = (academyPhone || '51995667443').replace(/\D/g, '');
  const plan = student.familyRole === 'titular' ? getFamilyPlanById(student.familyPlanId) : null;
  const planLine = plan ? `\nPlano Familiar: ${plan.name}` : '';
  const msg = `Olá Krya BJJ! Segue o comprovante do pagamento Pix da mensalidade:\n\nAluno: ${student.name}\nCódigo: ${student.code}${planLine}\nValor: R$ ${student.fee},00`;
  return `https://wa.me/55${digits}?text=${encodeURIComponent(msg)}`;
}

function buildRecoveryMailtoLink(email, name, code, password) {
  const appUrl = window.location.origin;
  const subject = 'Recuperação de Senha - Krya BJJ';
  const body = `Olá ${name},\n\nAqui estão seus dados de acesso ao aplicativo Krya BJJ:\n\nLink: ${appUrl}\nLogin / Código: ${code}\nSenha: ${password}\n\nOss!`;
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// =========================================================================
// COMPONENTE VISUAL DA FAIXA
// =========================================================================
function BeltVisual({ category, beltId, degrees = 0, behavioral = {} }) {
  const isAdult = category === 'Adultos (16+)';

  if (isAdult) {
    const b = ADULT_BELTS.find(x => x.id === beltId) || ADULT_BELTS[0];
    return (
      <div className="w-full max-w-xs mx-auto my-2">
        <div
          className={`h-8 rounded-md shadow-md flex items-center justify-end overflow-hidden border-2 ${b.bgClass} ${b.borderClass}`}
          style={{ backgroundColor: b.hex }}
        >
          <div
            className={`h-full w-24 flex items-center justify-evenly px-1.5 border-x border-slate-700/70 ${b.barClass}`}
            style={{ backgroundColor: b.barHex }}
          >
            {Array.from({ length: b.maxDegrees }).map((_, i) => (
              <div
                key={i}
                className={`h-full w-1.5 transition-all ${
                  i < degrees ? 'bg-white shadow-sm' : 'bg-white/20'
                }`}
              />
            ))}
          </div>
          <div
            className={`w-4 h-full ${b.bgClass}`}
            style={{ backgroundColor: b.hex }}
          />
        </div>
      </div>
    );
  }

  const kb = KIDS_BELTS.find(x => x.id === beltId) || KIDS_BELTS[0];
  const baseDegrees = Math.min(4, degrees);
  const overlapDegrees = Math.max(0, Math.min(4, degrees - 4));

  return (
    <div className="w-full max-w-xs mx-auto my-2">
      <div
        className={`h-8 rounded-md shadow-md relative flex items-center justify-end overflow-hidden border-2 border-slate-500/80 ${kb.bgClass}`}
        style={{ backgroundColor: kb.mainHex }}
      >
        {kb.stripeClass && (
          <div
            className={`absolute inset-x-0 h-2.5 shadow-xs ${kb.stripeClass}`}
            style={{ backgroundColor: kb.stripeHex }}
          />
        )}

        <div
          className="relative z-10 h-full w-24 bg-zinc-950 border-x border-slate-700/80 flex items-center justify-evenly px-1.5"
          style={{ backgroundColor: '#09090b' }}
        >
          {[0, 1, 2, 3].map((idx) => {
            const hasRed = idx < overlapDegrees;
            const hasWhite = idx < baseDegrees;
            return (
              <div
                key={idx}
                className={`h-full w-2 transition-all ${
                  hasRed ? 'bg-red-500' : hasWhite ? 'bg-white' : 'bg-white/20'
                }`}
              />
            );
          })}
        </div>

        <div
          className={`relative z-10 w-4 h-full ${kb.bgClass}`}
          style={{ backgroundColor: kb.mainHex }}
        />
      </div>

      <div className="flex justify-center gap-2 mt-1.5">
        {[
          { key: 'rel', label: 'Relacionamento', color: 'bg-yellow-400' },
          { key: 'comp', label: 'Comportamento', color: 'bg-blue-500' },
          { key: 'notas', label: 'Notas/Org.', color: 'bg-red-500' },
          { key: 'hab', label: 'Bons Hábitos', color: 'bg-emerald-500' },
        ].map(tag => (
          <span
            key={tag.key}
            title={tag.label}
            className={`w-3 h-3 rounded-full border border-slate-600 ${
              behavioral?.[tag.key] ? tag.color : 'bg-slate-800 opacity-40'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// =========================================================================
// DADOS INICIAIS DE EXEMPLO
// =========================================================================
const INITIAL_STUDENTS = [
  {
    id: 'HEITOR12',
    code: 'HEITOR12',
    password: '1234',
    name: 'Heitor Campos',
    email: 'gabriela@kryabjj.com.br',
    phone: '(51) 99999-1111',
    birthDate: '2014-09-22',
    age: 12,
    category: 'Kids / Juvenil (7-16)',
    beltId: 'amarela',
    degrees: 2,
    classesInCurrentDegree: 14,
    monthsInBelt: 5,
    behavioral: { rel: true, comp: true, notas: false, hab: true },
    guardianName: 'Gabriela Campos de Oliveira',
    address: 'Porto Alegre, RS',
    dueDay: 5,
    fee: 185,
    paymentStatus: 'Em dia',
    lastPaymentMethod: 'Pix',
    status: 'Ativo',
    familyRole: 'individual',
    familyPlanId: '',
    familyTitularId: '',
    familyRequest: null,
    photo: ''
  },
  {
    id: 'LUCAS05',
    code: 'LUCAS05',
    password: '1234',
    name: 'Lucas Oliveira',
    email: 'pais.lucas@email.com',
    phone: '(51) 99999-2222',
    birthDate: '2021-04-10',
    age: 5,
    category: 'Baby Kids (4-6)',
    beltId: 'cinza_branca',
    degrees: 1,
    classesInCurrentDegree: 10,
    monthsInBelt: 4,
    behavioral: { rel: true, comp: false, notas: false, hab: true },
    guardianName: 'Mariana Oliveira',
    address: 'Porto Alegre, RS',
    dueDay: 10,
    fee: 185,
    paymentStatus: 'Pendente',
    lastPaymentMethod: '',
    status: 'Ativo',
    familyRole: 'individual',
    familyPlanId: '',
    familyTitularId: '',
    familyRequest: null,
    photo: ''
  },
  {
    id: 'MATHEUS14',
    code: 'MATHEUS14',
    password: '1234',
    name: 'Matheus Silva',
    email: 'silva.familia@email.com',
    phone: '(51) 99999-3333',
    birthDate: '2012-03-15',
    age: 14,
    category: 'Kids / Juvenil (7-16)',
    beltId: 'laranja',
    degrees: 6,
    classesInCurrentDegree: 19,
    monthsInBelt: 7,
    behavioral: { rel: true, comp: true, notas: true, hab: true },
    guardianName: 'Carlos Silva',
    address: 'Porto Alegre, RS',
    dueDay: 5,
    fee: 185,
    paymentStatus: 'Em dia',
    lastPaymentMethod: 'Cartão Crédito',
    status: 'Ativo',
    familyRole: 'individual',
    familyPlanId: '',
    familyTitularId: '',
    familyRequest: null,
    photo: ''
  },
  {
    id: 'FULANO18',
    code: 'FULANO18',
    password: '1234',
    name: 'Fulano de Tal',
    email: 'fulano@email.com',
    phone: '(51) 99999-4444',
    birthDate: '2005-06-20',
    age: 21,
    category: 'Adultos (16+)',
    beltId: 'branca',
    degrees: 2,
    classesInCurrentDegree: 24,
    monthsInBelt: 6,
    behavioral: {},
    guardianName: '',
    address: 'Porto Alegre, RS',
    dueDay: 5,
    fee: 200,
    paymentStatus: 'Pendente',
    lastPaymentMethod: '',
    status: 'Ativo',
    familyRole: 'individual',
    familyPlanId: '',
    familyTitularId: '',
    familyRequest: null,
    photo: ''
  }
];

const INITIAL_PROFESSORS = [
  { id: 'prof-luciano', name: 'Prof. Luciano Richert', login: 'LUCIANO01', password: '123456', beltId: 'preta', degrees: 1, classes: 'Adultos, Kids & Baby Kids', photo: '' },
  { id: 'prof-cris', name: 'Prof. Cris', login: 'CRIS02', password: '123456', beltId: 'marrom', degrees: 2, classes: 'Adultos & Kids Juvenil', photo: '' }
];

const INITIAL_PRE_REGS = [
  {
    token: 'KRYA-4829',
    name: 'Gabriel Martins',
    phone: '(51) 98888-7766',
    email: 'gabriel.martins@email.com',
    createdAt: 'Hoje',
    used: false
  }
];

const INITIAL_CONFIG = {
  masterPass: 'krya',
  adminPass: 'admin',
  profPass: 'prof',
  kidsFee: 185,
  adultFee: 200,
  dueToleranceDays: 3,
  pixKey: '5a8175ab-ae1e-4866-918e-6842e331bbc0',
  pixBeneficiary: 'CRISTIANE M G NASCIMENT',
  pixFullName: 'Cristiane Maizonetti Guimarães Nascimento',
  pixCity: 'PORTO ALEGRE',
  whatsappNumber: '51995667443'
};

function extractRecord(row) {
  if (!row) return null;
  return row.data && typeof row.data === 'object' ? row.data : row;
}

export default function App() {
  const initialUrlPreReg = useMemo(() => getInitialUrlPreReg(), []);

  const [cloudConnected, setCloudConnected] = useState(false);
  const [cloudStatusMsg, setCloudStatusMsg] = useState('Sincronizando com Supabase...');
  const [loadingCloud, setLoadingCloud] = useState(true);

  const [students, setStudents] = useState(() => {
    const saved = localStorage.getItem('krya_students_v1');
    return saved ? JSON.parse(saved) : INITIAL_STUDENTS;
  });
  const [professors, setProfessors] = useState(() => {
    const saved = localStorage.getItem('krya_profs_v1');
    return saved ? JSON.parse(saved) : INITIAL_PROFESSORS;
  });
  const [preRegs, setPreRegs] = useState(() => {
    const saved = localStorage.getItem('krya_preregs_v1');
    return dedupePreRegs(saved ? JSON.parse(saved) : INITIAL_PRE_REGS);
  });
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('krya_config_v1');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.pixKey || parsed.pixKey.includes('00.000.000')) {
        return {
          ...INITIAL_CONFIG,
          ...parsed,
          pixKey: INITIAL_CONFIG.pixKey,
          pixBeneficiary: INITIAL_CONFIG.pixBeneficiary,
          pixFullName: INITIAL_CONFIG.pixFullName,
          pixCity: INITIAL_CONFIG.pixCity,
          whatsappNumber: INITIAL_CONFIG.whatsappNumber
        };
      }
      return { ...INITIAL_CONFIG, ...parsed };
    }
    return INITIAL_CONFIG;
  });
  const [pendingCheckins, setPendingCheckins] = useState([]);

  // SE ABRIR PELO LINK (?token=...), JÁ ENTRA DIRETO NA FICHA DE CADASTRO
  const [role, setRole] = useState(() => {
    if (initialUrlPreReg) return 'complete_prereg';
    const saved = localStorage.getItem('krya_role_v1');
    return saved && saved !== 'complete_prereg' ? saved : null;
  });
  const [loggedStudentId, setLoggedStudentId] = useState(() => {
    return localStorage.getItem('krya_student_id_v1') || null;
  });
  const [loggedProfId, setLoggedProfId] = useState(() => {
    return localStorage.getItem('krya_prof_id_v1') || null;
  });

  const [loginInput, setLoginInput] = useState('');
  const [passInput, setPassInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('alunos');
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [search, setSearch] = useState('');

  // ESTADOS DE RECUPERAÇÃO DE SENHA
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [recoveredStudent, setRecoveredStudent] = useState(null);
  const [searchingRecovery, setSearchingRecovery] = useState(false);

  const [activePreRegToken, setActivePreRegToken] = useState(() => initialUrlPreReg?.token || null);
  const [urlPreRegFallback, setUrlPreRegFallback] = useState(() => initialUrlPreReg);
  const [showPreRegModal, setShowPreRegModal] = useState(false);
  const [newPreName, setNewPreName] = useState('');
  const [newPrePhone, setNewPrePhone] = useState('');
  const [newPreEmail, setNewPreEmail] = useState('');
  const [completedCredentials, setCompletedCredentials] = useState(null);
  const [copiedCreds, setCopiedCreds] = useState(false);
  const [submittingPreReg, setSubmittingPreReg] = useState(false);

  // CAMPOS DA FICHA CADASTRAL DO ALUNO
  const [compName, setCompName] = useState(() => initialUrlPreReg?.name || '');
  const [compPhone, setCompPhone] = useState(() => initialUrlPreReg?.phone || '');
  const [compEmail, setCompEmail] = useState(() => initialUrlPreReg?.email || '');
  const [compBirth, setCompBirth] = useState('2000-01-01');
  const [compGuardian, setCompGuardian] = useState('');
  const [compCep, setCompCep] = useState('');
  const [compAddress, setCompAddress] = useState('');
  const [compNumber, setCompNumber] = useState('');
  const [compDueDay, setCompDueDay] = useState(5);
  const [compPhoto, setCompPhoto] = useState('');
  const [compWantFamily, setCompWantFamily] = useState(false);
  const [compFamilyPlanId, setCompFamilyPlanId] = useState('1a_1k');
  const [compFamilyMembers, setCompFamilyMembers] = useState('');

  // MODAL DE SOLICITAÇÃO DE PLANO FAMILIAR (NO PAINEL DO ALUNO)
  const [showFamilyReqModal, setShowFamilyReqModal] = useState(false);
  const [reqFamilyPlanId, setReqFamilyPlanId] = useState('1a_1k');
  const [reqFamilyMembers, setReqFamilyMembers] = useState('');

  const [showPassModal, setShowPassModal] = useState(false);
  const [newStudentPass, setNewStudentPass] = useState('');

  const [showPixModal, setShowPixModal] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  const [manualPayStudent, setManualPayStudent] = useState(null);

  // ESTADOS DOS MODAIS DE EDIÇÃO E EXCLUSÃO
  const [editingStudent, setEditingStudent] = useState(null);
  const [editingProf, setEditingProf] = useState(null);
  const [editingPreReg, setEditingPreReg] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [newProfName, setNewProfName] = useState('');
  const [newProfBelt, setNewProfBelt] = useState('preta');
  const [newProfDegrees, setNewProfDegrees] = useState(0);
  const [newProfClasses] = useState('Adultos & Kids');
  const [lastCreatedProf, setLastCreatedProf] = useState(null);

  useEffect(() => {
    localStorage.setItem('krya_students_v1', JSON.stringify(students));
  }, [students]);
  useEffect(() => {
    localStorage.setItem('krya_profs_v1', JSON.stringify(professors));
  }, [professors]);
  useEffect(() => {
    localStorage.setItem('krya_preregs_v1', JSON.stringify(preRegs));
  }, [preRegs]);
  useEffect(() => {
    localStorage.setItem('krya_config_v1', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    if (role && role !== 'complete_prereg') {
      localStorage.setItem('krya_role_v1', role);
    } else if (!role) {
      localStorage.removeItem('krya_role_v1');
    }
  }, [role]);

  useEffect(() => {
    if (loggedStudentId) {
      localStorage.setItem('krya_student_id_v1', loggedStudentId);
    } else {
      localStorage.removeItem('krya_student_id_v1');
    }
  }, [loggedStudentId]);

  useEffect(() => {
    if (loggedProfId) {
      localStorage.setItem('krya_prof_id_v1', loggedProfId);
    } else {
      localStorage.removeItem('krya_prof_id_v1');
    }
  }, [loggedProfId]);

  useEffect(() => {
    if (role === 'complete_prereg' && activePreRegToken) {
      const pr = preRegs.find(p => p.token === activePreRegToken);
      if (pr) {
        setCompName(prev => prev || pr.name || '');
        setCompPhone(prev => prev || pr.phone || '');
        setCompEmail(prev => prev || pr.email || '');
      }
    }
  }, [role, activePreRegToken, preRegs]);

  // =========================================================================
  // CONTROLE DO BOTÃO VOLTAR DO CELULAR
  // =========================================================================
  useEffect(() => {
    const handlePopState = (event) => {
      const state = event.state;
      if (state && typeof state === 'object') {
        setSelectedFolder(state.kryaFolder || null);
        if (state.kryaTab) setActiveTab(state.kryaTab);
      } else {
        setSelectedFolder(null);
        setActiveTab('alunos');
      }
      setSearch('');
      setShowPreRegModal(false);
      setShowPassModal(false);
      setShowPixModal(false);
      setShowForgotModal(false);
      setShowFamilyReqModal(false);
      setManualPayStudent(null);
      setEditingStudent(null);
      setEditingProf(null);
      setEditingPreReg(null);
      setConfirmDelete(false);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleOpenFolder = (folderId) => {
    window.history.pushState({ kryaTab: activeTab, kryaFolder: folderId }, '');
    setSelectedFolder(folderId);
    setSearch('');
  };

  const handleBackToFolders = () => {
    if (window.history.state?.kryaFolder) {
      window.history.back();
    } else {
      setSelectedFolder(null);
      setSearch('');
    }
  };

  const handleSelectTab = (tabId) => {
    if (tabId !== activeTab || selectedFolder) {
      window.history.pushState({ kryaTab: tabId, kryaFolder: null }, '');
    }
    setActiveTab(tabId);
    setSelectedFolder(null);
    setSearch('');
  };

  const handleLogout = () => {
    setRole(null);
    setLoggedStudentId(null);
    setLoggedProfId(null);
    setSelectedFolder(null);
    setActivePreRegToken(null);
    setUrlPreRegFallback(null);
    localStorage.removeItem('krya_role_v1');
    localStorage.removeItem('krya_student_id_v1');
    localStorage.removeItem('krya_prof_id_v1');
    if (window.location.search.includes('token=')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  // =========================================================================
  // SINCRONIZAÇÃO EM TEMPO REAL COM SUPABASE
  // =========================================================================
  useEffect(() => {
    if (!supabase) {
      setLoadingCloud(false);
      return;
    }

    async function loadFromSupabase() {
      try {
        const [stRes, prRes, preRes] = await Promise.all([
          supabase.from('krya_students').select('*'),
          supabase.from('krya_professors').select('*'),
          supabase.from('Krya_preregs').select('*')
        ]);

        const firstError = stRes.error || prRes.error || preRes.error;
        if (!firstError) {
          setCloudConnected(true);
          setCloudStatusMsg('Conectado ao Supabase Nuvem');
          if (stRes.data?.length) setStudents(stRes.data.map(extractRecord));
          if (prRes.data?.length) setProfessors(prRes.data.map(extractRecord));
          if (preRes.data?.length) setPreRegs(dedupePreRegs(preRes.data.map(extractRecord)));
        } else {
          console.error('Erro Supabase SELECT:', firstError);
          setCloudStatusMsg(`Offline (${firstError.message || 'Erro de permissão/tabela'})`);
        }
      } catch (err) {
        console.error('Erro ao conectar Supabase:', err);
        setCloudStatusMsg('Offline (Falha de rede)');
      } finally {
        setLoadingCloud(false);
      }
    }

    loadFromSupabase();

    const channel = supabase
      .channel('krya-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'krya_students' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const oldId = payload.old?.id;
          if (oldId) setStudents(prev => prev.filter(x => x.id !== oldId));
          return;
        }
        const rec = extractRecord(payload.new);
        if (rec?.id) {
          setStudents(prev => {
            const exists = prev.some(x => x.id === rec.id);
            return exists ? prev.map(x => x.id === rec.id ? rec : x) : [...prev, rec];
          });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'krya_professors' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const oldId = payload.old?.id;
          if (oldId) setProfessors(prev => prev.filter(x => x.id !== oldId));
          return;
        }
        const rec = extractRecord(payload.new);
        if (rec?.id) {
          setProfessors(prev => {
            const exists = prev.some(x => x.id === rec.id);
            return exists ? prev.map(x => x.id === rec.id ? rec : x) : [...prev, rec];
          });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Krya_preregs' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const oldToken = payload.old?.token;
          if (oldToken) setPreRegs(prev => prev.filter(x => x.token !== oldToken));
          return;
        }
        const rec = extractRecord(payload.new);
        if (rec?.token) {
          const normalized = { ...rec, used: isPreRegUsed(rec.used) };
          setPreRegs(prev => {
            const exists = prev.some(x => x.token === normalized.token);
            const updated = exists ? prev.map(x => x.token === normalized.token ? normalized : x) : [normalized, ...prev];
            return dedupePreRegs(updated);
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // =========================================================================
  // VERIFICAÇÃO DO TOKEN NO SUPABASE EM SEGUNDO PLANO (SEM BLOQUEAR A FICHA)
  // =========================================================================
  useEffect(() => {
    if (!initialUrlPreReg || !supabase) return;

    supabase
      .from('Krya_preregs')
      .select('*')
      .eq('token', initialUrlPreReg.token)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data) {
          const rec = extractRecord(data);
          const normalized = { ...rec, used: isPreRegUsed(rec.used) };
          setCompName(prev => prev || normalized.name || '');
          setCompPhone(prev => prev || normalized.phone || '');
          setCompEmail(prev => prev || normalized.email || '');
          setPreRegs(prev => {
            const exists = prev.some(p => p.token === normalized.token);
            const updated = exists ? prev.map(p => p.token === normalized.token ? normalized : p) : [normalized, ...prev];
            return dedupePreRegs(updated);
          });
        }
      });
  }, [initialUrlPreReg]);

  const saveStudent = async (st) => {
    setStudents(prev => {
      const exists = prev.some(x => x.id === st.id);
      return exists ? prev.map(x => x.id === st.id ? st : x) : [...prev, st];
    });
    if (supabase) {
      const { error } = await supabase.from('krya_students').upsert({ id: st.id, data: st });
      if (error) {
        await supabase.from('krya_students').upsert(st);
      }
    }
  };

  const deleteStudent = async (studentId) => {
    setStudents(prev => prev.filter(x => x.id !== studentId));
    if (supabase) {
      await supabase.from('krya_students').delete().eq('id', studentId);
    }
  };

  const saveProfessor = async (prof) => {
    setProfessors(prev => {
      const exists = prev.some(x => x.id === prof.id);
      return exists ? prev.map(x => x.id === prof.id ? prof : x) : [...prev, prof];
    });
    if (supabase) {
      const { error } = await supabase.from('krya_professors').upsert({ id: prof.id, data: prof });
      if (error) {
        await supabase.from('krya_professors').upsert(prof);
      }
    }
  };

  const deleteProfessor = async (profId) => {
    setProfessors(prev => prev.filter(x => x.id !== profId));
    if (supabase) {
      await supabase.from('krya_professors').delete().eq('id', profId);
    }
  };

  const savePreReg = async (pr) => {
    const normalized = { ...pr, used: isPreRegUsed(pr.used) };
    setPreRegs(prev => {
      const exists = prev.some(x => x.token === normalized.token);
      const updated = exists ? prev.map(x => x.token === normalized.token ? normalized : x) : [normalized, ...prev];
      return dedupePreRegs(updated);
    });
    if (supabase) {
      const { error } = await supabase.from('Krya_preregs').upsert({
        token: normalized.token,
        name: normalized.name,
        phone: normalized.phone,
        email: normalized.email,
        used: normalized.used
      });
      if (error) {
        await supabase.from('Krya_preregs').upsert({ token: normalized.token, data: normalized });
      }
    }
  };

  const deletePreReg = async (token) => {
    setPreRegs(prev => prev.filter(x => x.token !== token));
    if (supabase) {
      await supabase.from('Krya_preregs').delete().eq('token', token);
    }
  };

  const activateStudentFromPreReg = async (pr) => {
    const firstName = (pr.name || 'ALUNO').split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '') || 'ALUNO';
    const code = pr.generatedCode || `${firstName}${String(Math.floor(10 + Math.random() * 89))}`;
    const generatedPass = String(Math.floor(100000 + Math.random() * 900000));

    const newStudent = {
      id: code + '_' + Date.now().toString().slice(-3),
      code,
      password: generatedPass,
      name: pr.name,
      email: pr.email || '',
      phone: pr.phone || '',
      birthDate: '2000-01-01',
      age: 26,
      category: 'Adultos (16+)',
      beltId: 'branca',
      degrees: 0,
      classesInCurrentDegree: 0,
      monthsInBelt: 0,
      behavioral: { rel: false, comp: false, notas: false, hab: false },
      guardianName: '',
      address: 'Porto Alegre, RS',
      dueDay: 5,
      fee: config.adultFee,
      paymentStatus: 'Pendente',
      lastPaymentMethod: '',
      status: 'Ativo',
      familyRole: 'individual',
      familyPlanId: '',
      familyTitularId: '',
      familyRequest: null,
      photo: ''
    };

    await saveStudent(newStudent);
    await savePreReg({ ...pr, used: true, generatedCode: code });
    setEditingPreReg(null);
    setConfirmDelete(false);
    setEditingStudent({ ...newStudent });
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    const user = loginInput.trim();
    const pass = passInput.trim();

    if (pass === config.masterPass || (user.toLowerCase() === 'master' && pass === config.masterPass)) {
      setRole('master'); setActiveTab('alunos'); setSelectedFolder(null); return;
    }
    if (pass === config.adminPass || (user.toLowerCase() === 'admin' && pass === config.adminPass)) {
      setRole('admin'); setActiveTab('alunos'); setSelectedFolder(null); return;
    }

    const foundProf = professors.find(
      p => p.login && p.login.toLowerCase() === user.toLowerCase() && p.password === pass
    );
    if (foundProf) {
      setLoggedProfId(foundProf.id);
      setRole('prof');
      return;
    }

    if (pass === config.profPass || (user.toLowerCase() === 'prof' && pass === config.profPass)) {
      setLoggedProfId(null);
      setRole('prof');
      return;
    }

    const found = students.find(
      s => s.code.toLowerCase() === user.toLowerCase() || (s.email && s.email.toLowerCase() === user.toLowerCase())
    );
    if (found && (pass === found.password || pass === found.code)) {
      setLoggedStudentId(found.id);
      setRole('student');
      return;
    }
    setLoginError('Login ou senha inválidos. Verifique seu código de aluno ou senha da equipe.');
  };

  const handleRecoverPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    setRecoveredStudent(null);
    const emailClean = forgotEmail.trim().toLowerCase();
    if (!emailClean) return;

    setSearchingRecovery(true);
    try {
      let found = students.find(s => s.email && s.email.trim().toLowerCase() === emailClean);

      if (!found && supabase) {
        const { data } = await supabase.from('krya_students').select('*');
        if (data?.length) {
          const allStudents = data.map(extractRecord).filter(Boolean);
          setStudents(allStudents);
          found = allStudents.find(s => s.email && s.email.trim().toLowerCase() === emailClean);
        }
      }

      if (found) {
        setRecoveredStudent(found);
      } else {
        setForgotError('Nenhuma conta encontrada com este e-mail. Confira o endereço ou fale com a recepção da Krya BJJ.');
      }
    } finally {
      setSearchingRecovery(false);
    }
  };

  const handleCreatePreReg = async (e) => {
    e.preventDefault();
    if (!newPreName.trim()) return;
    const token = 'KRYA-' + Math.floor(1000 + Math.random() * 9000);
    const pr = {
      token,
      name: newPreName.trim(),
      phone: newPrePhone.trim(),
      email: newPreEmail.trim(),
      createdAt: new Date().toLocaleDateString('pt-BR'),
      used: false
    };
    await savePreReg(pr);
    setNewPreName(''); setNewPrePhone(''); setNewPreEmail('');
    setShowPreRegModal(false);
    handleSelectTab('precadastro');
  };

  const handleCepLookup = async (cepVal) => {
    const clean = cepVal.replace(/\D/g, '');
    setCompCep(clean);
    if (clean.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setCompAddress(`${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`);
        }
      } catch {}
    }
  };

  const handleFinishPreReg = async (e) => {
    e.preventDefault();
    const pr =
      preRegs.find(p => p.token === activePreRegToken) ||
      urlPreRegFallback ||
      (activePreRegToken ? { token: activePreRegToken, name: compName, phone: compPhone, email: compEmail, used: false } : null);

    if (!pr || isPreRegUsed(pr.used) || submittingPreReg) return;

    setSubmittingPreReg(true);
    try {
      const finalName = compName.trim() || pr.name || 'Aluno Krya';
      const finalPhone = compPhone.trim() || pr.phone || '';
      const finalEmail = compEmail.trim() || pr.email || '';
      const age = calculateAge(compBirth);
      const category = getCategoryFromAge(age);
      const fee = age <= 16 ? config.kidsFee : config.adultFee;
      const firstName = finalName.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '') || 'ALUNO';
      const code = `${firstName}${String(age).padStart(2, '0')}`;
      const generatedPass = String(Math.floor(100000 + Math.random() * 900000));

      const newStudent = {
        id: code + '_' + Date.now().toString().slice(-3),
        code,
        password: generatedPass,
        name: finalName,
        email: finalEmail,
        phone: finalPhone,
        birthDate: compBirth,
        age,
        category,
        beltId: 'branca',
        degrees: 0,
        classesInCurrentDegree: 0,
        monthsInBelt: 0,
        behavioral: { rel: false, comp: false, notas: false, hab: false },
        guardianName: age <= 16 ? compGuardian : '',
        address: `${compAddress}${compNumber ? ', nº ' + compNumber : ''}`,
        dueDay: Number(compDueDay),
        fee,
        paymentStatus: 'Pendente',
        lastPaymentMethod: '',
        status: 'Ativo',
        familyRole: 'individual',
        familyPlanId: '',
        familyTitularId: '',
        familyRequest: compWantFamily
          ? { planId: compFamilyPlanId, membersText: compFamilyMembers.trim(), status: 'pending' }
          : null,
        photo: compPhoto
      };

      await saveStudent(newStudent);
      await savePreReg({
        ...pr,
        name: finalName,
        phone: finalPhone,
        email: finalEmail,
        used: true,
        generatedCode: code
      });
      setCompletedCredentials({
        name: newStudent.name,
        phone: newStudent.phone,
        code,
        password: generatedPass,
        studentId: newStudent.id
      });
    } finally {
      setSubmittingPreReg(false);
    }
  };

  const currentStudent = useMemo(
    () => students.find(s => s.id === loggedStudentId) || students[0],
    [students, loggedStudentId]
  );

  const currentProfessor = useMemo(
    () => professors.find(p => p.id === loggedProfId) || null,
    [professors, loggedProfId]
  );

  // SOMENTE PRÉ-CADASTROS PENDENTES (SAI AUTOMATICAMENTE QUANDO COMPLETA O CADASTRO)
  const pendingPreRegs = useMemo(
    () => dedupePreRegs(preRegs).filter(p => !isPreRegUsed(p.used)),
    [preRegs]
  );

  // =========================================================================
  // TELA DE FICHA CADASTRAL DO ALUNO (LINK DE PRÉ-CADASTRO)
  // =========================================================================
  if (role === 'complete_prereg') {
    const pr =
      preRegs.find(p => p.token === activePreRegToken) ||
      urlPreRegFallback ||
      (activePreRegToken ? { token: activePreRegToken, name: compName, phone: compPhone, email: compEmail, used: false } : null);

    const previewAge = calculateAge(compBirth);
    const previewCat = getCategoryFromAge(previewAge);
    const previewFee = previewAge <= 16 ? config.kidsFee : config.adultFee;

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 flex items-center justify-center">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-amber-400" />
              <span className="font-bold tracking-wide text-lg">KRYA BJJ — Ficha Cadastral</span>
            </div>
            <button
              onClick={() => { setCompletedCredentials(null); handleLogout(); }}
              className="text-xs text-slate-400 hover:text-white"
            >
              Voltar ao Login
            </button>
          </div>

          {!pr ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <h2 className="font-bold text-lg">Link inválido ou expirado</h2>
              <p className="text-sm text-slate-400 mt-1">Solicite um novo link de pré-cadastro na recepção da Krya BJJ.</p>
            </div>
          ) : completedCredentials ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-white">Cadastro Salvo com Sucesso!</h2>
              <p className="text-sm text-slate-300">
                Seja bem-vindo(a) à <strong>Krya BJJ</strong>, {completedCredentials.name}. Guarde seu login e senha abaixo:
              </p>
              <div className="bg-slate-950 border border-amber-500/40 rounded-xl p-4 space-y-2 text-left">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Login / Código:</span>
                  <span className="font-mono font-bold text-amber-400 text-base">{completedCredentials.code}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Senha de Acesso:</span>
                  <span className="font-mono font-bold text-emerald-400 text-base">{completedCredentials.password}</span>
                </div>
              </div>

              <div className="space-y-2">
                <a
                  href={buildCredentialsWhatsAppLink(
                    completedCredentials.phone,
                    completedCredentials.name,
                    completedCredentials.code,
                    completedCredentials.password
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition"
                >
                  Enviar / Salvar Acesso no WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(
                      `Krya BJJ - Login: ${completedCredentials.code} | Senha: ${completedCredentials.password}`
                    );
                    setCopiedCreds(true);
                    setTimeout(() => setCopiedCreds(false), 2500);
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2"
                >
                  {copiedCreds ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
                  {copiedCreds ? 'Login e Senha Copiados!' : 'Copiar Login e Senha'}
                </button>
                <button
                  onClick={() => {
                    setLoggedStudentId(completedCredentials.studentId);
                    setCompletedCredentials(null);
                    setRole('student');
                    window.history.replaceState({}, '', window.location.pathname);
                  }}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition"
                >
                  Entrar no Meu Painel Agora
                </button>
              </div>
            </div>
          ) : isPreRegUsed(pr.used) ? (
            <div className="text-center py-8 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h2 className="font-bold text-lg">Este link já foi utilizado</h2>
              <p className="text-sm text-slate-400">O cadastro de <strong>{pr.name}</strong> já está ativo.</p>
              <button
                onClick={handleLogout}
                className="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
              >
                Ir para a Tela de Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleFinishPreReg} className="space-y-3.5">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs">
                <div className="text-amber-400 font-semibold">Pré-cadastro ({pr.token})</div>
                <p className="text-slate-400 mt-0.5">Complete seus dados abaixo e salve para receber seu login e senha na hora.</p>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Nome Completo do Aluno</label>
                <input
                  type="text"
                  required
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">WhatsApp</label>
                  <input
                    type="text"
                    required
                    value={compPhone}
                    onChange={(e) => setCompPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">E-mail</label>
                  <input
                    type="email"
                    required
                    value={compEmail}
                    onChange={(e) => setCompEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Foto do Aluno (Opcional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    if (e.target.files?.[0]) setCompPhoto(await compressImage(e.target.files[0]));
                  }}
                  className="text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-800 file:text-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Data de Nascimento</label>
                <input
                  type="date"
                  required
                  value={compBirth}
                  onChange={(e) => setCompBirth(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm"
                />
                <div className="mt-1.5 flex justify-between text-xs bg-slate-800/70 px-3 py-1.5 rounded-lg">
                  <span className="text-amber-300 font-medium">{previewCat}</span>
                  <span className="text-emerald-400 font-bold">Individual: R$ {previewFee},00</span>
                </div>
              </div>

              {previewAge <= 16 && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nome Completo do Responsável (Pai/Mãe)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex.: Gabriela Campos"
                    value={compGuardian}
                    onChange={(e) => setCompGuardian(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm"
                  />
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">CEP</label>
                  <input
                    type="text"
                    maxLength={8}
                    placeholder="90000000"
                    value={compCep}
                    onChange={(e) => handleCepLookup(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">Número / Complemento</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex.: 120 - Apto 302"
                    value={compNumber}
                    onChange={(e) => setCompNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Endereço Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Rua, Bairro, Cidade/UF"
                  value={compAddress}
                  onChange={(e) => setCompAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Melhor Dia de Vencimento da Mensalidade</label>
                <div className="grid grid-cols-5 gap-2">
                  {[5, 10, 15, 20, 25].map(d => (
                    <button
                      type="button"
                      key={d}
                      onClick={() => setCompDueDay(d)}
                      className={`py-2 rounded-xl text-sm font-bold border ${
                        compDueDay === d
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-950 text-slate-300 border-slate-800'
                      }`}
                    >
                      Dia {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* OPÇÃO DE SOLICITAR PLANO FAMILIAR */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2.5">
                <label className="flex items-center gap-2 text-xs font-bold text-amber-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={compWantFamily}
                    onChange={(e) => setCompWantFamily(e.target.checked)}
                    className="rounded accent-amber-500"
                  />
                  Quero solicitar Plano Familiar (2 a 4 pessoas)
                </label>

                {compWantFamily && (
                  <div className="space-y-2 pt-1">
                    <select
                      value={compFamilyPlanId}
                      onChange={(e) => setCompFamilyPlanId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs"
                    >
                      {FAMILY_PLANS.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} — R$ {p.fee},00
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      required={compWantFamily}
                      placeholder="Nome dos familiares que treinam juntos"
                      value={compFamilyMembers}
                      onChange={(e) => setCompFamilyMembers(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs"
                    />
                    <p className="text-[11px] text-slate-400">
                      O pedido será analisado e aprovado pela administração da Krya BJJ antes de liberar o Pix.
                    </p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submittingPreReg}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm transition shadow-lg"
              >
                {submittingPreReg ? 'Salvando Ficha...' : 'Finalizar Cadastro e Gerar Login e Senha'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // TELA INICIAL DE LOGIN
  // =========================================================================
  if (!role) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto">
              <Shield className="w-9 h-9 text-amber-400" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">KRYA BJJ</h1>
            <p className="text-xs text-slate-400">Sistema Oficial de Gestão, Graduação & Portal do Aluno</p>
            <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full ${
              cloudConnected ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-300'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cloudConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {cloudStatusMsg}
            </span>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Código do Aluno, Professor, E-mail ou Perfil</label>
              <input
                type="text"
                placeholder="Ex.: HEITOR12, LUCIANO01 ou master"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Senha</label>
              <input
                type="password"
                placeholder="Digite sua senha"
                value={passInput}
                onChange={(e) => setPassInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:border-amber-500 outline-none"
              />
            </div>
            {loginError && <p className="text-xs text-red-400">{loginError}</p>}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition"
            >
              Entrar no Sistema
            </button>
            <button
              type="button"
              onClick={() => {
                setForgotEmail('');
                setForgotError('');
                setRecoveredStudent(null);
                setShowForgotModal(true);
              }}
              className="w-full py-2 text-xs text-amber-400 hover:text-amber-300 font-semibold transition"
            >
              Esqueci minha senha
            </button>
          </form>
        </div>

        {/* MODAL DE RECUPERAÇÃO DE SENHA */}
        {showForgotModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-sm w-full space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-amber-400 flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Recuperar Senha
                </h3>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!recoveredStudent ? (
                <form onSubmit={handleRecoverPassword} className="space-y-3">
                  <p className="text-xs text-slate-400">
                    Digite o e-mail cadastrado na sua ficha de aluno para recuperar seu login e senha.
                  </p>
                  <input
                    type="email"
                    required
                    placeholder="seuemail@exemplo.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:border-amber-500 outline-none"
                  />
                  {forgotError && <p className="text-xs text-red-400">{forgotError}</p>}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="flex-1 py-2.5 rounded-xl bg-slate-800 text-xs font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={searchingRecovery}
                      className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold"
                    >
                      {searchingRecovery ? 'Buscando...' : 'Recuperar Senha'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <p className="text-xs text-slate-300">
                    Cadastro localizado para <strong>{recoveredStudent.name}</strong>:
                  </p>
                  <div className="bg-slate-950 border border-amber-500/40 rounded-xl p-3.5 space-y-1.5 text-left text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Login / Código:</span>
                      <span className="font-mono font-bold text-amber-400 text-sm">{recoveredStudent.code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Senha:</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">{recoveredStudent.password}</span>
                    </div>
                  </div>

                  <a
                    href={buildRecoveryMailtoLink(
                      recoveredStudent.email,
                      recoveredStudent.name,
                      recoveredStudent.code,
                      recoveredStudent.password
                    )}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    <Mail className="w-4 h-4" /> Enviar para meu E-mail
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      setLoginInput(recoveredStudent.code);
                      setPassInput('');
                      setShowForgotModal(false);
                    }}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                  >
                    Preencher Login e Voltar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // PAINEL DOS PAIS / ALUNO ADULTO
  // =========================================================================
  if (role === 'student') {
    const st = currentStudent;
    if (!st) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 gap-4">
          <p className="text-sm text-slate-400">Cadastro de aluno não encontrado.</p>
          <button onClick={handleLogout} className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs">
            Voltar ao Login
          </button>
        </div>
      );
    }

    const fin = getEffectiveFinancialState(st, students, config.dueToleranceDays);
    const isAdult = st.category === 'Adultos (16+)';
    const targetClasses = isAdult
      ? getAdultClassesPerDegree(st.beltId)
      : getKidsClassesPerDegree(st.age, st.beltId);
    const remainingClasses = targetClasses > 0 ? Math.max(0, targetClasses - st.classesInCurrentDegree) : 0;
    const progressPct = targetClasses > 0 ? Math.min(100, Math.round((st.classesInCurrentDegree / targetClasses) * 100)) : 100;
    const beltName = isAdult
      ? (ADULT_BELTS.find(b => b.id === st.beltId)?.name || 'Branca')
      : (KIDS_BELTS.find(b => b.id === st.beltId)?.name || 'Branca');
    const alreadyCheckedIn = pendingCheckins.includes(st.id);

    const familyPlan = st.familyRole === 'titular' ? getFamilyPlanById(st.familyPlanId) : null;
    const isAwaitingApproval = fin.paymentStatus === 'Aguardando aprovação';

    const pixPayload = generatePixPayload({
      key: config.pixKey,
      name: config.pixBeneficiary,
      city: config.pixCity || 'PORTO ALEGRE',
      amount: st.fee,
      txid: st.code
    });

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm">KRYA BJJ</span>
            <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded font-mono text-amber-300">{st.code}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setNewStudentPass(''); setShowPassModal(true); }}
              className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" /> Senha
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-red-950 text-slate-300 px-2.5 py-1.5 rounded-lg"
            >
              <LogOut className="w-3.5 h-3.5" /> Sair
            </button>
          </div>
        </div>

        <div className="max-w-md mx-auto p-4 space-y-4">
          {fin.isBlocked && (
            <div className="bg-red-950/70 border border-red-600/60 rounded-2xl p-3.5 flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs text-red-200 leading-relaxed">
                <strong className="text-red-300 block">Acesso temporariamente suspenso</strong>
                {fin.isDependent
                  ? `A mensalidade do Plano Familiar (Titular: ${fin.titular.name}) está pendente. Assim que o pagamento for aprovado pela Krya BJJ, sua conta será liberada automaticamente.`
                  : 'Sua mensalidade está pendente após o vencimento. Realize o pagamento via Pix abaixo para liberar o check-in.'}
              </div>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-center shadow-xl">
            <div className="relative w-28 h-28 mx-auto mb-3">
              {st.photo ? (
                <img src={st.photo} alt={st.name} className="w-28 h-28 rounded-full object-cover border-4 border-amber-500/50 shadow-lg" />
              ) : (
                <div className="w-28 h-28 rounded-full bg-slate-800 border-2 border-dashed border-slate-600 flex flex-col items-center justify-center text-slate-400">
                  <Camera className="w-7 h-7 mb-1 text-amber-400" />
                  <span className="text-[10px]">Sem Foto</span>
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-amber-500 hover:bg-amber-400 text-slate-950 p-2 rounded-full cursor-pointer shadow-md">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    if (e.target.files?.[0]) {
                      const compressed = await compressImage(e.target.files[0]);
                      saveStudent({ ...st, photo: compressed });
                    }
                  }}
                />
              </label>
            </div>

            <h2 className="text-xl font-black text-white">{st.name}</h2>
            <p className="text-xs text-slate-400 mb-3">{st.age} anos • {st.category}</p>

            <BeltVisual category={st.category} beltId={st.beltId} degrees={st.degrees} behavioral={st.behavioral} />

            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-2.5">
                <div className="text-[10px] text-slate-400 uppercase">Faixa Atual</div>
                <div className="text-xs font-bold text-white mt-0.5">{beltName}</div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-2.5">
                <div className="text-[10px] text-slate-400 uppercase">Graus</div>
                <div className="text-sm font-black text-amber-400 mt-0.5">{st.degrees}º Grau</div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-2.5">
                <div className="text-[10px] text-slate-400 uppercase">Faltam</div>
                <div className="text-sm font-black text-emerald-400 mt-0.5">
                  {targetClasses > 0 ? `${remainingClasses} aulas` : 'IBJJF'}
                </div>
              </div>
            </div>

            {targetClasses > 0 && (
              <div className="mt-3 text-left">
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Progresso para o próximo grau</span>
                  <span className="text-white font-semibold">{st.classesInCurrentDegree} / {targetClasses} aulas</span>
                </div>
                <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
            )}

            {!isAdult && (
              <div className="mt-3 text-[11px] text-slate-400 bg-slate-950/70 rounded-xl py-1.5 px-3 flex justify-between">
                <span>Tempo na faixa (mín. 6 meses):</span>
                <span className={st.monthsInBelt >= 6 ? 'text-emerald-400 font-bold' : 'text-amber-300 font-semibold'}>
                  {st.monthsInBelt} / 6 meses
                </span>
              </div>
            )}
          </div>

          <button
            disabled={alreadyCheckedIn || fin.isBlocked}
            onClick={() => setPendingCheckins(prev => [...prev, st.id])}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition ${
              fin.isBlocked
                ? 'bg-red-950/60 text-red-300 border border-red-800/60 cursor-not-allowed'
                : alreadyCheckedIn
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            {fin.isBlocked
              ? 'Check-in Bloqueado (Pendência Financeira)'
              : alreadyCheckedIn
              ? 'Presença Enviada (Aguardando Professor)'
              : 'Registrar Presença no Treino de Hoje'}
          </button>

          {/* CARD DE MENSALIDADE, PLANO FAMILIAR E PAGAMENTO PIX */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs text-slate-400">
                  {fin.isDependent
                    ? `Plano Familiar • Dependente de ${fin.titular.name}`
                    : familyPlan
                    ? `Plano Familiar (Titular) • Venc. Dia ${st.dueDay}`
                    : `Mensalidade • Vencimento Dia ${st.dueDay}`}
                </div>
                <div className="text-lg font-black text-white">
                  {fin.isDependent ? 'R$ 0,00 (Incluso no Plano)' : `R$ ${st.fee},00`}
                </div>
                {familyPlan && (
                  <div className="text-[11px] text-amber-300 font-semibold">{familyPlan.name}</div>
                )}
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold text-center ${
                fin.paymentStatus === 'Em dia'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : isAwaitingApproval
                  ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
              }`}>
                {isAwaitingApproval ? 'Aguardando aprovação da Krya BJJ' : fin.paymentStatus}
              </span>
            </div>

            {!fin.isDependent && isAwaitingApproval && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-3 space-y-2.5">
                <p className="text-xs text-blue-200 leading-relaxed">
                  Seu pagamento está <strong>aguardando aprovação do administrador da Krya BJJ</strong>. Envie o comprovante no WhatsApp para agilizar a liberação:
                </p>
                <a
                  href={buildReceiptWhatsAppLink(config.whatsappNumber, st)}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  Enviar Comprovante no WhatsApp da Krya BJJ
                </a>
                <button
                  onClick={() => setShowPixModal(true)}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Ver Código Pix Novamente
                </button>
              </div>
            )}

            {!fin.isDependent && fin.paymentStatus === 'Pendente' && st.familyRequest?.status !== 'pending' && (
              <button
                onClick={() => {
                  setCopiedPix(false);
                  setShowPixModal(true);
                }}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg"
              >
                <QrCode className="w-4 h-4" /> Aperte aqui para fazer o pagamento
              </button>
            )}

            {!fin.isDependent && fin.paymentStatus === 'Pendente' && st.familyRequest?.status === 'pending' && (
              <div className="w-full py-3 px-4 rounded-xl bg-slate-800/80 border border-amber-500/30 text-amber-300 text-xs font-semibold text-center">
                Pagamento Pix temporariamente travado — aguardando aprovação do Plano Familiar pela Krya BJJ.
              </div>
            )}

            {/* SOLICITAÇÃO DE PLANO FAMILIAR PARA ALUNO INDIVIDUAL */}
            {(!st.familyRole || st.familyRole === 'individual') && (
              st.familyRequest?.status === 'pending' ? (
                <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 text-center">
                  Solicitação de <strong>{getFamilyPlanById(st.familyRequest.planId)?.name}</strong> em análise pela Krya BJJ.
                </div>
              ) : (
                <button
                  onClick={() => {
                    setReqFamilyPlanId('1a_1k');
                    setReqFamilyMembers('');
                    setShowFamilyReqModal(true);
                  }}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold transition"
                >
                  Solicitar Plano Familiar (2 a 4 pessoas)
                </button>
              )
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Professores Krya BJJ</h3>
            <div className="space-y-2.5">
              {professors.map(prof => {
                const pb = ADULT_BELTS.find(b => b.id === prof.beltId) || ADULT_BELTS[4];
                return (
                  <div key={prof.id} className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
                    {prof.photo ? (
                      <img src={prof.photo} alt={prof.name} className="w-12 h-12 rounded-full object-cover border border-amber-500/40" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center font-bold text-amber-400">
                        {prof.name.replace('Prof. ', '')[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-white truncate">{prof.name}</div>
                      <div className="text-[11px] text-slate-400 truncate">{prof.classes}</div>
                      <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-slate-800 text-amber-300">
                        Faixa {pb.name} • {prof.degrees}º Grau
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* MODAL DE SOLICITAÇÃO DE PLANO FAMILIAR */}
        {showFamilyReqModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await saveStudent({
                  ...st,
                  familyRequest: {
                    planId: reqFamilyPlanId,
                    membersText: reqFamilyMembers.trim(),
                    status: 'pending'
                  }
                });
                setShowFamilyReqModal(false);
              }}
              className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-sm w-full space-y-3"
            >
              <h3 className="font-bold text-base text-amber-400">Solicitar Plano Familiar</h3>
              <p className="text-xs text-slate-400">
                Escolha o combo e informe os nomes dos familiares. A administração da Krya BJJ fará a aprovação e o vínculo antes de liberar o Pix.
              </p>
              <select
                value={reqFamilyPlanId}
                onChange={(e) => setReqFamilyPlanId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm"
              >
                {FAMILY_PLANS.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — R$ {p.fee},00
                  </option>
                ))}
              </select>
              <input
                type="text"
                required
                placeholder="Nomes dos familiares (Ex.: Maria e Pedro)"
                value={reqFamilyMembers}
                onChange={(e) => setReqFamilyMembers(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm"
              />
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowFamilyReqModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold"
                >
                  Enviar Solicitação
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL DE PAGAMENTO PIX */}
        {showPixModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-sm w-full space-y-4 text-center">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-white">Pagamento Pix • Krya BJJ</h3>
                <button
                  onClick={() => setShowPixModal(false)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs space-y-1">
                <div className="text-slate-400">
                  Valor: <strong className="text-emerald-400 text-sm">R$ {st.fee},00</strong>
                </div>
                <div className="text-slate-400">
                  Favorecido: <strong className="text-slate-200">{config.pixFullName || config.pixBeneficiary}</strong>
                </div>
              </div>

              <div className="bg-white p-3 rounded-2xl w-44 h-44 mx-auto flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(pixPayload)}`}
                  alt="QR Code Pix"
                  className="w-full h-full"
                />
              </div>

              <button
                onClick={() => {
                  navigator.clipboard?.writeText(pixPayload);
                  setCopiedPix(true);
                  if (st.paymentStatus !== 'Em dia') {
                    saveStudent({ ...st, paymentStatus: 'Aguardando aprovação' });
                  }
                }}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center gap-2 transition"
              >
                {copiedPix ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedPix ? 'Código Pix Copiado! Pague no seu banco' : 'Copiar Pix Copia e Cola'}
              </button>

              <a
                href={buildReceiptWhatsAppLink(config.whatsappNumber, st)}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  if (st.paymentStatus !== 'Em dia') {
                    saveStudent({ ...st, paymentStatus: 'Aguardando aprovação' });
                  }
                  setShowPixModal(false);
                }}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center justify-center gap-2 transition"
              >
                Enviar Comprovante no WhatsApp da Krya BJJ
              </a>

              <p className="text-[11px] text-slate-400">
                Após pagar no seu banco, envie o comprovante no WhatsApp para o administrador aprovar seu pagamento.
              </p>
            </div>
          </div>
        )}

        {showPassModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-sm w-full space-y-3">
              <h3 className="font-bold text-base">Alterar Minha Senha</h3>
              <input
                type="text"
                placeholder="Digite a nova senha"
                value={newStudentPass}
                onChange={(e) => setNewStudentPass(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPassModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (newStudentPass.trim().length >= 4) {
                      saveStudent({ ...st, password: newStudentPass.trim() });
                      setShowPassModal(false);
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold"
                >
                  Salvar Senha
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // CELULAR DO PROFESSOR
  // =========================================================================
  if (role === 'prof') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm">
              {currentProfessor ? `Tatame • ${currentProfessor.name}` : 'Tatame • Professor'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-xs bg-slate-800 px-2.5 py-1.5 rounded-lg"
          >
            <LogOut className="w-3.5 h-3.5" /> Sair
          </button>
        </div>

        <div className="max-w-lg mx-auto p-4 space-y-4">
          {pendingCheckins.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-3.5 space-y-2">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> Check-ins Aguardando Confirmação ({pendingCheckins.length})
              </div>
              {pendingCheckins.map(stId => {
                const st = students.find(s => s.id === stId);
                if (!st) return null;
                return (
                  <div key={stId} className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl">
                    <span className="text-sm font-semibold">{st.name}</span>
                    <button
                      onClick={() => {
                        saveStudent({ ...st, classesInCurrentDegree: st.classesInCurrentDegree + 1 });
                        setPendingCheckins(prev => prev.filter(id => id !== stId));
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold"
                    >
                      Aprovar +1 Aula
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar aluno para chamada ou grau..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm"
            />
          </div>

          <div className="space-y-3">
            {students
              .filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
              .map(st => {
                const isAdult = st.category === 'Adultos (16+)';
                const target = isAdult ? getAdultClassesPerDegree(st.beltId) : getKidsClassesPerDegree(st.age, st.beltId);
                const readyForDegree = target > 0 && st.classesInCurrentDegree >= target;

                return (
                  <div key={st.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      {st.photo ? (
                        <img src={st.photo} alt={st.name} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center font-bold text-amber-400">
                          {st.name[0]}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="font-bold text-white flex items-center gap-2">
                          {st.name}
                          {readyForDegree && (
                            <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded-full">
                              PRONTO P/ GRAU
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">
                          {st.category} • {st.degrees}º Grau • {st.classesInCurrentDegree}/{target || 'IBJJF'} aulas
                        </div>
                      </div>
                      <button
                        onClick={() => saveStudent({ ...st, classesInCurrentDegree: st.classesInCurrentDegree + 1 })}
                        className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                      >
                        +1 Aula
                      </button>
                    </div>

                    <BeltVisual category={st.category} beltId={st.beltId} degrees={st.degrees} behavioral={st.behavioral} />

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => saveStudent({ ...st, degrees: st.degrees + 1, classesInCurrentDegree: 0 })}
                        className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-amber-300 font-semibold"
                      >
                        + Conceder Grau
                      </button>
                      {!isAdult && (
                        <div className="flex gap-1.5">
                          {[
                            { key: 'rel', color: 'bg-yellow-400', title: 'Relacionamento' },
                            { key: 'comp', color: 'bg-blue-500', title: 'Comportamento' },
                            { key: 'notas', color: 'bg-red-500', title: 'Notas/Org.' },
                            { key: 'hab', color: 'bg-emerald-500', title: 'Bons Hábitos' },
                          ].map(b => (
                            <button
                              key={b.key}
                              title={b.title}
                              onClick={() => saveStudent({
                                ...st,
                                behavioral: { ...st.behavioral, [b.key]: !st.behavioral?.[b.key] }
                              })}
                              className={`w-6 h-6 rounded-full border border-slate-600 ${
                                st.behavioral?.[b.key] ? b.color : 'bg-slate-950 opacity-40'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // PAINEL MASTER & ADMINISTRADOR
  // =========================================================================
  const isMaster = role === 'master';
  const totalRevenue = students
    .filter(s => s.familyRole !== 'dependente' && s.paymentStatus === 'Em dia')
    .reduce((acc, s) => acc + Number(s.fee || 0), 0);
  const pendingRevenue = students
    .filter(s => s.familyRole !== 'dependente' && s.paymentStatus !== 'Em dia')
    .reduce((acc, s) => acc + Number(s.fee || 0), 0);
  const awaitingApprovalCount = students.filter(
    s => s.familyRole !== 'dependente' && s.paymentStatus === 'Aguardando aprovação'
  ).length;
  const familyRequests = students.filter(s => s.familyRequest?.status === 'pending');

  const sortedFinancialStudents = [...students].sort((a, b) => {
    if (a.familyRole === 'dependente' && b.familyRole !== 'dependente') return 1;
    if (b.familyRole === 'dependente' && a.familyRole !== 'dependente') return -1;
    const order = { 'Aguardando aprovação': 0, 'Pendente': 1, 'Em dia': 2 };
    return (order[a.paymentStatus] ?? 1) - (order[b.paymentStatus] ?? 1);
  });

  const adultStudents = students.filter(s => s.category === 'Adultos (16+)');
  const kidsStudents = students.filter(s => s.category === 'Kids / Juvenil (7-16)');
  const babyKidsStudents = students.filter(s => s.category === 'Baby Kids (4-6)');

  const folderDefinitions = [
    {
      id: 'adultos',
      title: 'Alunos Adultos',
      subtitle: 'Categoria 16+ anos',
      count: adultStudents.length,
      accentClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      items: adultStudents
    },
    {
      id: 'kids',
      title: 'Kids / Juvenil',
      subtitle: 'Categoria 7 a 16 anos',
      count: kidsStudents.length,
      accentClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      items: kidsStudents
    },
    {
      id: 'baby_kids',
      title: 'Baby Kids',
      subtitle: 'Categoria 4 a 6 anos',
      count: babyKidsStudents.length,
      accentClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      items: babyKidsStudents
    },
    {
      id: 'professores',
      title: 'Professores',
      subtitle: 'Equipe técnica Krya BJJ',
      count: professors.length,
      accentClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
      items: professors
    }
  ];

  const currentFolderObj = folderDefinitions.find(f => f.id === selectedFolder);
  const financeBadgeCount = awaitingApprovalCount + familyRequests.length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-amber-400" />
          <div>
            <div className="font-black text-sm leading-tight">KRYA BJJ</div>
            <div className="text-[10px] text-amber-400 uppercase font-bold">
              {isMaster ? 'Controle Total • Dono Master' : 'Painel Administrativo'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreRegModal(true)}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3 py-2 rounded-xl"
          >
            <UserPlus className="w-4 h-4" /> Pré-Cadastro
          </button>
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { id: 'alunos', label: `Turmas & Equipe (${students.length + professors.length})`, icon: Users },
            { id: 'precadastro', label: `Alunos Pré-Cadastrados (${pendingPreRegs.length})`, icon: LinkIconFallback },
            { id: 'cadastrados', label: `Alunos Cadastrados (${students.length})`, icon: CheckCircle2 },
            {
              id: 'financeiro',
              label: financeBadgeCount > 0 ? `Financeiro (${financeBadgeCount} p/ aprovar)` : 'Financeiro & Baixas',
              icon: DollarSign
            },
            ...(isMaster ? [
              { id: 'config', label: 'Configurações & Senhas', icon: KeyRound }
            ] : [])
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleSelectTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'alunos' && (
          <div className="mt-4 space-y-4">
            {!selectedFolder ? (
              <>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Selecione uma pasta para visualizar
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {folderDefinitions.map(folder => (
                    <button
                      key={folder.id}
                      onClick={() => handleOpenFolder(folder.id)}
                      className="bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 flex items-center justify-between text-left transition group shadow-lg"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${folder.accentClass}`}>
                          <Folder className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="font-black text-base text-white group-hover:text-amber-400 transition">
                            {folder.title}
                          </div>
                          <div className="text-xs text-slate-400">{folder.subtitle}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-xs font-black text-amber-400">
                          {folder.count}
                        </span>
                        <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-amber-400 transition" />
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-3">
                  <button
                    onClick={handleBackToFolders}
                    className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800"
                  >
                    <ArrowLeft className="w-4 h-4" /> Voltar às Pastas
                  </button>
                  <div className="text-right">
                    <div className="font-black text-sm text-white">{currentFolderObj?.title}</div>
                    <div className="text-[11px] text-slate-400">{currentFolderObj?.count} cadastrados</div>
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder={
                      selectedFolder === 'professores'
                        ? 'Buscar professor por nome...'
                        : 'Buscar aluno por nome ou código...'
                    }
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm"
                  />
                </div>

                {selectedFolder === 'professores' ? (
                  <div className="space-y-4">
                    {lastCreatedProf && (
                      <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-2xl p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-400">
                            Professor cadastrado com acesso gerado!
                          </span>
                          <button
                            type="button"
                            onClick={() => setLastCreatedProf(null)}
                            className="text-slate-400 hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-xs text-slate-200 font-mono">
                          {lastCreatedProf.name} • Login: <strong className="text-amber-400">{lastCreatedProf.login}</strong> • Senha: <strong className="text-emerald-400">{lastCreatedProf.password}</strong>
                        </div>
                      </div>
                    )}

                    <div className="grid sm:grid-cols-2 gap-3">
                      {professors
                        .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
                        .map(prof => (
                          <div
                            key={prof.id}
                            onClick={() => {
                              if (isMaster) {
                                setEditingProf({ ...prof });
                                setConfirmDelete(false);
                              }
                            }}
                            className={`bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5 ${
                              isMaster ? 'cursor-pointer hover:border-amber-500/40 transition' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative" onClick={(e) => e.stopPropagation()}>
                                {prof.photo ? (
                                  <img src={prof.photo} alt={prof.name} className="w-14 h-14 rounded-full object-cover" />
                                ) : (
                                  <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center font-bold text-amber-400">
                                    {prof.name.replace('Prof. ', '')[0]}
                                  </div>
                                )}
                                {isMaster && (
                                  <label className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 p-1.5 rounded-full cursor-pointer">
                                    <Camera className="w-3 h-3" />
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={async (e) => {
                                        if (e.target.files?.[0]) {
                                          const compressed = await compressImage(e.target.files[0]);
                                          saveProfessor({ ...prof, photo: compressed });
                                        }
                                      }}
                                    />
                                  </label>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-sm truncate">{prof.name}</div>
                                <div className="text-xs text-slate-400 truncate">{prof.classes}</div>
                                <div className="text-[11px] text-amber-400 mt-0.5 uppercase">
                                  Faixa {prof.beltId} • {prof.degrees}º Grau
                                </div>
                                {isMaster && prof.login && (
                                  <div className="text-[11px] font-mono text-slate-300 mt-1">
                                    Login: <span className="text-amber-300">{prof.login}</span> • Senha: <span className="text-emerald-400">{prof.password}</span>
                                  </div>
                                )}
                              </div>
                              {isMaster && (
                                <button
                                  type="button"
                                  title="Editar ou excluir professor"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingProf({ ...prof });
                                    setConfirmDelete(false);
                                  }}
                                  className="p-2 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 transition shrink-0"
                                >
                                  <Settings className="w-4 h-4" />
                                </button>
                              )}
                            </div>

                            {isMaster && prof.login && (
                              <div
                                className="flex gap-2 pt-2 border-t border-slate-800"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <a
                                  href={buildCredentialsWhatsAppLink('', prof.name, prof.login, prof.password)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex-1 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center"
                                >
                                  Enviar WhatsApp
                                </a>
                                <button
                                  type="button"
                                  onClick={() => navigator.clipboard?.writeText(
                                    `Krya BJJ (Professor) - Login: ${prof.login} | Senha: ${prof.password}`
                                  )}
                                  className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1"
                                >
                                  <Copy className="w-3.5 h-3.5" /> Copiar Acesso
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>

                    {isMaster && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!newProfName.trim()) return;
                          const { login, password } = generateProfessorCredentials(newProfName.trim());
                          const created = {
                            id: 'prof-' + Date.now(),
                            name: newProfName.trim(),
                            login,
                            password,
                            beltId: newProfBelt,
                            degrees: Number(newProfDegrees),
                            classes: newProfClasses,
                            photo: ''
                          };
                          saveProfessor(created);
                          setLastCreatedProf(created);
                          setNewProfName('');
                        }}
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3"
                      >
                        <h3 className="font-bold text-sm">Cadastrar Novo Professor (Gera Login e Senha)</h3>
                        <input
                          type="text"
                          placeholder="Nome (Ex.: Prof. Matheus)"
                          value={newProfName}
                          onChange={(e) => setNewProfName(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={newProfBelt}
                            onChange={(e) => setNewProfBelt(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                          >
                            {ADULT_BELTS.map(b => <option key={b.id} value={b.id}>Faixa {b.name}</option>)}
                          </select>
                          <input
                            type="number"
                            min={0}
                            max={6}
                            placeholder="Graus"
                            value={newProfDegrees}
                            onChange={(e) => setNewProfDegrees(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                          />
                        </div>
                        <button type="submit" className="w-full py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs">
                          Adicionar Professor e Gerar Acesso
                        </button>
                      </form>
                    )}
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {(currentFolderObj?.items || [])
                      .filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase()))
                      .map(st => {
                        const isAdult = st.category === 'Adultos (16+)';
                        const target = isAdult ? getAdultClassesPerDegree(st.beltId) : getKidsClassesPerDegree(st.age, st.beltId);
                        const fin = getEffectiveFinancialState(st, students, config.dueToleranceDays);
                        return (
                          <div
                            key={st.id}
                            onClick={() => {
                              if (isMaster) {
                                setEditingStudent({ ...st });
                                setConfirmDelete(false);
                              }
                            }}
                            className={`bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5 ${
                              isMaster ? 'cursor-pointer hover:border-amber-500/40 transition' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {st.photo ? (
                                <img src={st.photo} alt={st.name} className="w-12 h-12 rounded-full object-cover" />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center font-bold text-amber-400">
                                  {st.name[0]}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-sm text-white truncate flex items-center gap-1.5">
                                  <span className="truncate">{st.name}</span>
                                  {fin.isBlocked && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 shrink-0">
                                      Inativo
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono">
                                  Login: {st.code} • Senha: {st.password}
                                </div>
                                <div className="text-[11px] text-amber-300">
                                  {st.familyRole === 'titular'
                                    ? 'Plano Familiar (Titular)'
                                    : st.familyRole === 'dependente'
                                    ? `Dependente de ${fin.titular.name}`
                                    : `${st.category} • Venc. dia ${st.dueDay}`}
                                </div>
                              </div>
                              {isMaster && (
                                <button
                                  type="button"
                                  title="Editar ou excluir aluno"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingStudent({ ...st });
                                    setConfirmDelete(false);
                                  }}
                                  className="p-2 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 transition shrink-0"
                                >
                                  <Settings className="w-4 h-4" />
                                </button>
                              )}
                            </div>

                            <BeltVisual category={st.category} beltId={st.beltId} degrees={st.degrees} behavioral={st.behavioral} />

                            <div
                              className="flex items-center justify-between text-xs pt-1 border-t border-slate-800 gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="text-slate-400">
                                {st.degrees}º Grau • {st.classesInCurrentDegree}/{target || 'IBJJF'} aulas
                              </span>
                              <div className="flex gap-1.5 flex-wrap justify-end">
                                <a
                                  href={buildCredentialsWhatsAppLink(st.phone, st.name, st.code, st.password)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 font-bold"
                                >
                                  WhatsApp
                                </a>
                                <button
                                  onClick={() => saveStudent({ ...st, classesInCurrentDegree: st.classesInCurrentDegree + 1 })}
                                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold"
                                >
                                  +Aula
                                </button>
                                <button
                                  onClick={() => { setLoggedStudentId(st.id); setRole('student'); }}
                                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                                >
                                  Ver App
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    {(currentFolderObj?.items || []).length === 0 && (
                      <div className="col-span-full text-center py-8 text-xs text-slate-400 bg-slate-900/50 border border-slate-800 rounded-2xl">
                        Nenhum cadastro encontrado nesta pasta ainda.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ABA: ALUNOS PRÉ-CADASTRADOS (SOMENTE PENDENTES) */}
        {activeTab === 'precadastro' && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm text-slate-300">Alunos Pré-Cadastrados (Aguardando Ficha)</h2>
              <button
                onClick={() => setShowPreRegModal(true)}
                className="text-xs bg-amber-500 text-slate-950 font-bold px-3 py-1.5 rounded-lg"
              >
                + Novo Pré-Cadastro
              </button>
            </div>

            {pendingPreRegs.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400 bg-slate-900/50 border border-slate-800 rounded-2xl">
                Nenhum aluno pré-cadastrado aguardando preenchimento no momento.
              </div>
            ) : (
              pendingPreRegs.map(pr => {
                const link = buildPreRegLink(pr);
                const waText = encodeURIComponent(`Olá ${pr.name}! Complete sua ficha de matrícula na Krya BJJ pelo link exclusivo: ${link}`);

                return (
                  <div
                    key={pr.token}
                    onClick={() => {
                      setConfirmDelete(false);
                      setEditingPreReg({ ...pr });
                    }}
                    className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 space-y-2.5 cursor-pointer transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white truncate">{pr.name}</div>
                        <div className="text-xs text-slate-400 truncate">{pr.phone} • {pr.email}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300">
                          Aguardando Aluno
                        </span>
                        <button
                          type="button"
                          title="Editar ou ativar pré-cadastro"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDelete(false);
                            setEditingPreReg({ ...pr });
                          }}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 transition"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setActivePreRegToken(pr.token);
                          setUrlPreRegFallback(pr);
                          setCompName(pr.name || '');
                          setCompPhone(pr.phone || '');
                          setCompEmail(pr.email || '');
                          setRole('complete_prereg');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
                      >
                        Abrir Ficha do Aluno
                      </button>
                      <button
                        onClick={() => navigator.clipboard?.writeText(link)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-1"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copiar Link
                      </button>
                      <a
                        href={`https://wa.me/55${(pr.phone || '').replace(/\D/g, '')}?text=${waText}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold"
                      >
                        Enviar WhatsApp
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ABA: ALUNOS CADASTRADOS (MATRÍCULA CONCLUÍDA) */}
        {activeTab === 'cadastrados' && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm text-slate-300">Alunos Cadastrados ({students.length})</h2>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Buscar aluno cadastrado por nome ou código..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm"
              />
            </div>

            {students
              .filter(s =>
                s.name.toLowerCase().includes(search.toLowerCase()) ||
                s.code.toLowerCase().includes(search.toLowerCase())
              )
              .map(st => {
                const fin = getEffectiveFinancialState(st, students, config.dueToleranceDays);
                return (
                  <div
                    key={st.id}
                    onClick={() => {
                      if (isMaster) {
                        setEditingStudent({ ...st });
                        setConfirmDelete(false);
                      }
                    }}
                    className={`bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5 ${
                      isMaster ? 'cursor-pointer hover:border-amber-500/40 transition' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white truncate flex items-center gap-2">
                          <span className="truncate">{st.name}</span>
                          {fin.isBlocked && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-bold shrink-0">
                              Inativo
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 truncate">
                          {st.phone} • {st.email}
                        </div>
                        <div className="text-[11px] font-mono text-amber-300 mt-1">
                          Login: {st.code} • Senha: {st.password}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400">
                          Ativo ({st.code})
                        </span>
                        {isMaster && (
                          <button
                            type="button"
                            title="Editar ou excluir aluno"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingStudent({ ...st });
                              setConfirmDelete(false);
                            }}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 transition"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                      {isMaster && (
                        <button
                          onClick={() => { setEditingStudent({ ...st }); setConfirmDelete(false); }}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
                        >
                          Abrir Ficha do Aluno
                        </button>
                      )}
                      <a
                        href={buildCredentialsWhatsAppLink(st.phone, st.name, st.code, st.password)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
                      >
                        Enviar Login e Senha no WhatsApp
                      </a>
                      <button
                        onClick={() => navigator.clipboard?.writeText(
                          `Krya BJJ - Login: ${st.code} | Senha: ${st.password}`
                        )}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-1"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copiar Acesso
                      </button>
                      <button
                        onClick={() => { setLoggedStudentId(st.id); setRole('student'); }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                      >
                        Ver App
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {activeTab === 'financeiro' && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className="text-xs text-slate-400">Recebido no Mês</div>
                <div className="text-xl font-black text-emerald-400 mt-1">R$ {totalRevenue},00</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className="text-xs text-slate-400">A Receber / Em Análise</div>
                <div className="text-xl font-black text-amber-400 mt-1">R$ {pendingRevenue},00</div>
              </div>
            </div>

            {/* SOLICITAÇÕES DE PLANO FAMILIAR PENDENTES */}
            {familyRequests.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-4 space-y-3">
                <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  Solicitações de Plano Familiar ({familyRequests.length})
                </div>
                {familyRequests.map(st => {
                  const reqPlan = getFamilyPlanById(st.familyRequest?.planId);
                  return (
                    <div key={st.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
                      <div>
                        <div className="font-bold text-sm text-white">{st.name}</div>
                        <div className="text-xs text-amber-300">
                          Combo: {reqPlan?.name} — R$ {reqPlan?.fee},00
                        </div>
                        {st.familyRequest?.membersText && (
                          <div className="text-xs text-slate-400">
                            Familiares informados: {st.familyRequest.membersText}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => saveStudent({
                            ...st,
                            familyRole: 'titular',
                            familyPlanId: reqPlan?.id || '1a_1k',
                            familyTitularId: '',
                            fee: reqPlan?.fee || st.fee,
                            familyRequest: null
                          })}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold"
                        >
                          Aprovar como Titular (R$ {reqPlan?.fee})
                        </button>
                        {isMaster && (
                          <button
                            onClick={() => {
                              setEditingStudent({ ...st, familyRole: 'dependente', fee: 0, familyRequest: null });
                              setConfirmDelete(false);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 text-amber-300 text-xs font-bold"
                          >
                            Vincular como Dependente
                          </button>
                        )}
                        <button
                          onClick={() => saveStudent({ ...st, familyRequest: null })}
                          className="px-3 py-1.5 rounded-lg bg-red-950/60 text-red-300 text-xs font-bold"
                        >
                          Recusar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-2.5">
              {sortedFinancialStudents.map(st => {
                const fin = getEffectiveFinancialState(st, students, config.dueToleranceDays);
                const isWaiting = !fin.isDependent && st.paymentStatus === 'Aguardando aprovação';
                const plan = st.familyRole === 'titular' ? getFamilyPlanById(st.familyPlanId) : null;

                return (
                  <div
                    key={st.id}
                    className={`rounded-2xl p-3.5 flex items-center justify-between gap-2 border ${
                      isWaiting
                        ? 'bg-blue-950/30 border-blue-500/40'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-2 flex-wrap">
                        {st.name}
                        {st.familyRole === 'titular' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                            Titular Família
                          </span>
                        )}
                        {fin.isDependent && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
                            Dependente de {fin.titular.name}
                          </span>
                        )}
                        {isWaiting && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                            Aguardando aprovação
                          </span>
                        )}
                        {fin.isBlocked && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-bold">
                            Inativo
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        {fin.isDependent
                          ? `R$ 0,00 • Espelha o status de ${fin.titular.name}`
                          : `R$ ${st.fee},00 ${plan ? `(${plan.name})` : ''} • Venc. dia ${st.dueDay} ${st.lastPaymentMethod ? `• Pago via ${st.lastPaymentMethod}` : ''}`}
                      </div>
                    </div>

                    {fin.isDependent ? (
                      <span className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 ${
                        fin.paymentStatus === 'Em dia'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-amber-500/15 text-amber-300'
                      }`}>
                        {fin.paymentStatus === 'Em dia' ? 'Liberado ✓' : fin.paymentStatus}
                      </span>
                    ) : st.paymentStatus === 'Em dia' ? (
                      <button
                        onClick={() => saveStudent({ ...st, paymentStatus: 'Pendente', lastPaymentMethod: '' })}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold shrink-0"
                      >
                        Em dia ✓
                      </button>
                    ) : isWaiting ? (
                      <button
                        onClick={() => saveStudent({ ...st, paymentStatus: 'Em dia', status: 'Ativo', lastPaymentMethod: 'Pix' })}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shrink-0"
                      >
                        Aprovar Pagamento
                      </button>
                    ) : (
                      <button
                        onClick={() => setManualPayStudent(st)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shrink-0"
                      >
                        Dar Baixa Manual
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'config' && isMaster && (
          <div className="mt-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="font-bold text-sm text-amber-400">Senhas de Acesso, Pix, WhatsApp & Tolerância</h3>
            <div className="grid sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Senha Master (Dono)</label>
                <input
                  type="text"
                  value={config.masterPass}
                  onChange={(e) => setConfig({ ...config, masterPass: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Senha Administrador</label>
                <input
                  type="text"
                  value={config.adminPass}
                  onChange={(e) => setConfig({ ...config, adminPass: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Senha Professor (Reserva)</label>
                <input
                  type="text"
                  value={config.profPass}
                  onChange={(e) => setConfig({ ...config, profPass: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-xs pt-2">
              <div>
                <label className="text-slate-400 block mb-1">Chave Pix da Academia</label>
                <input
                  type="text"
                  value={config.pixKey}
                  onChange={(e) => setConfig({ ...config, pixKey: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Beneficiário Pix</label>
                <input
                  type="text"
                  value={config.pixBeneficiary}
                  onChange={(e) => setConfig({ ...config, pixBeneficiary: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">WhatsApp da Krya BJJ</label>
                <input
                  type="text"
                  value={config.whatsappNumber || ''}
                  onChange={(e) => setConfig({ ...config, whatsappNumber: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Tolerância após vencimento (dias p/ inativar)</label>
                <input
                  type="number"
                  min={0}
                  max={15}
                  value={config.dueToleranceDays ?? 3}
                  onChange={(e) => setConfig({ ...config, dueToleranceDays: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE EDIÇÃO / ATIVAÇÃO / EXCLUSÃO DE PRÉ-CADASTRO */}
      {editingPreReg && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await savePreReg({
                token: editingPreReg.token,
                name: editingPreReg.name,
                phone: editingPreReg.phone,
                email: editingPreReg.email,
                createdAt: editingPreReg.createdAt,
                used: editingPreReg.used,
                generatedCode: editingPreReg.generatedCode
              });
              setEditingPreReg(null);
              setConfirmDelete(false);
            }}
            className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-sm w-full space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-amber-400 flex items-center gap-2">
                <Settings className="w-4 h-4" /> Ficha de Pré-Cadastro
              </h3>
              <button
                type="button"
                onClick={() => { setEditingPreReg(null); setConfirmDelete(false); }}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="text-[11px] text-slate-400 font-mono">
                Token: {editingPreReg.token} • Status: {isPreRegUsed(editingPreReg.used) ? 'Concluído' : 'Aguardando'}
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Nome do Aluno</label>
                <input
                  type="text"
                  required
                  value={editingPreReg.name || ''}
                  onChange={(e) => setEditingPreReg({ ...editingPreReg, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">WhatsApp</label>
                <input
                  type="text"
                  value={editingPreReg.phone || ''}
                  onChange={(e) => setEditingPreReg({ ...editingPreReg, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">E-mail</label>
                <input
                  type="email"
                  value={editingPreReg.email || ''}
                  onChange={(e) => setEditingPreReg({ ...editingPreReg, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => activateStudentFromPreReg(editingPreReg)}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
              >
                Gerar / Ativar Ficha do Aluno Agora
              </button>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
              >
                Salvar Dados do Pré-Cadastro
              </button>

              {isMaster && (!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="w-full py-2.5 rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-800/60 text-red-300 font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir Pré-Cadastro
                </button>
              ) : (
                <div className="bg-red-950/70 border border-red-700 rounded-xl p-3 space-y-2 text-center">
                  <p className="text-xs text-red-200 font-semibold">
                    Confirmar exclusão do pré-cadastro de <strong>{editingPreReg.name}</strong>?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 py-2 rounded-lg bg-slate-800 text-xs font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await deletePreReg(editingPreReg.token);
                        setEditingPreReg(null);
                        setConfirmDelete(false);
                      }}
                      className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                    >
                      Sim, Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </form>
        </div>
      )}

      {/* MODAL DE EDIÇÃO E EXCLUSÃO DE ALUNO (MASTER) */}
      {editingStudent && isMaster && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await saveStudent({
                ...editingStudent,
                age: calculateAge(editingStudent.birthDate),
                degrees: Number(editingStudent.degrees) || 0,
                classesInCurrentDegree: Number(editingStudent.classesInCurrentDegree) || 0,
                monthsInBelt: Number(editingStudent.monthsInBelt) || 0,
                fee: editingStudent.familyRole === 'dependente' ? 0 : (Number(editingStudent.fee) || 0),
                dueDay: Number(editingStudent.dueDay) || 5
              });
              setEditingStudent(null);
              setConfirmDelete(false);
            }}
            className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-md w-full space-y-3 my-auto max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-amber-400 flex items-center gap-2">
                <Settings className="w-4 h-4" /> Editar Aluno
              </h3>
              <button
                type="button"
                onClick={() => { setEditingStudent(null); setConfirmDelete(false); }}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Login / Código</label>
                  <input
                    type="text"
                    required
                    value={editingStudent.code}
                    onChange={(e) => setEditingStudent({ ...editingStudent, code: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Senha</label>
                  <input
                    type="text"
                    required
                    value={editingStudent.password}
                    onChange={(e) => setEditingStudent({ ...editingStudent, password: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono"
                  />
                </div>
              </div>

              {/* CONFIGURAÇÃO DE PLANO FAMILIAR */}
              <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-3 space-y-2">
                <div className="font-bold text-amber-400">Plano Familiar & Vínculo</div>
                <div>
                  <label className="text-slate-400 block mb-1">Tipo de Plano</label>
                  <select
                    value={editingStudent.familyRole || 'individual'}
                    onChange={(e) => {
                      const nextRole = e.target.value;
                      if (nextRole === 'dependente') {
                        setEditingStudent({
                          ...editingStudent,
                          familyRole: 'dependente',
                          familyPlanId: '',
                          fee: 0
                        });
                      } else if (nextRole === 'titular') {
                        const firstPlan = FAMILY_PLANS[0];
                        setEditingStudent({
                          ...editingStudent,
                          familyRole: 'titular',
                          familyPlanId: editingStudent.familyPlanId || firstPlan.id,
                          familyTitularId: '',
                          fee: getFamilyPlanById(editingStudent.familyPlanId)?.fee || firstPlan.fee
                        });
                      } else {
                        const baseFee = editingStudent.category === 'Adultos (16+)' ? config.adultFee : config.kidsFee;
                        setEditingStudent({
                          ...editingStudent,
                          familyRole: 'individual',
                          familyPlanId: '',
                          familyTitularId: '',
                          fee: baseFee
                        });
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="individual">Individual</option>
                    <option value="titular">Titular (Líder do Plano Familiar)</option>
                    <option value="dependente">Dependente (R$ 0,00 — Vinculado ao Titular)</option>
                  </select>
                </div>

                {editingStudent.familyRole === 'titular' && (
                  <div>
                    <label className="text-slate-400 block mb-1">Combo Familiar</label>
                    <select
                      value={editingStudent.familyPlanId || '1a_1k'}
                      onChange={(e) => {
                        const plan = getFamilyPlanById(e.target.value);
                        setEditingStudent({
                          ...editingStudent,
                          familyPlanId: e.target.value,
                          fee: plan ? plan.fee : editingStudent.fee
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm"
                    >
                      {FAMILY_PLANS.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} — R$ {p.fee},00
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {editingStudent.familyRole === 'dependente' && (
                  <div>
                    <label className="text-slate-400 block mb-1">Titular Responsável pelo Pagamento</label>
                    <select
                      required
                      value={editingStudent.familyTitularId || ''}
                      onChange={(e) => setEditingStudent({ ...editingStudent, familyTitularId: e.target.value, fee: 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm"
                    >
                      <option value="">Selecione o Titular...</option>
                      {students
                        .filter(s => s.id !== editingStudent.id && s.familyRole !== 'dependente')
                        .map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.code})
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">WhatsApp</label>
                  <input
                    type="text"
                    value={editingStudent.phone || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">E-mail</label>
                  <input
                    type="email"
                    value={editingStudent.email || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Data de Nascimento</label>
                  <input
                    type="date"
                    value={editingStudent.birthDate || ''}
                    onChange={(e) => {
                      const birthDate = e.target.value;
                      const age = calculateAge(birthDate);
                      const category = getCategoryFromAge(age);
                      const validBelts = category === 'Adultos (16+)' ? ADULT_BELTS : KIDS_BELTS;
                      const beltId = validBelts.some(b => b.id === editingStudent.beltId) ? editingStudent.beltId : 'branca';
                      setEditingStudent({ ...editingStudent, birthDate, age, category, beltId });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Categoria</label>
                  <select
                    value={editingStudent.category}
                    onChange={(e) => {
                      const category = e.target.value;
                      const validBelts = category === 'Adultos (16+)' ? ADULT_BELTS : KIDS_BELTS;
                      const beltId = validBelts.some(b => b.id === editingStudent.beltId) ? editingStudent.beltId : 'branca';
                      setEditingStudent({ ...editingStudent, category, beltId });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="Adultos (16+)">Adultos (16+)</option>
                    <option value="Kids / Juvenil (7-16)">Kids / Juvenil (7-16)</option>
                    <option value="Baby Kids (4-6)">Baby Kids (4-6)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Faixa</label>
                  <select
                    value={editingStudent.beltId}
                    onChange={(e) => setEditingStudent({ ...editingStudent, beltId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-sm"
                  >
                    {(editingStudent.category === 'Adultos (16+)' ? ADULT_BELTS : KIDS_BELTS).map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Graus</label>
                  <input
                    type="number"
                    min={0}
                    max={8}
                    value={editingStudent.degrees}
                    onChange={(e) => setEditingStudent({ ...editingStudent, degrees: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Aulas</label>
                  <input
                    type="number"
                    min={0}
                    value={editingStudent.classesInCurrentDegree}
                    onChange={(e) => setEditingStudent({ ...editingStudent, classesInCurrentDegree: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Mensalidade (R$)</label>
                  <input
                    type="number"
                    disabled={editingStudent.familyRole === 'dependente'}
                    value={editingStudent.familyRole === 'dependente' ? 0 : editingStudent.fee}
                    onChange={(e) => setEditingStudent({ ...editingStudent, fee: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Venc. (Dia)</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={editingStudent.dueDay}
                    onChange={(e) => setEditingStudent({ ...editingStudent, dueDay: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Pagamento</label>
                  <select
                    value={editingStudent.paymentStatus}
                    onChange={(e) => setEditingStudent({ ...editingStudent, paymentStatus: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-sm"
                  >
                    <option value="Em dia">Em dia</option>
                    <option value="Aguardando aprovação">Aguardando aprovação</option>
                    <option value="Pendente">Pendente</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Status da Conta</label>
                  <select
                    value={editingStudent.status || 'Ativo'}
                    onChange={(e) => setEditingStudent({ ...editingStudent, status: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-sm"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo (Bloqueado)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Responsável (se menor)</label>
                <input
                  type="text"
                  value={editingStudent.guardianName || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, guardianName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Endereço</label>
                <input
                  type="text"
                  value={editingStudent.address || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
              >
                Salvar Alterações
              </button>

              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="w-full py-2.5 rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-800/60 text-red-300 font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir Aluno
                </button>
              ) : (
                <div className="bg-red-950/70 border border-red-700 rounded-xl p-3 space-y-2 text-center">
                  <p className="text-xs text-red-200 font-semibold">
                    Tem certeza que deseja excluir <strong>{editingStudent.name}</strong>?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 py-2 rounded-lg bg-slate-800 text-xs font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteStudent(editingStudent.id);
                        setEditingStudent(null);
                        setConfirmDelete(false);
                      }}
                      className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                    >
                      Sim, Excluir
                    </button>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
      )}

      {/* MODAL DE EDIÇÃO E EXCLUSÃO DE PROFESSOR (MASTER) */}
      {editingProf && isMaster && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await saveProfessor({
                ...editingProf,
                login: (editingProf.login || '').trim().toUpperCase(),
                password: (editingProf.password || '').trim(),
                degrees: Number(editingProf.degrees) || 0
              });
              setEditingProf(null);
              setConfirmDelete(false);
            }}
            className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-sm w-full space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-amber-400 flex items-center gap-2">
                <Settings className="w-4 h-4" /> Editar Professor
              </h3>
              <button
                type="button"
                onClick={() => { setEditingProf(null); setConfirmDelete(false); }}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Nome do Professor</label>
                <input
                  type="text"
                  required
                  value={editingProf.name}
                  onChange={(e) => setEditingProf({ ...editingProf, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-400">Acesso ao Painel</span>
                  <button
                    type="button"
                    onClick={() => {
                      const creds = generateProfessorCredentials(editingProf.name);
                      setEditingProf({ ...editingProf, login: creds.login, password: creds.password });
                    }}
                    className="text-[11px] px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold hover:bg-amber-500/30"
                  >
                    Gerar Aleatório
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Login</label>
                    <input
                      type="text"
                      value={editingProf.login || ''}
                      onChange={(e) => setEditingProf({ ...editingProf, login: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Senha</label>
                    <input
                      type="text"
                      value={editingProf.password || ''}
                      onChange={(e) => setEditingProf({ ...editingProf, password: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Turmas</label>
                <input
                  type="text"
                  value={editingProf.classes || ''}
                  onChange={(e) => setEditingProf({ ...editingProf, classes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Faixa</label>
                  <select
                    value={editingProf.beltId}
                    onChange={(e) => setEditingProf({ ...editingProf, beltId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                  >
                    {ADULT_BELTS.map(b => <option key={b.id} value={b.id}>Faixa {b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Graus</label>
                  <input
                    type="number"
                    min={0}
                    max={6}
                    value={editingProf.degrees}
                    onChange={(e) => setEditingProf({ ...editingProf, degrees: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
              >
                Salvar Alterações
              </button>

              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="w-full py-2.5 rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-800/60 text-red-300 font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir Professor
                </button>
              ) : (
                <div className="bg-red-950/70 border border-red-700 rounded-xl p-3 space-y-2 text-center">
                  <p className="text-xs text-red-200 font-semibold">
                    Confirmar exclusão de <strong>{editingProf.name}</strong>?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 py-2 rounded-lg bg-slate-800 text-xs font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteProfessor(editingProf.id);
                        setEditingProf(null);
                        setConfirmDelete(false);
                      }}
                      className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                    >
                      Sim, Excluir
                    </button>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
      )}

      {showPreRegModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreatePreReg} className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-sm w-full space-y-3">
            <h3 className="font-bold text-base text-white">Novo Pré-Cadastro (Gerar Link)</h3>
            <p className="text-xs text-slate-400">O aluno receberá o link para preencher a ficha cadastral e ganhará login e senha automáticos.</p>
            <input
              type="text"
              required
              placeholder="Nome completo do aluno"
              value={newPreName}
              onChange={(e) => setNewPreName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm"
            />
            <input
              type="text"
              required
              placeholder="Telefone / WhatsApp"
              value={newPrePhone}
              onChange={(e) => setNewPrePhone(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm"
            />
            <input
              type="email"
              required
              placeholder="E-mail"
              value={newPreEmail}
              onChange={(e) => setNewPreEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm"
            />
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowPreRegModal(false)} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-xs font-bold">
                Cancelar
              </button>
              <button type="submit" className="flex-1 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold">
                Gerar Link
              </button>
            </div>
          </form>
        </div>
      )}

      {manualPayStudent && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-sm w-full space-y-3">
            <h3 className="font-bold text-base">Confirmar Recebimento</h3>
            <p className="text-xs text-slate-400">
              Aluno: <strong>{manualPayStudent.name}</strong> • Valor: <strong>R$ {manualPayStudent.fee},00</strong>
            </p>
            <div className="space-y-2">
              {['Cartão de Crédito (Maquininha)', 'Cartão de Débito (Maquininha)', 'Pix (Conferido no Inter)', 'Dinheiro'].map(method => (
                <button
                  key={method}
                  onClick={() => {
                    saveStudent({ ...manualPayStudent, paymentStatus: 'Em dia', status: 'Ativo', lastPaymentMethod: method });
                    setManualPayStudent(null);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-emerald-500/20 border border-slate-800 hover:border-emerald-500/50 text-left text-xs font-bold flex items-center justify-between"
                >
                  <span>{method}</span>
                  <ChevronRight className="w-4 h-4 text-emerald-400" />
                </button>
              ))}
            </div>
            <button onClick={() => setManualPayStudent(null)} className="w-full py-2 text-xs text-slate-400">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LinkIconFallback(props) {
  return <UserPlus {...props} />;
}
