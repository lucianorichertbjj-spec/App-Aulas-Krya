import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Shield, Users, Award, DollarSign, CheckCircle2, Clock, Search,
  LogOut, UserPlus, Camera, KeyRound, Copy, Check,
  QrCode, ChevronRight, AlertCircle, Folder, ArrowLeft
} from 'lucide-react';

// =========================================================================
// CONEXÃO DIRETA COM O SUPABASE
// =========================================================================
const SUPABASE_URL = 'https://rihcrmjdryqjyuxqdapk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ZD9Lf2vJhoTUKXs1jl971A_viY2Ql9A';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

// =========================================================================
// COMPONENTE VISUAL DA FAIXA CORRIGIDO (CORES NITIDAS + CONTRASTE)
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
    photo: ''
  }
];

const INITIAL_PROFESSORS = [
  { id: 'prof-luciano', name: 'Prof. Luciano Richert', beltId: 'preta', degrees: 1, classes: 'Adultos, Kids & Baby Kids', photo: '' },
  { id: 'prof-cris', name: 'Prof. Cris', beltId: 'marrom', degrees: 2, classes: 'Adultos & Kids Juvenil', photo: '' }
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
  pixKey: 'CNPJ 00.000.000/0001-00 (Krya BJJ)',
  pixBeneficiary: 'KRYA BJJ ACADEMIA LTDA'
};

// Helper para extrair objeto independente de a tabela usar coluna `data` (JSONB) ou colunas planas
function extractRecord(row) {
  if (!row) return null;
  return row.data && typeof row.data === 'object' ? row.data : row;
}

export default function App() {
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
    return saved ? JSON.parse(saved) : INITIAL_PRE_REGS;
  });
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('krya_config_v1');
    return saved ? JSON.parse(saved) : INITIAL_CONFIG;
  });
  const [pendingCheckins, setPendingCheckins] = useState([]);

  const [role, setRole] = useState(null);
  const [loggedStudentId, setLoggedStudentId] = useState(null);
  const [loginInput, setLoginInput] = useState('');
  const [passInput, setPassInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('alunos');
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [search, setSearch] = useState('');

  const [activePreRegToken, setActivePreRegToken] = useState(null);
  const [showPreRegModal, setShowPreRegModal] = useState(false);
  const [newPreName, setNewPreName] = useState('');
  const [newPrePhone, setNewPrePhone] = useState('');
  const [newPreEmail, setNewPreEmail] = useState('');
  const [completedCredentials, setCompletedCredentials] = useState(null);

  const [compBirth, setCompBirth] = useState('2015-05-10');
  const [compGuardian, setCompGuardian] = useState('');
  const [compCep, setCompCep] = useState('');
  const [compAddress, setCompAddress] = useState('');
  const [compNumber, setCompNumber] = useState('');
  const [compDueDay, setCompDueDay] = useState(5);
  const [compPhoto, setCompPhoto] = useState('');

  const [showPassModal, setShowPassModal] = useState(false);
  const [newStudentPass, setNewStudentPass] = useState('');

  const [showPixModal, setShowPixModal] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  const [manualPayStudent, setManualPayStudent] = useState(null);

  const [newProfName, setNewProfName] = useState('');
  const [newProfBelt, setNewProfBelt] = useState('preta');
  const [newProfDegrees, setNewProfDegrees] = useState(0);
  const [newProfClasses] = useState('Adultos & Kids');

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
          supabase.from('krya_preregs').select('*')
        ]);

        const firstError = stRes.error || prRes.error || preRes.error;
        if (!firstError) {
          setCloudConnected(true);
          setCloudStatusMsg('Conectado ao Supabase Nuvem');
          if (stRes.data?.length) setStudents(stRes.data.map(extractRecord));
          if (prRes.data?.length) setProfessors(prRes.data.map(extractRecord));
          if (preRes.data?.length) setPreRegs(preRes.data.map(extractRecord));
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
        const rec = extractRecord(payload.new);
        if (rec?.id) {
          setStudents(prev => {
            const exists = prev.some(x => x.id === rec.id);
            return exists ? prev.map(x => x.id === rec.id ? rec : x) : [...prev, rec];
          });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'krya_professors' }, (payload) => {
        const rec = extractRecord(payload.new);
        if (rec?.id) {
          setProfessors(prev => {
            const exists = prev.some(x => x.id === rec.id);
            return exists ? prev.map(x => x.id === rec.id ? rec : x) : [...prev, rec];
          });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'krya_preregs' }, (payload) => {
        const rec = extractRecord(payload.new);
        if (rec?.token) {
          setPreRegs(prev => {
            const exists = prev.some(x => x.token === rec.token);
            return exists ? prev.map(x => x.token === rec.token ? rec : x) : [rec, ...prev];
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // =========================================================================
  // LEITURA DIRETA DO TOKEN DA URL (GARANTE CARREGAMENTO NO CELULAR DO ALUNO)
  // =========================================================================
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      const cleanToken = token.trim().toUpperCase();
      setActivePreRegToken(cleanToken);
      setRole('complete_prereg');

      if (supabase) {
        setLoadingCloud(true);
        supabase
          .from('krya_preregs')
          .select('*')
          .eq('token', cleanToken)
          .maybeSingle()
          .then(({ data, error }) => {
            if (!error && data) {
              const rec = extractRecord(data);
              setPreRegs(prev => {
                const exists = prev.some(p => p.token === rec.token);
                return exists ? prev.map(p => p.token === rec.token ? rec : p) : [rec, ...prev];
              });
            }
            setLoadingCloud(false);
          });
      }
    }
  }, []);

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

  const savePreReg = async (pr) => {
    setPreRegs(prev => {
      const exists = prev.some(x => x.token === pr.token);
      return exists ? prev.map(x => x.token === pr.token ? pr : x) : [pr, ...prev];
    });
    if (supabase) {
      const { error } = await supabase.from('krya_preregs').upsert({
        token: pr.token,
        name: pr.name,
        phone: pr.phone,
        email: pr.email,
        used: pr.used
      });
      if (error) {
        const { error: jsonError } = await supabase.from('krya_preregs').upsert({ token: pr.token, data: pr });
        if (jsonError) {
          alert('Erro ao salvar pré-cadastro na nuvem: ' + jsonError.message);
        }
      }
    }
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
    if (pass === config.profPass || (user.toLowerCase() === 'prof' && pass === config.profPass)) {
      setRole('prof'); return;
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
    setActiveTab('precadastro');
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
    const pr = preRegs.find(p => p.token === activePreRegToken);
    if (!pr || pr.used) return;

    const age = calculateAge(compBirth);
    const category = getCategoryFromAge(age);
    const fee = age <= 16 ? config.kidsFee : config.adultFee;
    const firstName = pr.name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '');
    const code = `${firstName}${String(age).padStart(2, '0')}`;
    const generatedPass = String(Math.floor(100000 + Math.random() * 900000));

    const newStudent = {
      id: code + '_' + Date.now().toString().slice(-3),
      code,
      password: generatedPass,
      name: pr.name,
      email: pr.email,
      phone: pr.phone,
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
      photo: compPhoto
    };

    await saveStudent(newStudent);
    await savePreReg({ ...pr, used: true, generatedCode: code });
    setCompletedCredentials({ name: newStudent.name, code, password: generatedPass, studentId: newStudent.id });
  };

  const currentStudent = useMemo(
    () => students.find(s => s.id === loggedStudentId) || students[0],
    [students, loggedStudentId]
  );

  // =========================================================================
  // TELA DE COMPLETAR PRÉ-CADASTRO
  // =========================================================================
  if (role === 'complete_prereg') {
    const pr = preRegs.find(p => p.token === activePreRegToken);
    const previewAge = calculateAge(compBirth);
    const previewCat = getCategoryFromAge(previewAge);
    const previewFee = previewAge <= 16 ? config.kidsFee : config.adultFee;

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 flex items-center justify-center">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-amber-400" />
              <span className="font-bold tracking-wide text-lg">KRYA BJJ — Matrícula</span>
            </div>
            <button
              onClick={() => { setRole(null); setCompletedCredentials(null); }}
              className="text-xs text-slate-400 hover:text-white"
            >
              Voltar ao Login
            </button>
          </div>

          {loadingCloud ? (
            <div className="text-center py-8 text-sm text-slate-400">
              Carregando ficha de pré-cadastro...
            </div>
          ) : !pr ? (
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
              <h2 className="text-xl font-bold text-white">Cadastro Concluído!</h2>
              <p className="text-sm text-slate-300">
                Seja bem-vindo(a) à <strong>Krya BJJ</strong>, {completedCredentials.name}. Suas credenciais exclusivas foram geradas:
              </p>
              <div className="bg-slate-950 border border-amber-500/40 rounded-xl p-4 space-y-2 text-left">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Login / Código:</span>
                  <span className="font-mono font-bold text-amber-400 text-base">{completedCredentials.code}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Senha Inicial:</span>
                  <span className="font-mono font-bold text-emerald-400 text-base">{completedCredentials.password}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setLoggedStudentId(completedCredentials.studentId);
                  setCompletedCredentials(null);
                  setRole('student');
                }}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition"
              >
                Entrar no Meu Painel Agora
              </button>
            </div>
          ) : pr.used ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h2 className="font-bold text-lg">Este link já foi utilizado</h2>
              <p className="text-sm text-slate-400 mt-1">O cadastro de <strong>{pr.name}</strong> já está ativo.</p>
            </div>
          ) : (
            <form onSubmit={handleFinishPreReg} className="space-y-4">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
                <div className="text-amber-400 font-semibold">Pré-cadastro confirmado ({pr.token})</div>
                <div><strong>Aluno:</strong> {pr.name}</div>
                <div><strong>Contato:</strong> {pr.phone} • {pr.email}</div>
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
                  <span className="text-emerald-400 font-bold">Mensalidade: R$ {previewFee},00</span>
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

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition shadow-lg"
              >
                Finalizar Cadastro e Gerar Meu Login
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
              <label className="block text-xs text-slate-400 mb-1">Código do Aluno, E-mail ou Perfil</label>
              <input
                type="text"
                placeholder="Ex.: HEITOR12 ou master"
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
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // PAINEL DOS PAIS / ALUNO ADULTO
  // =========================================================================
  if (role === 'student') {
    const st = currentStudent;
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

    const pixPayload = `00020126580014BR.GOV.BCB.PIX0136${config.pixKey}5204000053039865406${st.fee.toFixed(2)}5802BR5915KRYA BJJ PORTO6012PORTO ALEGRE62120508${st.code}6304ABCD`;

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
              onClick={() => setRole(null)}
              className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-red-950 text-slate-300 px-2.5 py-1.5 rounded-lg"
            >
              <LogOut className="w-3.5 h-3.5" /> Sair
            </button>
          </div>
        </div>

        <div className="max-w-md mx-auto p-4 space-y-4">
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
            disabled={alreadyCheckedIn}
            onClick={() => setPendingCheckins(prev => [...prev, st.id])}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition ${
              alreadyCheckedIn
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            {alreadyCheckedIn ? 'Presença Enviada (Aguardando Professor)' : 'Registrar Presença no Treino de Hoje'}
          </button>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">Mensalidade • Vencimento Dia {st.dueDay}</div>
                <div className="text-lg font-black text-white">R$ {st.fee},00</div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                st.paymentStatus === 'Em dia'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
              }`}>
                {st.paymentStatus}
              </span>
            </div>

            {st.paymentStatus !== 'Em dia' && (
              <button
                onClick={() => setShowPixModal(true)}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2"
              >
                <QrCode className="w-4 h-4" /> Pagar Mensalidade via Pix
              </button>
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

        {showPixModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-sm w-full space-y-4 text-center">
              <h3 className="font-bold text-lg text-white">Pix Mensalidade Krya BJJ</h3>
              <p className="text-xs text-slate-400">Valor: <strong className="text-emerald-400">R$ {st.fee},00</strong> • Beneficiário: {config.pixBeneficiary}</p>
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
                  setTimeout(() => setCopiedPix(false), 2500);
                }}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold flex items-center justify-center gap-2"
              >
                {copiedPix ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
                {copiedPix ? 'Código Pix Copiado!' : 'Copiar Pix Copia e Cola'}
              </button>
              <button
                onClick={() => setShowPixModal(false)}
                className="w-full py-2 text-xs text-slate-400 hover:text-white"
              >
                Fechar
              </button>
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
            <span className="font-bold text-sm">Tatame • Professor</span>
          </div>
          <button
            onClick={() => setRole(null)}
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
  // PAINEL MASTER & ADMINISTRADOR (COM PASTAS POR CATEGORIA E PROFESSORES)
  // =========================================================================
  const isMaster = role === 'master';
  const totalRevenue = students.filter(s => s.paymentStatus === 'Em dia').reduce((acc, s) => acc + s.fee, 0);
  const pendingRevenue = students.filter(s => s.paymentStatus !== 'Em dia').reduce((acc, s) => acc + s.fee, 0);

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
            onClick={() => { setRole(null); setSelectedFolder(null); }}
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
            { id: 'precadastro', label: `Pré-Cadastros (${preRegs.filter(p => !p.used).length})`, icon: LinkIconFallback },
            { id: 'financeiro', label: 'Financeiro & Baixas', icon: DollarSign },
            ...(isMaster ? [
              { id: 'config', label: 'Configurações & Senhas', icon: KeyRound }
            ] : [])
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedFolder(null); setSearch(''); }}
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
                      onClick={() => { setSelectedFolder(folder.id); setSearch(''); }}
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
                    onClick={() => { setSelectedFolder(null); setSearch(''); }}
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
                    <div className="grid sm:grid-cols-2 gap-3">
                      {professors
                        .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
                        .map(prof => (
                          <div key={prof.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                            <div className="relative">
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
                            <div className="flex-1">
                              <div className="font-bold text-sm">{prof.name}</div>
                              <div className="text-xs text-slate-400">{prof.classes}</div>
                              <div className="text-[11px] text-amber-400 mt-0.5 uppercase">
                                Faixa {prof.beltId} • {prof.degrees}º Grau
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>

                    {isMaster && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!newProfName.trim()) return;
                          saveProfessor({
                            id: 'prof-' + Date.now(),
                            name: newProfName.trim(),
                            beltId: newProfBelt,
                            degrees: Number(newProfDegrees),
                            classes: newProfClasses,
                            photo: ''
                          });
                          setNewProfName('');
                        }}
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3"
                      >
                        <h3 className="font-bold text-sm">Cadastrar Novo Professor</h3>
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
                          Adicionar Professor
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
                        return (
                          <div key={st.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                            <div className="flex items-center gap-3">
                              {st.photo ? (
                                <img src={st.photo} alt={st.name} className="w-12 h-12 rounded-full object-cover" />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center font-bold text-amber-400">
                                  {st.name[0]}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-sm text-white truncate">{st.name}</div>
                                <div className="text-[11px] text-slate-400 font-mono">
                                  Login: {st.code} • Senha: {st.password}
                                </div>
                                <div className="text-[11px] text-amber-300">{st.category} • Venc. dia {st.dueDay}</div>
                              </div>
                            </div>

                            <BeltVisual category={st.category} beltId={st.beltId} degrees={st.degrees} behavioral={st.behavioral} />

                            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                              <span className="text-slate-400">
                                {st.degrees}º Grau • {st.classesInCurrentDegree}/{target || 'IBJJF'} aulas
                              </span>
                              <div className="flex gap-1.5">
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

        {activeTab === 'precadastro' && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm text-slate-300">Convites de Pré-Cadastro Enviados</h2>
              <button
                onClick={() => setShowPreRegModal(true)}
                className="text-xs bg-amber-500 text-slate-950 font-bold px-3 py-1.5 rounded-lg"
              >
                + Novo Pré-Cadastro
              </button>
            </div>
            {preRegs.map(pr => {
              const link = `${window.location.origin}/?token=${pr.token}`;
              const waText = encodeURIComponent(`Olá ${pr.name}! Complete sua ficha de matrícula na Krya BJJ pelo link exclusivo: ${link}`);
              return (
                <div key={pr.token} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">{pr.name}</div>
                      <div className="text-xs text-slate-400">{pr.phone} • {pr.email}</div>
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                      pr.used ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-300'
                    }`}>
                      {pr.used ? `Ativo (${pr.generatedCode})` : 'Aguardando Aluno'}
                    </span>
                  </div>
                  {!pr.used && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => { setActivePreRegToken(pr.token); setRole('complete_prereg'); }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
                      >
                        Abrir Ficha do Aluno (Testar)
                      </button>
                      <button
                        onClick={() => navigator.clipboard?.writeText(link)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-1"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copiar Link
                      </button>
                      <a
                        href={`https://wa.me/55${pr.phone.replace(/\D/g, '')}?text=${waText}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold"
                      >
                        Enviar WhatsApp
                      </a>
                    </div>
                  )}
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
                <div className="text-xs text-slate-400">A Receber (Pendente)</div>
                <div className="text-xl font-black text-amber-400 mt-1">R$ {pendingRevenue},00</div>
              </div>
            </div>

            <div className="space-y-2.5">
              {students.map(st => (
                <div key={st.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-sm text-white">{st.name}</div>
                    <div className="text-xs text-slate-400">
                      R$ {st.fee},00 • Venc. dia {st.dueDay} {st.lastPaymentMethod ? `• Pago via ${st.lastPaymentMethod}` : ''}
                    </div>
                  </div>
                  {st.paymentStatus === 'Em dia' ? (
                    <button
                      onClick={() => saveStudent({ ...st, paymentStatus: 'Pendente', lastPaymentMethod: '' })}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold"
                    >
                      Em dia ✓
                    </button>
                  ) : (
                    <button
                      onClick={() => setManualPayStudent(st)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold"
                    >
                      Dar Baixa Manual
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'config' && isMaster && (
          <div className="mt-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="font-bold text-sm text-amber-400">Senhas de Acesso & Mensalidades</h3>
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
                <label className="text-slate-400 block mb-1">Senha Professor</label>
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
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
            </div>
          </div>
        )}
      </div>

      {showPreRegModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreatePreReg} className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-sm w-full space-y-3">
            <h3 className="font-bold text-base text-white">Novo Pré-Cadastro (Gerar Link)</h3>
            <p className="text-xs text-slate-400">O aluno receberá o link para preencher endereço e dia de vencimento e ganhará login e senha automáticos.</p>
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
                    saveStudent({ ...manualPayStudent, paymentStatus: 'Em dia', lastPaymentMethod: method });
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
