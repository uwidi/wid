export type CryptoType = 'BTC' | 'ETH' | 'SOL' | 'USDT';

export interface CryptoConfig {
  symbol: CryptoType;
  name: string;
  rateIdr: number; // Conversion rate: 1 Crypto = X IDR
  network: string;
  color: string;
  logo: string;
  iconBg: string;
}

export interface Product {
  id: string;
  name: string;
  priceIdr: number;
  category: string;
  description: string;
  image: string;
  stock: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Wallet {
  name: string;
  address: string;
  balances: Record<CryptoType, number>;
  connected: boolean;
}

export type InvoiceStatus = 'PENDING' | 'DETECTED' | 'CONFIRMING' | 'SUCCESS' | 'EXPIRED';

export interface Invoice {
  id: string;
  items: { productName: string; quantity: number; priceIdr: number }[];
  totalIdr: number;
  cryptoType: CryptoType;
  cryptoAmount: number;
  exchangeRate: number;
  paymentAddress: string;
  status: InvoiceStatus;
  createdAt: number; // Timestamp
  expiresAt: number; // Timestamp
  progressStep: number; // 0: Generated, 1: Detected, 2: 1/3 confirmed, 3: Success
  txHash?: string;
}

export interface Transaction {
  id: string;
  invoiceId: string;
  amountCrypto: number;
  cryptoType: CryptoType;
  amountIdr: number;
  txHash: string;
  timestamp: number;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  productNames: string;
}
