import React, { useState, useEffect } from 'react';
import { 
  Product, CartItem, Wallet, CryptoType, Invoice, Transaction 
} from './types';
import { 
  INITIAL_PRODUCTS, CRYPTO_CONFIGS, MOCK_WALLET_ADDRESSES 
} from './data/constants';
import { formatIdr } from './utils/cryptoUtils';
import WalletConnect from './components/WalletConnect';
import ProductCatalog from './components/ProductCatalog';
import Cart from './components/Cart';
import PaymentGateway from './components/PaymentGateway';
import TransactionHistory from './components/TransactionHistory';
import { 
  Store, ShoppingCart, Receipt, History, RefreshCw, Smartphone, 
  HelpCircle, Sparkles, Check, CheckCircle2, Coins, Landmark, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // --- Persistent States from Local Storage ---
  
  // Wallet state
  const [wallet, setWallet] = useState<Wallet>(() => {
    const saved = localStorage.getItem('crypto_sandbox_wallet');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      name: 'MetaMask',
      address: MOCK_WALLET_ADDRESSES.ETH,
      balances: {
        BTC: 0.05,
        ETH: 1.5,
        SOL: 12.0,
        USDT: 500.0
      },
      connected: false
    };
  });

  // Cart state
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('crypto_sandbox_cart');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  // Products catalogs (to track custom stock state)
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('crypto_sandbox_products');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return INITIAL_PRODUCTS;
  });

  // Selected crypto for checkout choice
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoType>('USDT');

  // Active Invoice
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(() => {
    const saved = localStorage.getItem('crypto_sandbox_active_invoice');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return null;
  });

  // Historical transactions log ledger
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('crypto_sandbox_tx');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  // Active view tab state ('catalog', 'cart', 'invoice', 'transactions')
  const [activeTab, setActiveTab] = useState<string>('catalog');

  // --- Real Mode & Merchant Receiving Addresses configurations ---
  const [isRealMode, setIsRealMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('crypto_sandbox_real_mode');
    return saved === 'true';
  });

  const [merchantAddresses, setMerchantAddresses] = useState<Record<CryptoType, string>>(() => {
    const saved = localStorage.getItem('crypto_sandbox_merchant_addresses');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      BTC: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      ETH: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      SOL: 'HN7cABviJHU7Ls3Gf6GgT6J68DdBC5TdBfSmzV5f8JnG',
      USDT: 'TYHCv4mX5D6B6Gf4uJ9Lq7Fp6R1D7S8T9U'
    };
  });

  const [cryptoConfigs, setCryptoConfigs] = useState<Record<CryptoType, any>>(() => {
    return CRYPTO_CONFIGS;
  });

  const [priceStatus, setPriceStatus] = useState<'loading' | 'connected' | 'fallback'>('loading');
  const [lastPriceUpdate, setLastPriceUpdate] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Unified, resilient real-time rate pricing lookup
  const fetchLivePrices = async () => {
    try {
      // Primary: CoinGecko
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,tether&vs_currencies=idr');
      if (res.ok) {
        const data = await res.json();
        const btcPrice = data.bitcoin?.idr || 1100000000;
        const ethPrice = data.ethereum?.idr || 55000000;
        const solPrice = data.solana?.idr || 2450000;
        const usdtPrice = data.tether?.idr || 16350;

        setCryptoConfigs(prev => ({
          BTC: { ...prev.BTC, rateIdr: btcPrice },
          ETH: { ...prev.ETH, rateIdr: ethPrice },
          SOL: { ...prev.SOL, rateIdr: solPrice },
          USDT: { ...prev.USDT, rateIdr: usdtPrice }
        }));
        setLastPriceUpdate(Date.now());
        setPriceStatus('connected');
        return;
      }
    } catch (e) {
      console.warn("CoinGecko rate-limit or offline. Checking backup Coinbase API...", e);
    }

    try {
      // Backup: Coinbase Spot Price lookup
      const [btcRes, ethRes, solRes] = await Promise.all([
        fetch('https://api.coinbase.com/v2/prices/BTC-IDR/spot'),
        fetch('https://api.coinbase.com/v2/prices/ETH-IDR/spot'),
        fetch('https://api.coinbase.com/v2/prices/SOL-IDR/spot')
      ]);

      let btcPrice = CRYPTO_CONFIGS.BTC.rateIdr;
      let ethPrice = CRYPTO_CONFIGS.ETH.rateIdr;
      let solPrice = CRYPTO_CONFIGS.SOL.rateIdr;

      if (btcRes.ok) {
        const d = await btcRes.json();
        if (d?.data?.amount) btcPrice = parseFloat(d.data.amount);
      }
      if (ethRes.ok) {
        const d = await ethRes.json();
        if (d?.data?.amount) ethPrice = parseFloat(d.data.amount);
      }
      if (solRes.ok) {
        const d = await solRes.json();
        if (d?.data?.amount) solPrice = parseFloat(d.data.amount);
      }

      // Estimate USDT relative to USD currency rates
      const usdRes = await fetch('https://api.coinbase.com/v2/prices/USD-IDR/spot');
      let usdtPrice = CRYPTO_CONFIGS.USDT.rateIdr;
      if (usdRes.ok) {
        const d = await usdRes.json();
        if (d?.data?.amount) usdtPrice = parseFloat(d.data.amount);
      }

      setCryptoConfigs(prev => ({
        BTC: { ...prev.BTC, rateIdr: btcPrice },
        ETH: { ...prev.ETH, rateIdr: ethPrice },
        SOL: { ...prev.SOL, rateIdr: solPrice },
        USDT: { ...prev.USDT, rateIdr: usdtPrice }
      }));
      setLastPriceUpdate(Date.now());
      setPriceStatus('connected');
    } catch (err) {
      console.error("All price providers offline, fallback to preset configs:", err);
      setPriceStatus('fallback');
    }
  };

  // Real Web3 wallet injection listener
  const handleConnectRealWallet = async (walletType: 'metamask' | 'phantom') => {
    try {
      if (walletType === 'metamask') {
        if (typeof window !== 'undefined' && (window as any).ethereum) {
          const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
          if (accounts && accounts.length > 0) {
            setWallet({
              name: 'MetaMask',
              address: accounts[0],
              balances: {
                BTC: 0.0,
                ETH: 1.5, // fallback or loaded
                SOL: 0.0,
                USDT: 500.0
              },
              connected: true
            });

            // Fetch actual address ETH balance in real Web3 mode
            try {
              const hexBalance = await (window as any).ethereum.request({
                method: 'eth_getBalance',
                params: [accounts[0], 'latest']
              });
              const ethVal = parseInt(hexBalance, 16) / 1e18;
              setWallet(prev => ({
                ...prev,
                balances: { ...prev.balances, ETH: ethVal }
              }));
            } catch (err) {
              console.warn("Could not load real wallet balance:", err);
            }
          }
        } else {
          alert('MetaMask atau provider Web3 tidak terpasang di browser Anda.');
        }
      } else if (walletType === 'phantom') {
        if (typeof window !== 'undefined' && (window as any).solana) {
          const resp = await (window as any).solana.connect();
          const pubKey = resp.publicKey.toString();
          setWallet({
            name: 'Phantom',
            address: pubKey,
            balances: {
              BTC: 0.0,
              ETH: 0.0,
              SOL: 12.0,
              USDT: 0.0
            },
            connected: true
          });
        } else {
          alert('Phantom Wallet (Solana) tidak terpasang di browser Anda.');
        }
      }
    } catch (e) {
      console.error("Web3 connect failed: ", e);
    }
  };

  // --- Effects to sync with Local Storage ---
  useEffect(() => {
    localStorage.setItem('crypto_sandbox_real_mode', String(isRealMode));
  }, [isRealMode]);

  useEffect(() => {
    localStorage.setItem('crypto_sandbox_merchant_addresses', JSON.stringify(merchantAddresses));
  }, [merchantAddresses]);

  // Execute price fetch on load and loop
  useEffect(() => {
    fetchLivePrices();
    const interval = setInterval(fetchLivePrices, 40000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('crypto_sandbox_wallet', JSON.stringify(wallet));
  }, [wallet]);

  useEffect(() => {
    localStorage.setItem('crypto_sandbox_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('crypto_sandbox_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('crypto_sandbox_active_invoice', activeInvoice ? JSON.stringify(activeInvoice) : '');
  }, [activeInvoice]);

  useEffect(() => {
    localStorage.setItem('crypto_sandbox_tx', JSON.stringify(transactions));
  }, [transactions]);

  // If there is an active invoice and it is pending / broadcasted, let's keep the user updated.
  // We can automatically direct them to the Invoice tab when they checkout.

  // --- Core Wallet Operations ---
  const handleConnectWallet = (walletName: string) => {
    let mockAddress = MOCK_WALLET_ADDRESSES.ETH;
    if (walletName.includes('Phantom')) {
      mockAddress = MOCK_WALLET_ADDRESSES.SOL;
    } else if (walletName.includes('Bitcoin')) {
      mockAddress = MOCK_WALLET_ADDRESSES.BTC;
    }

    setWallet(prev => ({
      ...prev,
      name: walletName,
      address: mockAddress,
      connected: true
    }));
  };

  const handleDisconnectWallet = () => {
    setWallet(prev => ({
      ...prev,
      connected: false
    }));
  };

  const handleTopUpBalance = (type: CryptoType, amount: number) => {
    setWallet(prev => ({
      ...prev,
      balances: {
        ...prev.balances,
        [type]: prev.balances[type] + amount
      }
    }));
  };

  const handleDeductWalletBalance = (type: CryptoType, amount: number) => {
    setWallet(prev => ({
      ...prev,
      balances: {
        ...prev.balances,
        [type]: Math.max(0, prev.balances[type] - amount)
      }
    }));
  };

  // --- Cart Operations ---
  const handleAddToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      
      // Check maximum stock in current memory
      const currentStock = products.find(p => p.id === product.id)?.stock ?? 0;
      if (currentStock <= 0) return prev;

      if (existing) {
        if (existing.quantity >= currentStock) return prev;
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleUpdateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === productId);
      if (!existing) return prev;

      const newQty = existing.quantity + delta;
      if (newQty <= 0) {
        return prev.filter(item => item.product.id !== productId);
      }

      // Check current products stock ceiling
      const maxStock = products.find(p => p.id === productId)?.stock ?? 999;
      if (newQty > maxStock) return prev;

      return prev.map(item => 
        item.product.id === productId 
          ? { ...item, quantity: newQty } 
          : item
      );
    });
  };

  const handleRemoveCartItem = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  // --- Checkout / Invoice Generation ---
  const handleCheckoutAndGenerateInvoice = () => {
    if (cart.length === 0) return;

    const totalIdr = cart.reduce((sum, item) => sum + item.product.priceIdr * item.quantity, 0);
    const selectedConfig = cryptoConfigs[selectedCrypto] || CRYPTO_CONFIGS[selectedCrypto];
    const totalCrypto = totalIdr / selectedConfig.rateIdr;

    // Build a customizable / real merchant receiving address based on active configuration
    const merchantAddress = merchantAddresses[selectedCrypto] || MOCK_WALLET_ADDRESSES[selectedCrypto];

    const invoiceItems = cart.map(item => ({
      productName: item.product.name,
      quantity: item.quantity,
      priceIdr: item.product.priceIdr
    }));

    const newInvoice: Invoice = {
      id: `INV-${Math.floor(100000 + Math.random() * 900000)}`,
      items: invoiceItems,
      totalIdr: totalIdr,
      cryptoType: selectedCrypto,
      cryptoAmount: totalCrypto,
      exchangeRate: selectedConfig.rateIdr,
      paymentAddress: merchantAddress,
      status: 'PENDING',
      createdAt: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 Mins expiry
      progressStep: 0
    };

    setActiveInvoice(newInvoice);
    setActiveTab('invoice');
  };

  // --- Settle & Confirm Invoice Payment ---
  const handleUpdateInvoiceStatus = (status: Invoice['status'], progressStep: number, txHash?: string) => {
    setActiveInvoice(prev => {
      if (!prev) return null;
      return {
        ...prev,
        status,
        progressStep,
        txHash: txHash || prev.txHash
      };
    });
  };

  // Final Action to close of payment
  const handleConfirmInvoiceSuccess = () => {
    if (!activeInvoice) return;

    // Complete stock reduction on purchased items
    setProducts(prev => {
      return prev.map(p => {
        const itemCountInvoiced = activeInvoice.items.find(i => i.productName === p.name);
        if (itemCountInvoiced) {
          return {
            ...p,
            stock: Math.max(0, p.stock - itemCountInvoiced.quantity)
          };
        }
        return p;
      });
    });

    // Save transaction to the history explorer
    const newTx: Transaction = {
      id: `TX-${Math.floor(1000 + Math.random() * 9000)}`,
      invoiceId: activeInvoice.id,
      amountCrypto: activeInvoice.cryptoAmount,
      cryptoType: activeInvoice.cryptoType,
      amountIdr: activeInvoice.totalIdr,
      txHash: activeInvoice.txHash || 'N/A',
      timestamp: Date.now(),
      status: 'SUCCESS',
      productNames: activeInvoice.items.map(i => `${i.productName} (x${i.quantity})`).join(', ')
    };

    setTransactions(prev => [newTx, ...prev]);
    setCart([]); // Reset Cart
    setActiveInvoice(null); // Clear active checkout session
    setActiveTab('transactions'); // Jump to histories
  };

  const handleCancelActiveInvoice = () => {
    setActiveInvoice(null);
    setActiveTab('cart');
  };

  // Sandbox helper to clear up everything to start fresh
  const handleResetSandboxState = () => {
    if (confirm('Apakah Anda ingin mereset seluruh data simulasi, wallet, stok produk, dan riwayat ke kondisi awal?')) {
      localStorage.clear();
      setProducts(INITIAL_PRODUCTS);
      setCart([]);
      setWallet({
        name: 'MetaMask',
        address: MOCK_WALLET_ADDRESSES.ETH,
        balances: {
          BTC: 0.05,
          ETH: 1.5,
          SOL: 12.0,
          USDT: 500.0
        },
        connected: false
      });
      setActiveInvoice(null);
      setTransactions([]);
      setSelectedCrypto('USDT');
      setActiveTab('catalog');
    }
  };

  return (
    <div className="min-h-screen bg-slate-955 bg-gradient-to-b from-slate-950 via-slate-955 to-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/20 selection:text-indigo-300">
      
      {/* Aesthetic glowing background ambient blur */}
      <div className="absolute top-0 right-0 left-0 h-[450px] bg-gradient-to-b from-indigo-900/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-24 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Modern Bento Header Bar */}
      <header className="border-b border-slate-900 bg-slate-950/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          
          {/* Logo Brand matching the Bento styling template */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 overflow-hidden rounded-xl flex items-center justify-center bg-slate-900 border border-slate-800 shadow-md hover:scale-110 transition-transform duration-300">
              <img
                src="/src/assets/images/life_change_coin_logo_1781163942595.png"
                alt="Life Change Coin Logo"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <span className="font-display text-lg font-extrabold tracking-tight text-white">
                LIFE CHANGE <span className="text-emerald-400">COIN</span>
              </span>
              <p className="text-[10px] text-slate-500 font-mono tracking-wider">SECURE SANDBOX BLOCKCHAIN</p>
            </div>
          </div>

          {/* Wallet integration with status badge and settings configurator */}
          <div className="flex items-center gap-2">
            <button
              id="btn-open-merchant-settings"
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl transition-all text-slate-400 hover:text-indigo-400 relative group flex items-center justify-center cursor-pointer"
              title="Pengaturan Gerbang Pembayaran Terverifikasi"
            >
              <Settings className="w-4 h-4 animate-spin-slow group-hover:scale-105 transition-transform" />
              {isRealMode && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>
            
            <WalletConnect
              wallet={wallet}
              onConnect={handleConnectWallet}
              onDisconnect={handleDisconnectWallet}
              onTopUp={handleTopUpBalance}
              onConnectReal={handleConnectRealWallet}
              cryptoConfigs={cryptoConfigs}
            />
          </div>

        </div>
      </header>

      {/* Main Grid Base */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full z-10 relative">
        
        {/* Navigation Tabs bar styled as compact Bento pill row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pb-5 border-b border-slate-900 mb-6 gap-3">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/40 p-1.5 rounded-2xl border border-slate-800/80">
            {/* Catalog tab button */}
            <button
              id="btn-tab-catalog"
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'catalog'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Store className="w-4 h-4 shrink-0 text-current" />
              <span>Belanja</span>
            </button>

            {/* Cart tab button */}
            <button
              id="btn-tab-cart"
              onClick={() => setActiveTab('cart')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all relative ${
                activeTab === 'cart'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <ShoppingCart className="w-4 h-4 shrink-0 text-current" />
              <span>Keranjang Belanja</span>
              {cart.reduce((s, c) => s + c.quantity, 0) > 0 && (
                <span className="absolute -top-1 right-1 px-1.5 py-0.2 bg-emerald-500 text-slate-950 text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
                  {cart.reduce((s, c) => s + c.quantity, 0)}
                </span>
              )}
            </button>

            {/* Active temporary invoice tracker */}
            {activeInvoice && (
              <button
                id="btn-tab-invoice"
                onClick={() => setActiveTab('invoice')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-extrabold rounded-xl transition-all ${
                  activeTab === 'invoice'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/20 hover:bg-amber-500/25'
                }`}
              >
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-ping" />
                <Receipt className="w-4 h-4 shrink-0" />
                <span>Invoice Aktif ({activeInvoice.id})</span>
              </button>
            )}

            {/* Blockchain History logger */}
            <button
              id="btn-tab-history"
              onClick={() => setActiveTab('transactions')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'transactions'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <History className="w-4 h-4 shrink-0 text-current" />
              <span>Blockchain Explorer</span>
            </button>
          </div>

          {/* Master reset trigger */}
          <button
            id="btn-reset-app"
            onClick={handleResetSandboxState}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900/40 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 text-rose-450 hover:text-rose-400 text-xs font-bold uppercase tracking-wider rounded-xl transition-all active:scale-[0.98]"
          >
            <RefreshCw className="w-3.5 h-3.5 shrink-0" />
            <span>Reset Demo</span>
          </button>
        </div>

        {/* Dynamic Bento Box header grid (Shown only on shopping view tab) */}
        {activeTab === 'catalog' && (
          <div className="grid grid-cols-12 gap-5 mb-8">
            
            {/* Wallet Overview (Slate Bento Card) */}
            <div className="col-span-12 md:col-span-4 bg-slate-900/30 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-slate-700/50 transition-colors">
              <div className="absolute -top-6 -right-6 p-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                <Landmark className="w-28 h-28 text-white" />
              </div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest font-display mb-1">Total Saldo Simulasi</p>
                <div className="flex items-baseline gap-1">
                  <h3 className="text-3xl font-display font-extrabold text-white tracking-tight">
                    {formatIdr(
                      wallet.balances.BTC * (cryptoConfigs.BTC?.rateIdr || CRYPTO_CONFIGS.BTC.rateIdr) +
                      wallet.balances.ETH * (cryptoConfigs.ETH?.rateIdr || CRYPTO_CONFIGS.ETH.rateIdr) +
                      wallet.balances.SOL * (cryptoConfigs.SOL?.rateIdr || CRYPTO_CONFIGS.SOL.rateIdr) +
                      wallet.balances.USDT * (cryptoConfigs.USDT?.rateIdr || CRYPTO_CONFIGS.USDT.rateIdr)
                    )}
                  </h3>
                </div>
                <p className="text-emerald-400 text-[11px] mt-1.5 font-semibold flex items-center gap-1 font-mono">
                  <span className="text-sm">↑</span> 12.4% <span className="text-slate-500 font-normal ml-1">estimasi portofolio</span>
                </p>
              </div>

              {/* Sub balances ticker lists inside the bento */}
              <div className="grid grid-cols-2 gap-2.5 mt-5">
                <div className="bg-slate-800/20 p-2 rounded-xl border border-slate-700/40">
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold">
                    <span>BTC</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  </div>
                  <p className="font-mono font-bold text-xs text-white mt-1">{wallet.balances.BTC.toFixed(4)}</p>
                </div>
                <div className="bg-slate-800/20 p-2 rounded-xl border border-slate-700/40">
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold">
                    <span>SOL</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <p className="font-mono font-bold text-xs text-white mt-1">{wallet.balances.SOL.toFixed(1)}</p>
                </div>
              </div>
            </div>

            {/* Featured Shopping Item Hot Banner (Featured Indigo Bento) */}
            <div className="col-span-12 md:col-span-5 bg-gradient-to-br from-indigo-650 to-indigo-800 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group shadow-lg">
              <div className="z-10">
                <div className="flex items-center gap-2">
                  <span className="bg-white/20 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest font-mono">
                    Hot Deal
                  </span>
                  <span className="text-[10px] text-indigo-200 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    Pilihan Blockchain Tercepat
                  </span>
                </div>
                <h3 className="text-2xl font-display font-black text-white mt-3 leading-tight tracking-tight">
                  ApexPro Ultra Laptop <span className="text-indigo-200">M3 Ultra</span>
                </h3>
                <p className="text-indigo-100 mt-2 text-xs leading-normal max-w-sm">
                  Komputer server developer terbaik dengan performa kecerdasan buatan, siap bayar instan pakai BTC/USDT.
                </p>
              </div>

              <div className="flex items-end justify-between z-10 mt-6 gap-2">
                <div>
                  <p className="text-indigo-200 text-[10px] uppercase font-bold tracking-wider font-mono">Sisa stok terbatas</p>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-lg font-mono font-bold text-white">0.0227 BTC</span>
                    <span className="text-indigo-200/60 line-through text-xs">{formatIdr(24999000)}</span>
                  </div>
                </div>
                
                <button
                  id="btn-hot-item-quickbuy"
                  onClick={() => {
                    const hotItem = products.find(p => p.id === 'prod-1');
                    if (hotItem) {
                      handleAddToCart(hotItem);
                      setActiveTab('cart');
                    }
                  }}
                  className="bg-white text-indigo-950 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-100 active:scale-95 transition-all shadow-md shrink-0"
                >
                  Beli Instan
                </button>
              </div>

              {/* Glowing decor circle */}
              <div className="absolute -bottom-16 -right-16 w-52 h-52 bg-indigo-500 rounded-full blur-3xl opacity-30 pointer-events-none" />
            </div>

            {/* Market Index Dynamic Indicators (Chart Bento) */}
            <div className="col-span-12 md:col-span-3 bg-slate-900/30 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between hover:border-slate-700/50 transition-colors">
              <div className="flex justify-between items-start">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-display">Status Keamanan Jaringan</p>
                <span className="bg-emerald-500/10 text-emerald-400 font-mono text-[9px] px-2 py-0.5 rounded border border-emerald-500/20">
                  ONLINE
                </span>
              </div>

              {/* Mock visual miniature chart bars representing market indices */}
              <div className="flex items-end gap-1.5 h-16 my-4">
                <div className="flex-1 bg-slate-800 rounded-lg h-[25%] transition-all hover:h-[40%] duration-300" />
                <div className="flex-1 bg-slate-800 rounded-lg h-[65%] transition-all hover:h-[80%] duration-300" />
                <div className="flex-1 bg-slate-800 rounded-lg h-[40%] transition-all hover:h-[55%] duration-300" />
                <div className="flex-1 bg-indigo-505 bg-indigo-500 rounded-lg h-[85%] animate-pulse" />
                <div className="flex-1 bg-indigo-400 rounded-lg h-[98%]" />
                <div className="flex-1 bg-slate-850 rounded-lg h-[50%]" />
              </div>

              <div className="flex justify-between items-center text-[11px]">
                <div>
                  <p className="text-[9px] text-slate-500 uppercase tracking-tighter">Fear & Greed Index</p>
                  <p className="font-bold text-white font-mono text-xs">78 Extreme Greed</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-slate-500 uppercase tracking-tighter">Fee Rata-rata</p>
                  <p className="text-xs font-bold text-indigo-400 font-mono">Free Demo</p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Render actual component tabs based on routing */}
        <div id="application-stages-wrapper">
          {activeTab === 'catalog' && (
            <ProductCatalog
              products={products}
              onAddToCart={handleAddToCart}
            />
          )}

          {activeTab === 'cart' && (
            <Cart
              items={cart}
              wallet={wallet}
              selectedCrypto={selectedCrypto}
              onSelectCrypto={setSelectedCrypto}
              onUpdateQuantity={handleUpdateCartQuantity}
              onRemoveItem={handleRemoveCartItem}
              onCheckout={handleCheckoutAndGenerateInvoice}
              cryptoConfigs={cryptoConfigs}
            />
          )}

          {activeTab === 'invoice' && activeInvoice && (
            <PaymentGateway
              invoice={activeInvoice}
              wallet={wallet}
              onUpdateInvoiceStatus={handleUpdateInvoiceStatus}
              onDeductWalletBalance={handleDeductWalletBalance}
              onConfirmSuccess={handleConfirmInvoiceSuccess}
              onCancelInvoice={handleCancelActiveInvoice}
              isRealMode={isRealMode}
              cryptoConfigs={cryptoConfigs}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionHistory
              transactions={transactions}
            />
          )}
        </div>

      </main>

      {/* Aesthetic standard footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-5 mt-16 text-center">
        <p className="text-xs text-slate-500">
          © 2026 KriptoCommerce Simulator (Life Change Coin). Semua data disimpan lokal secara modular off-chain.
        </p>
      </footer>

      {/* Merchant Configurations Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs cursor-pointer" 
              onClick={() => setIsSettingsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.98 }}
              className="fixed inset-x-4 bottom-4 md:bottom-auto md:top-24 md:right-24 md:left-auto md:w-[420px] bg-slate-900 border border-slate-800 p-6 rounded-3xl z-50 shadow-2xl text-slate-100 overflow-y-auto max-h-[85vh] z-[99]"
            >
              <div className="flex justify-between items-start pb-3.5 border-b border-slate-800 mb-4">
                <div>
                  <h3 className="font-display font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-1.5 leading-none">
                    <Settings className="w-4 h-4 text-emerald-400 animate-spin-slow" />
                    Pengaturan Mode Nyata & Merchant
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono tracking-wider mt-1">KONFIGURASI ALAMAT DEPOSIT ASLI</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors text-[10px] font-bold font-mono px-2 py-1 bg-slate-955 hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Tutup
                </button>
              </div>

              {/* Mode Toggle Switch */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 mb-5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white leading-none block">Aktifkan Mode Nyata</span>
                    <span className="text-[10px] text-slate-500 mt-1 block">Gunakan transaksi asli & dompet eksternal</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !isRealMode;
                      setIsRealMode(next);
                      if (next) {
                        alert("PENTING: Mode Nyata aktif! Transaksi checkout akan menggunakan alamat real Anda, dan wallet MetaMask/Phantom asli dapat memicu popup transfer dana real. Pastikan Anda berhati-hati!");
                      }
                    }}
                    className={`w-11 h-6 p-0.5 rounded-full transition-all flex items-center cursor-pointer ${
                      isRealMode
                        ? 'bg-emerald-550 border border-emerald-400 justify-end'
                        : 'bg-slate-850 border border-slate-800 justify-start'
                    }`}
                  >
                    <span className="w-4.5 h-4.5 rounded-full bg-white shadow-md block" />
                  </button>
                </div>

                <div className="flex items-center gap-2 mt-1.5 text-[10px]">
                  <span className={`w-2 h-2 rounded-full ${isRealMode ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`} />
                  <span className="text-slate-400">
                    Status: <strong className={isRealMode ? 'text-emerald-400 font-bold' : 'text-slate-400 font-medium'}>
                      {isRealMode ? 'GERBANG PEMBAYARAN REAL' : 'SIMULATOR DEMO AKTIF'}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Price Feeds Status info */}
              <div className="bg-slate-950/40 p-3.5 rounded-2xl border border-slate-855 space-y-2.5 mb-5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Live Price (IDR Pair)</span>
                  <span className="w-1.5 h-1.5 bg-emerald-450 rounded-full animate-ping" />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(cryptoConfigs) as CryptoType[]).map((coin) => (
                    <div key={coin} className="flex justify-between items-center text-[10px] font-mono p-1.5 bg-slate-950 rounded-xl px-2.5 border border-slate-900/60">
                      <span className="text-slate-500 font-bold">{coin}:</span>
                      <span className="text-emerald-400 font-bold">≈ {formatIdr(cryptoConfigs[coin].rateIdr)}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-slate-500 text-center font-mono mt-1">
                  Update terakhir: {lastPriceUpdate ? new Date(lastPriceUpdate).toLocaleTimeString() : 'Menghubungkan...'}
                </p>
              </div>

              {/* Web3 Visual Tutorial Onboarding Guide */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3.5 mb-5 select-none">
                <div>
                  <span className="text-xs font-bold text-white leading-none block flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    Diagram Petunjuk Aliran Web3 Real
                  </span>
                  <span className="text-[9px] text-slate-500 mt-1 block">Grafik interaktif langkah aman integrasi wallet</span>
                </div>
                
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900 flex items-center justify-center p-0.5 group">
                  <img
                    src="/src/assets/images/wallet_setup_guide_1781165598180.png"
                    alt="Web3 Wallet Setup Guide Petunjuk"
                    className="w-full h-auto object-cover rounded-lg group-hover:scale-102 transition-transform duration-350"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="space-y-1.5 text-[10px] text-slate-400">
                  <p className="font-bold text-slate-200">Langkah Integrasi Nyata:</p>
                  <ol className="list-decimal pl-4 space-y-1 text-slate-450 leading-relaxed">
                    <li>Pasang ekstensi browser <b>MetaMask</b> (untuk EVM) atau <b>Phantom</b> (untuk Solana).</li>
                    <li>Buka aplikasi di <b>tab baru</b> menggunakan ikon di sudut kanan atas panel preview.</li>
                    <li>Hubungkan wallet Anda di panel atas, ubah ke tab <b>Dompet Real (Web3)</b>.</li>
                    <li>Sesuaikan <b>Alamat Deposit</b> milik Anda di bawah agar dana real langsung masuk ke Anda!</li>
                  </ol>
                </div>
              </div>

              {/* Merchant Configuration Form Inputs */}
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider mb-0.5 font-display">Alamat Deposit Toko Anda</p>
                  <p className="text-[9px] text-slate-500 leading-normal mb-3">Sesuaikan alamat penerimaan dana agar pembayaran real dari pelanggan masuk langsung ke dompet pribadi Anda.</p>
                </div>

                {(Object.keys(merchantAddresses) as CryptoType[]).map((coin) => (
                  <div key={coin} className="space-y-1.5 p-3.5 bg-slate-950/80 rounded-2xl border border-slate-850/80">
                    <div className="flex justify-between text-[11px] items-center">
                      <span className="text-slate-200 font-bold font-display">{coin} Address ({cryptoConfigs[coin]?.network || 'Mainnet'})</span>
                      <button
                        type="button"
                        onClick={() => {
                          const val = prompt(`Masukkan alamat dompet ${coin} Anda:`, merchantAddresses[coin]);
                          if (val !== null && val.trim().length > 6) {
                            setMerchantAddresses(prev => ({
                              ...prev,
                              [coin]: val.trim()
                            }));
                          }
                        }}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 underline font-mono cursor-pointer"
                      >
                        Edit Alamat
                      </button>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 overflow-x-auto truncate select-all outline-none bg-slate-900 px-3 py-2 rounded-xl text-left border border-slate-850">
                      {merchantAddresses[coin]}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-indigo-500/5 border border-indigo-500/15 rounded-xl mt-5">
                <p className="text-[9px] text-indigo-200 text-center font-medium leading-relaxed">
                  Konfigurasi di atas disimpan aman di penyimpanan sandboxed lokal Anda.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
