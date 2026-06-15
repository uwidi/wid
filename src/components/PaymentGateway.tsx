import React, { useState, useEffect, useRef } from 'react';
import { Invoice, Wallet, CryptoType } from '../types';
import { CRYPTO_CONFIGS } from '../data/constants';
import { formatIdr, formatCrypto, shortenAddress, generateQRPlaceholderSvg, generateTxHash } from '../utils/cryptoUtils';
import { 
  Hourglass, Copy, Check, ShieldCheck, Wallet as WalletIcon, 
  ExternalLink, CheckCircle2, RotateCcw, AlertTriangle, Play, Sparkles, ServerCrash, Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PaymentGatewayProps {
  invoice: Invoice;
  wallet: Wallet;
  onUpdateInvoiceStatus: (status: Invoice['status'], progressStep: number, txHash?: string) => void;
  onDeductWalletBalance: (type: CryptoType, amount: number) => void;
  onConfirmSuccess: () => void;
  onCancelInvoice: () => void;
  isRealMode?: boolean;
  cryptoConfigs?: Record<CryptoType, any>;
}

export default function PaymentGateway({
  invoice,
  wallet,
  onUpdateInvoiceStatus,
  onDeductWalletBalance,
  onConfirmSuccess,
  onCancelInvoice,
  isRealMode = false,
  cryptoConfigs = CRYPTO_CONFIGS
}: PaymentGatewayProps) {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds
  const [showWeb3Sign, setShowWeb3Sign] = useState(false);
  const [signingState, setSigningState] = useState<'idle' | 'checking' | 'signing' | 'broadcasting' | 'done' | 'error'>('idle');
  const [signingError, setSigningError] = useState<string | null>(null);
  
  // Ref for progress timer tick
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const blockchainProgressRef = useRef<NodeJS.Timeout | null>(null);

  const selectedConfig = cryptoConfigs[invoice.cryptoType] || CRYPTO_CONFIGS[invoice.cryptoType];

  // Helper for clipboard copies
  const triggerCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Timer Countdown Effect
  useEffect(() => {
    setTimeLeft(Math.max(0, Math.floor((invoice.expiresAt - Date.now()) / 1000)));

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (invoice.status === 'PENDING') {
            onUpdateInvoiceStatus('EXPIRED', 0);
          }
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [invoice.id, invoice.expiresAt]);

  // If status changes to EXPIRED stop timers
  useEffect(() => {
    if (invoice.status === 'EXPIRED' && timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, [invoice.status]);

  // Clean blockchain timers on dismount
  useEffect(() => {
    return () => {
      if (blockchainProgressRef.current) clearTimeout(blockchainProgressRef.current);
    };
  }, []);

  // Format countdown clock (MM:SS)
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate QR pattern dots
  const qrData = generateQRPlaceholderSvg(`${selectedConfig.name.toLowerCase()}:${invoice.paymentAddress}?amount=${invoice.cryptoAmount}`);

  // Auto/Simulate Blockchain Mining progress sandbox
  const startBlockchainSim = () => {
    if (invoice.status !== 'PENDING') return;

    // Phase 1: Detected
    onUpdateInvoiceStatus('DETECTED', 1);

    // Phase 2: Confirming after 3 seconds
    blockchainProgressRef.current = setTimeout(() => {
      const generatedHash = generateTxHash(invoice.cryptoType);
      onUpdateInvoiceStatus('CONFIRMING', 2, generatedHash);

      // Phase 3: Settle Success after another 4.5 seconds
      blockchainProgressRef.current = setTimeout(() => {
        onUpdateInvoiceStatus('SUCCESS', 3, generatedHash);
      }, 4500);
    }, 3000);
  };

  // Handle direct Web3 wallet payment confirmation flow
  const handleWeb3InstantPay = async () => {
    if (!wallet.connected) return;

    setSigningError(null);
    setSigningState('checking');
    setShowWeb3Sign(true);

    const isRealWallet = wallet.name === 'MetaMask' || wallet.name === 'Phantom';

    if (isRealMode && isRealWallet) {
      try {
        if (wallet.name === 'MetaMask' && (window as any).ethereum) {
          setSigningState('signing');
          const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
          const userAddr = accounts[0];

          let txHash = '';
          if (invoice.cryptoType === 'ETH' || invoice.cryptoType === 'USDT') {
            // For ETH/USDT payments, trigger a real EVM sendTransaction
            // Ensure amount is formatted as a precise hex string in wei
            const amountInWei = BigInt(Math.floor(invoice.cryptoAmount * 1e18));
            const transactionParameters = {
              to: invoice.paymentAddress, // receiving merchant Address
              from: userAddr,
              value: '0x' + amountInWei.toString(16),
            };

            txHash = await (window as any).ethereum.request({
              method: 'eth_sendTransaction',
              params: [transactionParameters],
            });
          } else {
            setSigningError(`Pengiriman otomatis via MetaMask belum didukung untuk ${invoice.cryptoType}. Silakan kirim secara manual ke alamat deposit di samping.`);
            setSigningState('error');
            return;
          }

          setSigningState('broadcasting');
          onDeductWalletBalance(invoice.cryptoType, invoice.cryptoAmount);
          onUpdateInvoiceStatus('CONFIRMING', 2, txHash);
          setSigningState('done');

          // Keep updating confirmations and transition to success status after a block time simulation
          setTimeout(() => {
            onUpdateInvoiceStatus('SUCCESS', 3, txHash);
            setShowWeb3Sign(false);
          }, 6000);

        } else if (wallet.name === 'Phantom' && (window as any).solana) {
          setSigningState('signing');
          const provider = (window as any).solana;
          await provider.connect();
          
          setTimeout(() => {
            const generatedHash = generateTxHash('SOL');
            onDeductWalletBalance('SOL', invoice.cryptoAmount);
            onUpdateInvoiceStatus('SUCCESS', 3, generatedHash);
            setSigningState('done');
            setTimeout(() => setShowWeb3Sign(false), 1000);
          }, 3000);
        } else {
          throw new Error("Provider dompet fisik tidak terdeteksi. Silakan coba buka aplikasi di tab baru.");
        }
      } catch (err: any) {
        console.error("Real payment failed:", err);
        setSigningError(err?.message || "Pengguna menolak tanda tangan transaksi atau terjadi kesalahan jaringan.");
        setSigningState('error');
      }
      return;
    }

    // --- FALLBACK: Standard Simulator Mode ---
    const balanceAvailable = wallet.balances[invoice.cryptoType];
    if (balanceAvailable < invoice.cryptoAmount) {
      setSigningError(`Saldo ${invoice.cryptoType} Anda tidak mencukupi. Anda butuh ${invoice.cryptoAmount.toFixed(5)} tetapi hanya memiliki ${balanceAvailable.toFixed(5)}`);
      setSigningState('error');
      setShowWeb3Sign(true);
      return;
    }

    setSigningState('checking');
    setTimeout(() => {
      setSigningState('signing');
      setTimeout(() => {
        setSigningState('broadcasting');
        setTimeout(() => {
          const generatedHash = generateTxHash(invoice.cryptoType);
          onDeductWalletBalance(invoice.cryptoType, invoice.cryptoAmount);
          onUpdateInvoiceStatus('SUCCESS', 3, generatedHash);
          setSigningState('done');
          setTimeout(() => {
            setShowWeb3Sign(false);
          }, 1000);
        }, 1200);
      }, 1500);
    }, 1000);
  };

  return (
    <div id="payment-gateway-wrapper" className="space-y-6">
      {/* Alert Header Status bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-900/30 border border-slate-800 p-5 rounded-3xl gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
            <Hourglass className={`w-5 h-5 ${invoice.status === 'PENDING' ? 'animate-spin-slow' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-200">Status Invoice:</span>
              <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${
                invoice.status === 'PENDING' ? 'bg-amber-550/10 text-amber-500 border border-amber-500/20' :
                invoice.status === 'DETECTED' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse' :
                invoice.status === 'CONFIRMING' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                invoice.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                {invoice.status === 'PENDING' && 'Menunggu Pembayaran'}
                {invoice.status === 'DETECTED' && 'Mempool: Mendeteksi Transaksi'}
                {invoice.status === 'CONFIRMING' && 'Blockchain: Mengkonfirmasi Blok'}
                {invoice.status === 'SUCCESS' && 'Lunas / Berhasil'}
                {invoice.status === 'EXPIRED' && 'Invoice Kedaluwarsa'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5 font-mono">ID Invoice: <span className="text-[11px] text-slate-300 font-bold">{invoice.id}</span></p>
          </div>
        </div>

        {invoice.status === 'PENDING' && (
          <div className="text-right flex items-center sm:block gap-4">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider hidden sm:block">Waktu Tersisa</p>
            <p className="text-xl font-mono font-bold text-amber-500">{formatTimer(timeLeft)}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Gateway Card (Left 7 Columns) */}
        <div className="lg:col-span-7 bg-slate-900/30 border border-slate-800 rounded-3xl overflow-hidden p-6 shadow-md space-y-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-3 font-display">Informasi Pembayaran</h3>

          {/* Amount Box */}
          <div className="bg-slate-950 border border-slate-800 p-4.5 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Silakan Transfer Sebesar</p>
              <p className="text-xl font-mono font-bold text-white mt-1">
                {invoice.cryptoAmount.toFixed(6)} {invoice.cryptoType}
              </p>
              <p className="text-xs text-slate-400 mt-1">Sesuai nilai: {formatIdr(invoice.totalIdr)} IDR</p>
            </div>
            <button
              id="btn-copy-amount"
              onClick={() => triggerCopy(invoice.cryptoAmount.toString(), 'AMOUNT')}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-850 text-xs text-indigo-400 border border-slate-800 rounded-xl flex items-center justify-center gap-1.5 transition-colors font-bold"
            >
              {copiedText === 'AMOUNT' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Salin Jumlah</span>
            </button>
          </div>

          {/* QR & Address Scanner */}
          <div className="flex flex-col sm:flex-row gap-6 items-center">
            {/* Visual QR Code Generator */}
            <div className="w-40 h-40 bg-white p-3 rounded-2xl flex items-center justify-center shrink-0 shadow-lg relative group">
              {invoice.status === 'SUCCESS' ? (
                <div className="absolute inset-0 bg-slate-955/90 flex flex-col items-center justify-center p-2 rounded-2xl text-center">
                  <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mb-1.5">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono">Telah Dibayar</span>
                </div>
              ) : invoice.status === 'EXPIRED' ? (
                <div className="absolute inset-0 bg-slate-955/90 flex flex-col items-center justify-center p-2 rounded-2xl text-center">
                  <div className="w-10 h-10 bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-full flex items-center justify-center mb-1.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-rose-450 uppercase tracking-wider font-mono">Kedaluwarsa</span>
                </div>
              ) : null}

              {/* Draw QR Vector Grid */}
              <svg viewBox="0 0 25 25" className="w-full h-full text-black">
                {qrData.dots.map((dotStr) => {
                  const [r, c] = dotStr.split(',').map(Number);
                  return (
                    <rect
                      key={`${r}-${c}`}
                      x={c}
                      y={r}
                      width={0.88}
                      height={0.88}
                      className="fill-slate-950"
                    />
                  );
                })}
              </svg>
            </div>

            {/* Address copy element */}
            <div className="w-full space-y-3">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-display">Alamat Deposit ({selectedConfig.network})</p>
              <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-2xl flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-slate-300 select-all truncate">
                  {invoice.paymentAddress}
                </span>
                <button
                  id="btn-copy-address"
                  onClick={() => triggerCopy(invoice.paymentAddress, 'ADDR')}
                  className="p-2 bg-slate-900 hover:bg-slate-850 text-indigo-400 rounded-xl border border-slate-800 transition-colors shrink-0"
                >
                  {copiedText === 'ADDR' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Conversion disclaimer */}
              <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-2xl flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-400 leading-normal font-mono">
                  Kirimkan aset Anda hanya melalui jaringan <strong>{selectedConfig.network}</strong>. Pengiriman aset di luar jaringan yang sesuai dapat mengakibatkan dana demo Anda hilang.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Web3 Direct Wallet Pay */}
          {invoice.status === 'PENDING' && (
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 font-display">
                <WalletIcon className="w-4 h-4 text-indigo-400" />
                Bayar Instan dengan Wallet Simulator
              </h4>
              {wallet.connected ? (
                <button
                  id="btn-instant-wallet-payment"
                  onClick={handleWeb3InstantPay}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition-all transform active:scale-98 shadow-md shadow-indigo-600/15"
                >
                  <span>Bayar dengan {wallet.name}</span>
                </button>
              ) : (
                <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 text-center">
                  <p className="text-xs text-slate-400 mb-2 font-medium">Buka menu dompet di kanan atas dan hubungkan Wallet untuk bisa membayar instan tanpa scan manual.</p>
                </div>
              )}
            </div>
          )}

          {/* Settle Action Button */}
          {invoice.status === 'SUCCESS' && (
            <div className="pt-4 border-t border-slate-800">
              <button
                id="btn-completion-continue"
                onClick={onConfirmSuccess}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-2xl transition-all"
              >
                <span>Lihat Nota Resi & Selesai</span>
              </button>
            </div>
          )}

          {invoice.status === 'EXPIRED' && (
            <div className="pt-4 border-t border-slate-800">
              <button
                id="btn-failed-invoice-back"
                onClick={onCancelInvoice}
                className="w-full flex items-center justify-center gap-2 py-3 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-wider rounded-2xl border border-slate-800 transition-all font-mono"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Ulangi Pemesanan Baru</span>
              </button>
            </div>
          )}
        </div>

        {/* Blockchain Ledger State Sandbox Explorer (Right 5 Columns) */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-display">Simulator Lifecycle</h3>
          
          <div className="bg-slate-900/30 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-sm">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Mempool & Blok Explorer</h4>
            
            {/* Interactive Manual Sandbox triggers */}
            {invoice.status === 'PENDING' && (
              <div className="space-y-3">
                <div className="p-3.5 bg-indigo-500/5 border border-indigo-500/15 rounded-2xl space-y-2">
                  <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Metode 1: Simulasi Otomatis</p>
                  <p className="text-[10px] text-slate-400 leading-normal">Simulasikan miner melakukan scanning blockchain untuk mengidentifikasi transfer demo.</p>
                  <button
                    id="btn-trigger-manual-simulation"
                    onClick={startBlockchainSim}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-slate-950 hover:bg-slate-900 text-indigo-400 border border-slate-800 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                  >
                    <Play className="w-3.5 h-3.5 text-indigo-400 shrink-0 animate-pulse" />
                    <span>Lanjutkan Demo Pembayaran</span>
                  </button>
                </div>

                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Metode 2: Verifikasi Tx Hash Real</p>
                  <p className="text-[10px] text-slate-500 leading-normal">Jika Anda melakukan transfer nyata dari ponsel/wallet, masukkan Hash transaksi di bawah untuk memverifikasi.</p>
                  <div className="flex gap-1.5">
                    <input
                      id="input-manual-tx-hash"
                      type="text"
                      placeholder="Masukkan hash transaksi (0x... atau base58)"
                      className="w-full bg-slate-950 text-[11px] border border-slate-850 rounded-lg px-2.5 py-1.5 font-mono text-white focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = (document.getElementById('input-manual-tx-hash') as HTMLInputElement)?.value;
                        if (val && val.trim().length > 8) {
                          onUpdateInvoiceStatus('SUCCESS', 3, val.trim());
                        } else {
                          alert('Masukkan Hash transaksi yang valid untuk melakukan pengecekan.');
                        }
                      }}
                      className="px-3 bg-indigo-650 hover:bg-indigo-700 text-[11px] text-white font-bold rounded-lg transition-colors shrink-0"
                    >
                      Verifikasi
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step visualization timeline */}
            <div className="space-y-4 py-2">
              {/* Step 1: Broadcast */}
              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold font-mono transition-colors ${
                  invoice.progressStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-500 border border-slate-800'
                }`}>
                  1
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-200">Transaksi Ditransmisikan</h5>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Mempool memantau alamat <span className="font-mono text-slate-300">{shortenAddress(invoice.paymentAddress, 4)}</span>.
                  </p>
                  {invoice.progressStep >= 1 && (
                    <span className="text-[9px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1 mt-1 font-mono">
                      <Check className="w-3 h-3 text-emerald-400" /> Transaksi Terdeteksi
                    </span>
                  )}
                </div>
              </div>

              {/* Step 2: Confirming blocks */}
              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold font-mono transition-colors ${
                  invoice.progressStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-500 border border-slate-800'
                }`}>
                  2
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-200">Konfirmasi Mining (1/3 Blok)</h5>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Mengonversi data deposit ke dalam urutan blockchain {selectedConfig.network}.</p>
                  
                  {invoice.progressStep >= 2 && invoice.txHash && (
                    <div className="mt-1.5 space-y-1">
                      <span className="text-[9px] font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1 font-mono">
                        <Hourglass className="w-3 h-3 text-indigo-400 animate-spin" /> Sedang Mengonfirmasi...
                      </span>
                      <div className="text-[9px] font-mono bg-slate-950 px-1.5 py-1 rounded-xl border border-slate-800 text-slate-400 flex items-center justify-between gap-1 overflow-hidden truncate">
                        <span>Hash: {shortenAddress(invoice.txHash, 6)}</span>
                        <a 
                          href="#" 
                          onClick={(e) => { e.preventDefault(); triggerCopy(invoice.txHash || '', 'TX'); }} 
                          className="text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                        >
                          Copy
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3: Success confirmed */}
              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold font-mono transition-colors ${
                  invoice.progressStep >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-500 border border-slate-800'
                }`}>
                  3
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-200">Pembayaran Selesai/Settled</h5>
                  <p className="text-[10px] text-slate-400 mt-0.5">3/3 Konfirmasi valid. Dana masuk ke wallet merchant dan invoice selesai.</p>
                  
                  {invoice.progressStep >= 3 && (
                    <span className="text-[9px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1 mt-1 bg-emerald-500/10 px-1.5 py-0.5 rounded-lg border border-emerald-500/20 w-max font-mono">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Settled / Sukses
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Signing confirmation Modal simulation (overlay) */}
      <AnimatePresence>
        {showWeb3Sign && (
          <>
            <div className="fixed inset-0 z-50 bg-slate-955/85 backdrop-blur-xs" />
            
            <div className="fixed inset-0 flex items-center justify-center p-4 z-[60]">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 text-white shadow-2xl shadow-indigo-950/50"
              >
                {/* Header info */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-indigo-600 text-white font-extrabold rounded-2xl flex items-center justify-center text-lg shadow-md">
                    {wallet.name[0]}
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm text-slate-200">Permintaan Tanda Tangan</h4>
                    <p className="text-[10px] text-slate-500 font-mono tracking-wide uppercase">{wallet.name} extension</p>
                  </div>
                </div>

                {/* Signing stages */}
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-3 mb-4 font-mono text-[11px]">
                  <div className="flex justify-between pb-2 border-b border-slate-800">
                    <span className="text-slate-500">Merchant Aplikasi:</span>
                    <span className="font-semibold text-slate-350">Life Change Coin Store Showcase</span>
                  </div>
                  <div className="flex justify-between pb-2 border-b border-slate-800">
                    <span className="text-slate-500">Total Tagihan:</span>
                    <span className="font-bold text-indigo-450 text-indigo-400">
                      {invoice.cryptoAmount.toFixed(5)} {invoice.cryptoType}
                    </span>
                  </div>
                  <div className="flex justify-between pb-2 border-b border-slate-800">
                    <span className="text-slate-500">Gas Fee Jaringan:</span>
                    <span className="text-emerald-400 font-semibold font-mono">Demo Free</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-500">Arah Transaksi:</span>
                    <span className="font-mono text-slate-300 truncate max-w-[150px]">
                      {invoice.paymentAddress}
                    </span>
                  </div>
                </div>

                {/* Progress / Error message */}
                {signingState === 'checking' && (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-950 rounded-xl border border-slate-800 mb-4 animate-pulse">
                    <Hourglass className="w-4 h-4 text-amber-500 animate-spin" />
                    <p className="text-xs text-slate-400 font-mono">Memeriksa ketersediaan saldo...</p>
                  </div>
                )}

                {signingState === 'signing' && (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 mb-4">
                    <Smartphone className="w-4 h-4 text-indigo-400 animate-bounce" />
                    <p className="text-xs text-indigo-300 font-mono">Menandatangani payload kunci privat...</p>
                  </div>
                )}

                {signingState === 'broadcasting' && (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-950 rounded-xl border border-slate-800 mb-4 animate-pulse">
                    <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin shrink-0" />
                    <p className="text-xs text-slate-450 font-mono">Menyiarkan transaksi ke blockchain...</p>
                  </div>
                )}

                {signingState === 'done' && (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 mb-4">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <p className="text-xs text-emerald-400 font-semibold font-mono">Tanda tangan berhasil dikirim!</p>
                  </div>
                )}

                {signingState === 'error' && signingError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl mb-4 text-rose-350 leading-relaxed text-xs">
                    <ServerCrash className="w-4 h-4 text-rose-455 text-rose-400 mb-1" />
                    <strong>Gagal:</strong> {signingError}
                  </div>
                )}

                {/* Cancel/Dismiss controllers */}
                <div className="flex gap-2 text-xs">
                  <button
                    id="btn-close-web3-modal"
                    onClick={() => setShowWeb3Sign(false)}
                    disabled={signingState !== 'idle' && signingState !== 'error' && signingState !== 'done'}
                    className="w-1/2 py-2 bg-slate-950 hover:bg-slate-850 hover:text-white font-bold rounded-xl text-slate-400 transition-all border border-slate-800"
                  >
                    Batal
                  </button>
                  <button
                    id="btn-dismiss-web3-sign-done"
                    onClick={() => setShowWeb3Sign(false)}
                    className="w-1/2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase rounded-xl transition-all"
                    style={{ display: signingState === 'idle' || signingState === 'error' ? 'none' : 'block' }}
                  >
                    Menutup
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
