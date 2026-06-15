import React, { useState, useEffect } from 'react';
import { Wallet, CryptoType } from '../types';
import { CRYPTO_CONFIGS } from '../data/constants';
import { formatIdr, formatCrypto, shortenAddress } from '../utils/cryptoUtils';
import { Wallet as WalletIcon, Check, Copy, ArrowUpRight, ShieldCheck, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WalletConnectProps {
  wallet: Wallet;
  onConnect: (walletName: string) => void;
  onDisconnect: () => void;
  onTopUp: (type: CryptoType, amount: number) => void;
  onConnectReal?: (walletType: 'metamask' | 'phantom') => Promise<void>;
  cryptoConfigs?: Record<CryptoType, any>;
}

export default function WalletConnect({ 
  wallet, 
  onConnect, 
  onDisconnect, 
  onTopUp, 
  onConnectReal,
  cryptoConfigs = CRYPTO_CONFIGS 
}: WalletConnectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState<string>('100');
  const [topUpType, setTopUpType] = useState<CryptoType>('USDT');
  const [activeWalletTab, setActiveWalletTab] = useState<'simulated' | 'real_web3'>('simulated');
  const [hasWeb3, setHasWeb3] = useState({ metamask: false, phantom: false });

  // Detect Web3 injection on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHasWeb3({
        metamask: !!(window as any).ethereum,
        phantom: !!(window as any).solana
      });
    }
  }, []);

  const handleCopy = (address: string, symbol: string) => {
    navigator.clipboard.writeText(address);
    setCopied(symbol);
    setTimeout(() => setCopied(null), 2000);
  };

  const executeTopUp = () => {
    const val = parseFloat(topUpAmount);
    if (!isNaN(val) && val > 0) {
      onTopUp(topUpType, val);
    }
  };

  return (
    <div id="wallet-connect-section" className="relative">
      {/* Wallet Status Badge */}
      {!wallet.connected ? (
        <button
          id="btn-connect-wallet-trigger"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white rounded-xl font-bold text-xs transition-all shadow-md active:scale-95"
        >
          <WalletIcon className="w-4 h-4" />
          <span>Hubungkan Wallet</span>
        </button>
      ) : (
        <button
          id="btn-wallet-panel-trigger"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 px-4 py-1.5 bg-slate-900 border border-indigo-500/30 hover:border-indigo-500/60 rounded-xl text-xs font-semibold transition-all shadow-sm"
        >
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="font-mono text-slate-300 hidden sm:inline">
            {shortenAddress(wallet.address)}
          </span>
          <span className="text-slate-400 font-bold sm:ml-1">
            {wallet.name}
          </span>
        </button>
      )}

      {/* Wallet Dialog Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs" 
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              id="wallet-connect-modal"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              transition={{ duration: 0.15 }}
              className="fixed sm:absolute right-0 sm:right-0 left-4 right-4 sm:left-auto top-20 sm:top-12 sm:w-96 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl shadow-indigo-950/20 z-50 text-white select-none origin-top-right max-h-[85vh] overflow-y-auto"
            >
              {!wallet.connected ? (
                <div>
                  <h3 className="font-display font-bold text-base mb-1.5 flex items-center gap-2 text-white">
                    <WalletIcon className="w-5 h-5 text-indigo-400" />
                    Hubungkan Dompet Anda
                  </h3>
                  
                  {/* Tab Selector */}
                  <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 my-3">
                    <button
                      type="button"
                      onClick={() => setActiveWalletTab('simulated')}
                      className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                        activeWalletTab === 'simulated'
                          ? 'bg-indigo-650 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Dompet Simulasi (Demo)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveWalletTab('real_web3')}
                      className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        activeWalletTab === 'real_web3'
                          ? 'bg-indigo-650 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                      Dompet Real (Web3)
                    </button>
                  </div>

                  {activeWalletTab === 'simulated' ? (
                    <div>
                      <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                        Pilih salah satu wallet simulator untuk menguji coba pembelian produk menggunakan saldo demo tak terbatas.
                      </p>

                      <div className="space-y-2 mb-4">
                        {['MetaMask (Simulasi)', 'Phantom (Simulasi)', 'Trust Wallet', 'Coinbase Wallet'].map((walletOption) => (
                          <button
                            key={walletOption}
                            id={`btn-connect-${walletOption.toLowerCase().replace(/\s/g, '-')}`}
                            onClick={() => {
                              onConnect(walletOption);
                              setIsOpen(false);
                            }}
                            className="w-full flex items-center justify-between p-3.5 bg-slate-850 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/40 rounded-2xl text-left transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 text-slate-200 text-sm font-bold group-hover:scale-105 transition-transform">
                                {walletOption[0]}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-100">{walletOption}</p>
                                <p className="text-[10px] text-slate-500 font-mono">Instant Simulator Link</p>
                              </div>
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-slate-550 group-hover:text-indigo-400 transition-colors" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                        Hubungkan ekstensi dompet asli Anda (MetaMask, Phantom, dsb) untuk berinteraksi di blockchain sungguhan.
                      </p>

                      <div className="space-y-2 mb-4">
                        {/* MetaMask Real Connect button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (onConnectReal) onConnectReal('metamask');
                            setIsOpen(false);
                          }}
                          className="w-full flex items-center justify-between p-3.5 bg-slate-850 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/40 rounded-2xl text-left transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 text-xs font-bold font-mono">
                              🦊
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-100">MetaMask (Real Web3)</span>
                                {hasWeb3.metamask && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 font-mono">
                                {hasWeb3.metamask ? 'Ekstensi Terdeteksi ✅' : 'Ekstensi Tidak Ditemukan'}
                              </p>
                            </div>
                          </div>
                          <ArrowUpRight className="w-4 h-4 text-slate-550 group-hover:text-indigo-400 transition-colors" />
                        </button>

                        {/* Phantom Real Connect button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (onConnectReal) onConnectReal('phantom');
                            setIsOpen(false);
                          }}
                          className="w-full flex items-center justify-between p-3.5 bg-slate-850 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/40 rounded-2xl text-left transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 text-xs font-bold">
                              ◎
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-100">Phantom (Solana Real)</span>
                                {hasWeb3.phantom && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 font-mono">
                                {hasWeb3.phantom ? 'Ekstensi Terdeteksi ✅' : 'Ekstensi Tidak Ditemukan'}
                              </p>
                            </div>
                          </div>
                          <ArrowUpRight className="w-4 h-4 text-slate-550 group-hover:text-indigo-400 transition-colors" />
                        </button>
                      </div>

                      <div className="p-3 bg-indigo-500/5 border border-indigo-500/15 rounded-2xl mb-4">
                        <p className="text-[10px] text-indigo-300 font-bold mb-1">💡 Tips Integrasi:</p>
                        <p className="text-[10px] text-slate-400 leading-normal">
                          Jika ekstensi tidak mendeteksi klik, pastikan Anda <strong>membuka aplikasi di tab baru</strong> (melalui ikon di kanan atas panel preview) agar browser tidak memblokir popup Web3 iframe.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-2xl flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-slate-400 leading-normal">
                      <strong className="text-emerald-300">Bergaransi Aman:</strong> Integrasi Web3 ini dijalankan murni di sisi browser Anda. Anda selalu bisa membatalkan transaksi kapan saja di panel konfirmasi dompet.
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Connected View */}
                  <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      <p className="text-xs text-slate-400">Terhubung dengan</p>
                      <span className="text-[11px] px-2 py-0.5 bg-slate-950 rounded font-bold text-indigo-400 border border-indigo-505 border-indigo-500/20">
                        {wallet.name}
                      </span>
                    </div>
                    <button
                      id="btn-disconnect-wallet"
                      onClick={() => {
                        onDisconnect();
                        setIsOpen(false);
                      }}
                      className="text-xs text-rose-450 hover:text-rose-400 font-medium transition-colors"
                    >
                      Putuskan
                    </button>
                  </div>

                  {/* Address Section */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 mb-4">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-mono">Alamat Wallet Anda (Mock)</p>
                    <div className="flex items-center justify-between text-xs font-mono bg-slate-900 px-2 py-1.5 rounded-xl text-slate-300 gap-2 border border-slate-800/50">
                      <span className="truncate">{wallet.address}</span>
                      <button
                        onClick={() => handleCopy(wallet.address, 'ADDR')}
                        className="p-1 hover:bg-slate-800 rounded transition-colors text-indigo-400 shrink-0"
                      >
                        {copied === 'ADDR' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Balance Header */}
                  <p className="text-xs font-semibold mb-2 flex items-center justify-between">
                    <span>Saldo Crypto Simulator:</span>
                    <span className="text-[10px] font-normal text-slate-500">Dapat ditambah bebas</span>
                  </p>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {(Object.keys(wallet.balances) as CryptoType[]).map((coin) => {
                      const cfg = cryptoConfigs[coin] || CRYPTO_CONFIGS[coin];
                      const balance = wallet.balances[coin];
                      const idrValue = balance * cfg.rateIdr;

                      return (
                        <div key={coin} className="p-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700/60 rounded-xl transition-colors">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-slate-400">{cfg.name}</span>
                            <span className="font-mono text-[10px] text-slate-400 font-bold px-1 py-0.2 bg-slate-900 rounded">
                              {coin}
                            </span>
                          </div>
                          <p className="text-xs font-mono font-bold text-white leading-none mb-1">
                            {formatCrypto(balance, coin).split(' ')[0]}
                          </p>
                          <p className="text-[9px] text-slate-500 font-medium">
                            ≈ {formatIdr(idrValue)}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Refill / Sandbox Injector */}
                  <div className="mt-4 pt-3 border-t border-slate-800 bg-indigo-500/5 p-3 rounded-2xl border border-indigo-500/15">
                    <p className="text-[11px] font-bold text-indigo-400 mb-2 flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin-slow" />
                      Refill / Isi Ulang Saldo Demo
                    </p>
                    <div className="flex gap-2">
                      <select
                        id="select-topup-coin"
                        value={topUpType}
                        onChange={(e) => setTopUpType(e.target.value as CryptoType)}
                        className="bg-slate-950 text-xs text-slate-300 border border-slate-800 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="USDT">USDT</option>
                        <option value="SOL">SOL</option>
                        <option value="ETH">ETH</option>
                        <option value="BTC">BTC</option>
                      </select>
                      <input
                        id="input-topup-amount"
                        type="number"
                        value={topUpAmount}
                        onChange={(e) => setTopUpAmount(e.target.value)}
                        placeholder="Jumlah"
                        className="w-full bg-slate-950 text-xs border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-white focus:outline-none focus:border-indigo-500"
                        min="0.0001"
                        step="any"
                      />
                      <button
                        id="btn-execute-topup"
                        onClick={executeTopUp}
                        className="px-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-xs text-white font-bold rounded-lg transition-transform shrink-0"
                      >
                        Tambah
                      </button>
                    </div>
                    <p className="text-[9px] text-slate-500 mt-1.5 flex items-center gap-1 leading-normal font-mono">
                      <AlertCircle className="w-3 h-3 text-slate-500 shrink-0" />
                      Gunakan ini jika Anda kehabisan dana untuk melunasi checkout nanti.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
