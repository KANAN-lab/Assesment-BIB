import { WorkerProfile, QuizQuestion, RewardItem, LeaderboardEntry } from '../types/assessment';

export const INITIAL_CURRENT_WORKER: WorkerProfile = {
  id: 'w-101',
  name: 'Budi Santoso',
  employeeId: 'LOG-8842',
  role: 'Kurir Last-Mile',
  division: 'Hub Jakarta Selatan',
  avatar: 'https://ui-avatars.com/api/?name=Budi+Santoso&background=0D9488&color=ffffff&bold=true',
  streakDays: 12,
  totalPoints: 1450,
  tier: 'Pro Specialist',
  bibScores: {
    behavior: 92,   // APD, Safety Check, Quiz
    integrity: 95,  // Accurate POD, On-time checkin
    benchmark: 88,  // SLA Delivery 98.4%
    totalScore: 91.5
  },
  dailyQuizCompleted: false,
  preShiftChecklistDone: false
};

export const DAILY_QUIZZES: QuizQuestion[] = [
  {
    id: 'q-1',
    question: 'Sebelum mengendarai armada blind van di musim hujan, aspek safety mana yang WAJIB diperiksa pertama kali saat Pre-Shift Check?',
    options: [
      'Memastikan kaca film paling gelap agar barang aman',
      'Memeriksa kedalaman alur ban (tread depth) dan daya cengkeram rem',
      'Mengisi bensin hingga meluap agar tidak perlu berhenti',
      'Membuka semua jendela untuk sirkulasi udara'
    ],
    correctAnswerIndex: 1,
    explanation: 'Alur ban dan kondisi rem adalah kunci keselamatan utama untuk mencegah aquaplaning saat hujan deras.',
    pointsReward: 50,
    category: 'Defensive Driving'
  },
  {
    id: 'q-2',
    question: 'Ketika menangani paket bertanda "FRAGILE / PECAH BELAH", tindakan mana yang paling sesuai dengan SOP Zero Damage Handling?',
    options: [
      'Menumpuknya di paling bawah rantai beban paket',
      'Melemparkannya dari jarak 1 meter ke keranjang sortir',
      'Menempatkan di kompartemen atas dengan perlindungan bubble wrap & posisi stabil',
      'Menumpuk paket berat di atasnya agar tidak bergeser'
    ],
    correctAnswerIndex: 2,
    explanation: 'Barang pecah belah harus ditempatkan di posisi paling atas atau kompartemen khusus tanpa tekanan paket berat.',
    pointsReward: 50,
    category: 'SOP Logistics'
  }
];

export const REWARD_CATALOG: RewardItem[] = [
  {
    id: 'r-1',
    title: 'Saldo GoPay Rp 50.000',
    category: 'E-Wallet',
    pointsRequired: 500,
    iconName: 'Wallet',
    description: 'Voucher saldo digital GoPay instant ke nomor HP terdaftar.',
    availableStock: 25,
    badgeTag: 'Popular'
  },
  {
    id: 'r-2',
    title: 'Saldo OVO / ShopeePay Rp 100.000',
    category: 'E-Wallet',
    pointsRequired: 950,
    iconName: 'CreditCard',
    description: 'Top-up saldo E-wallet pilihan untuk kebutuhan harian.',
    availableStock: 14,
    badgeTag: 'Best Value'
  },
  {
    id: 'r-3',
    title: 'Paket Data Telkomsel 15GB',
    category: 'Pulsa & Data',
    pointsRequired: 400,
    iconName: 'Wifi',
    description: 'Kuota internet cepat untuk kelancaran update aplikasi driver/kurir.',
    availableStock: 40
  },
  {
    id: 'r-4',
    title: 'Rompi Safety Premium High-Vis',
    category: 'Safety Gear',
    pointsRequired: 1200,
    iconName: 'ShieldCheck',
    description: 'Rompi reflektif 3M kualitas tinggi dengan saku zipper & breathable mesh.',
    availableStock: 8,
    badgeTag: 'Exclusive'
  },
  {
    id: 'r-5',
    title: 'Voucher Belanja Minimarket Rp 75.000',
    category: 'Voucher & Perk',
    pointsRequired: 700,
    iconName: 'ShoppingBag',
    description: 'Voucher fisik/digital Indomaret / Alfamart seluruh Indonesia.',
    availableStock: 19
  },
  {
    id: 'r-6',
    title: 'Prioritas Alokasi Rute Favorit (1 Minggu)',
    category: 'Voucher & Perk',
    pointsRequired: 1500,
    iconName: 'Award',
    description: 'Hak istimewa memilih zona rute pengiriman sesuai preferensi kurir.',
    availableStock: 5,
    badgeTag: 'VIP Perk'
  }
];

export const INITIAL_LEADERBOARD: LeaderboardEntry[] = [
  {
    rank: 1,
    workerId: 'w-88',
    name: 'Rian Hidayat',
    role: 'Kurir Last-Mile',
    division: 'Hub Jakarta Selatan',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
    totalScore: 96.8,
    streakDays: 24,
    tier: 'Legendary Champion',
    totalPoints: 2890
  },
  {
    rank: 2,
    workerId: 'w-101',
    name: 'Budi Santoso (Anda)',
    role: 'Kurir Last-Mile',
    division: 'Hub Jakarta Selatan',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
    totalScore: 91.5,
    streakDays: 12,
    tier: 'Pro Specialist',
    totalPoints: 1450
  },
  {
    rank: 3,
    workerId: 'w-42',
    name: 'Dewi Lestari',
    role: 'Warehouse Picker',
    division: 'Hub Cikarang Central',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
    totalScore: 89.2,
    streakDays: 18,
    tier: 'Pro Specialist',
    totalPoints: 1820
  },
  {
    rank: 4,
    workerId: 'w-19',
    name: 'Ahmad Fauzi',
    role: 'Driver Intercity',
    division: 'Fleet Java-Sumatra',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
    totalScore: 87.6,
    streakDays: 9,
    tier: 'Elite Logistician',
    totalPoints: 1310
  },
  {
    rank: 5,
    workerId: 'w-73',
    name: 'Siti Nurhaliza',
    role: 'Warehouse Picker',
    division: 'Hub Jakarta Barat',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150',
    totalScore: 84.0,
    streakDays: 5,
    tier: 'Novice Operational',
    totalPoints: 940
  }
];
