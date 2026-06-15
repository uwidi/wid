import { CryptoConfig, Product } from '../types';

export const CRYPTO_CONFIGS: Record<string, CryptoConfig> = {
  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin',
    rateIdr: 1100000000, // Rp 1.100.000.000
    network: 'Bitcoin Mainnet',
    color: '#F7931A',
    logo: '₿',
    iconBg: 'bg-amber-500/10 text-amber-500 border-amber-500/20'
  },
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    rateIdr: 55000000, // Rp 55.000.000
    network: 'Ethereum Mainnet (ERC-20)',
    color: '#627EEA',
    logo: 'Ξ',
    iconBg: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
  },
  SOL: {
    symbol: 'SOL',
    name: 'Solana',
    rateIdr: 2450000, // Rp 2.450.000
    network: 'Solana Mainnet (SPL)',
    color: '#14F195',
    logo: '◎',
    iconBg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    rateIdr: 16350,   // Rp 16.350
    network: 'TRON Network (TRC-20)',
    color: '#26A17B',
    logo: '₮',
    iconBg: 'bg-teal-500/10 text-teal-500 border-teal-500/20'
  }
};

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'ApexPro Ultra Laptop',
    priceIdr: 24999000, // Rp 24.999.000
    category: 'Elektronik',
    description: 'Laptop performa tinggi dengan chip M3 Ultra, RAM 32GB, dan layar OLED ProMotion 120Hz. Cocok untuk programming, rendering 3D, dan pengerjaan AI.',
    image: '💻',
    stock: 8
  },
  {
    id: 'prod-2',
    name: 'Quantum Sound Max Studio',
    priceIdr: 5499000, // Rp 5.499.000
    category: 'Audio',
    description: 'Headphone wireless dengan Active Noise Cancellation (ANC) tingkat tinggi, audio spasial 3D, dan daya tahan baterai hingga 45 jam tanpa henti.',
    image: '🎧',
    stock: 15
  },
  {
    id: 'prod-3',
    name: 'MechKey Nebula V3 Red',
    priceIdr: 2199000, // Rp 2.199.000
    category: 'Aksesoris',
    description: 'Keyboard mekanis modular berukuran 75% dengan pre-lubed linear switches, keycaps PBT doubleshot, dan kustomisasi pencahayaan RGB.',
    image: '⌨️',
    stock: 22
  },
  {
    id: 'prod-4',
    name: 'SaaS Builder Premium License',
    priceIdr: 12999000, // Rp 12.999.000
    category: 'Software',
    description: 'Lisensi seumur hidup (lifetime) untuk template fullstack boilerplate web modern. Dilengkapi integrasi database, modul pembayaran, dan dashboard admin.',
    image: '⚡',
    stock: 999
  },
  {
    id: 'prod-5',
    name: 'Cyberpunk Sentinel NFT Art',
    priceIdr: 8250000, // Rp 8.250.000
    category: 'Digital Art',
    description: 'Koleksi seni digital eksklusif edisi terbatas bertemakan kota neon futuristik. Disertai hak kepemilikan komersial penuh.',
    image: '🖼️',
    stock: 1
  },
  {
    id: 'prod-6',
    name: 'Minimalist Commuter Backpack v2',
    priceIdr: 1599000, // Rp 1.599.000
    category: 'Lifestyle',
    description: 'Tas ransel tahan air dengan kompartemen laptop 16 inci khusus berlapis busa pengaman, saku rahasia RFID, dan pengisi daya USB eksternal.',
    image: '🎒',
    stock: 30
  }
];

export const MOCK_WALLET_ADDRESSES: Record<string, string> = {
  BTC: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
  ETH: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
  SOL: 'HN7cABviJHU7Ls3Gf6GgT6J68DdBC5TdBfSmzV5f8JnG',
  USDT: 'TYHCv4mX5D6B6Gf4uJ9Lq7Fp6R1D7S8T9U'
};
