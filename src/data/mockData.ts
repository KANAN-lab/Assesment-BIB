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
    title: 'So Klin Liquid Deterjen Perfume Collection 1.6L',
    category: 'Produk Wings (Fabric Care)',
    pointsRequired: 400,
    iconName: 'ShoppingBag',
    description: 'Deterjen cair konsentrat pembersih noda pakaian dengan aroma wangi tahan lama.',
    availableStock: 30,
    badgeTag: 'Popular'
  },
  {
    id: 'r-2',
    title: 'Ekonomi Pencuci Piring Power Liquid Jeruk Nipis 750mL',
    category: 'Produk Wings (Home Care)',
    pointsRequired: 250,
    iconName: 'ShoppingBag',
    description: 'Sabun cuci piring konsentrat ekstrak jeruk nipis ampuh hilangkan lemak dan bau amis.',
    availableStock: 45,
    badgeTag: 'Best Value'
  },
  {
    id: 'r-3',
    title: 'Super Sol Karbol Wangi Pine Desinfektan 800mL',
    category: 'Produk Wings (Home Care)',
    pointsRequired: 280,
    iconName: 'ShieldCheck',
    description: 'Cairan karbol pembersih lantai dengan aroma pinus segar dan formula antibakteri membunuh kuman.',
    availableStock: 35
  },
  {
    id: 'r-4',
    title: 'WPC Pembersih Kloset & Porselen Extra Kuat 780mL',
    category: 'Produk Wings (Home Care)',
    pointsRequired: 300,
    iconName: 'ShieldCheck',
    description: 'Pembersih porselen dan kloset efektif mengangkat kerak membandel seketika untuk sanitasi higienis.',
    availableStock: 25
  },
  {
    id: 'r-5',
    title: 'Nuvo Family Sabun Mandi Cair Antibakterial 450mL',
    category: 'Produk Wings (Personal Care)',
    pointsRequired: 320,
    iconName: 'Heart',
    description: 'Sabun mandi cair keluarga dengan perlindungan antibakteri TCC melawan kuman aktif.',
    availableStock: 40,
    badgeTag: 'Essential'
  },
  {
    id: 'r-6',
    title: 'Giv White Beauty Body Wash Sakura & Pearl 450mL',
    category: 'Produk Wings (Personal Care)',
    pointsRequired: 320,
    iconName: 'Award',
    description: 'Sabun mandi wangi mewah dengan ekstrak bunga sakura dan mutiara untuk kulit halus terawat.',
    availableStock: 35
  },
  {
    id: 'r-7',
    title: 'Zinc Shampoo Anti-Dandruff Refreshing Cool 340mL',
    category: 'Produk Wings (Personal Care)',
    pointsRequired: 380,
    iconName: 'Zap',
    description: 'Shampo anti ketombe dengan sensasi dingin menthol menyegarkan kulit kepala sepanjang hari.',
    availableStock: 30
  },
  {
    id: 'r-8',
    title: 'Ciptadent Maxi Complete Pasta Gigi & Sikat Gigi Pack',
    category: 'Produk Wings (Personal Care)',
    pointsRequired: 260,
    iconName: 'ShieldCheck',
    description: 'Paket perlindungan gigi menyeluruh Micro Active Foam dan sikat gigi berbulu lembut.',
    availableStock: 50
  },
  {
    id: 'r-9',
    title: 'Kodomo Baby Wipes & Hair & Body Wash Gift Set',
    category: 'Produk Wings (Baby Care)',
    pointsRequired: 450,
    iconName: 'Heart',
    description: 'Paket sabun mandi bayi 2-in-1 aroma buah segar dan tisu basah lembut non-alkohol higienis.',
    availableStock: 20,
    badgeTag: 'Family Choice'
  },
  {
    id: 'r-10',
    title: 'Mie Sedaap All-Variant Special Box (Isi 10 Pcs)',
    category: 'Produk Wings (Food)',
    pointsRequired: 350,
    iconName: 'ShoppingBag',
    description: 'Paket aneka varian Mie Sedaap kuah dan goreng favorit dengan kriuk bawang gurih renyah.',
    availableStock: 40,
    badgeTag: 'Favorite'
  },
  {
    id: 'r-11',
    title: 'Paket Floridina Orange & Teh Javana (Karton Mini 12 Pcs)',
    category: 'Produk Wings (Beverage)',
    pointsRequired: 480,
    iconName: 'ShoppingBag',
    description: 'Minuman jus jeruk bulir asli dan teh melati asli siap minum untuk kesegaran harian.',
    availableStock: 25
  },
  {
    id: 'r-12',
    title: 'Voucher Indomaret Rp 100.000',
    category: 'Voucher Belanja',
    pointsRequired: 1000,
    iconName: 'CreditCard',
    description: 'Voucher belanja resmi Indomaret untuk kebutuhan belanja harian di seluruh gerai.',
    availableStock: 20,
    badgeTag: 'Super Reward'
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
