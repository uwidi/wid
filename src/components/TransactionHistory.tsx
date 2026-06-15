import React, { useState } from 'react';
import { Transaction, Invoice } from '../types';
import { formatIdr, formatCrypto, shortenAddress } from '../utils/cryptoUtils';
import { CRYPTO_CONFIGS } from '../data/constants';
import { 
  FileText, ExternalLink, Calendar, CheckCircle2, TrendingUp, Copy, Check, ArrowUpRight, Search, Receipt
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TransactionHistoryProps {
  transactions: Transaction[];
}

export default function TransactionHistory({ transactions }: TransactionHistoryProps) {
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [copiedTx, setCopiedTx] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const triggerCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTx(type);
    setTimeout(() => setCopiedTx(null), 2000);
  };

  const filteredTransactions = transactions.filter(tx => 
    tx.txHash.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.productNames.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.cryptoType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="transaction-history-section" className="space-y-6">
      {/* Overview Stat Counters Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Belanja IDR Equivalent */}
        <div className="bg-slate-900/30 border border-slate-800 p-5 rounded-3xl shadow-sm">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-display">Total Volume Belanja</p>
          <p className="text-xl font-bold text-white mt-1 font-mono">
            {formatIdr(transactions.reduce((acc, curr) => acc + curr.amountIdr, 0))}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Dikonversi dalam Rupiah</p>
        </div>

        {/* Total Invoices Completed */}
        <div className="bg-slate-900/30 border border-slate-800 p-5 rounded-3xl shadow-sm">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-display">Transaksi Sukses</p>
          <p className="text-xl font-bold text-indigo-400 mt-1 font-mono">
            {transactions.filter(t => t.status === 'SUCCESS').length} Items
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Seluruh blok tervalidasi sukses</p>
        </div>

        {/* Favorite Crypto Coin based on count */}
        <div className="bg-slate-900/30 border border-slate-800 p-5 rounded-3xl shadow-sm">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-display">Metode Terpopuler</p>
          <p className="text-xl font-bold text-indigo-400 mt-1 font-mono">
            {transactions.length > 0 
              ? [...transactions].reduce((acc, curr) => {
                  acc[curr.cryptoType] = (acc[curr.cryptoType] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>) && Object.entries(
                  [...transactions].reduce((acc, curr) => {
                    acc[curr.cryptoType] = (acc[curr.cryptoType] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A'
              : 'N/A'
            }
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Aset pembayaran dominan saat ini</p>
        </div>
      </div>

      {/* List Controller Filter */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          id="input-tx-search"
          type="text"
          placeholder="Cari berdasarkan TxHash, nama produk, atau koin..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900/30 border border-slate-800 text-xs pl-10 pr-4 py-3 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-550/80 transition-colors"
        />
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/10 border border-slate-800 border-dashed rounded-3xl">
          <span className="text-2xl">📊</span>
          <p className="text-sm font-semibold text-slate-300 mt-3 font-display">Belum Ada Transaksi</p>
          <p className="text-xs text-slate-500 mt-1 font-mono">Transaksi Anda yang sukses di blockchain simulator akan muncul sebagai entri di sini.</p>
        </div>
      ) : (
        <div className="bg-slate-900/30 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          {/* Desktop Table view header */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-400">
              <thead className="bg-slate-950 text-[10px] text-slate-405 uppercase tracking-wider border-b border-slate-800 font-bold select-none font-display">
                <tr>
                  <th className="py-3 px-5 text-slate-500">Waktu</th>
                  <th className="py-3 px-4 text-slate-500">Item Pembelian</th>
                  <th className="py-3 px-4 text-slate-500">Metode Crypto</th>
                  <th className="py-3 px-4 font-mono text-slate-500">TxHash</th>
                  <th className="py-3 px-4 text-right text-slate-500">Nominal IDR</th>
                  <th className="py-3 px-5 text-right text-slate-500">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredTransactions.map((tx) => {
                  const cfg = CRYPTO_CONFIGS[tx.cryptoType];
                  const formattedTime = new Date(tx.timestamp).toLocaleString('id-ID', {
                    hour: 'numeric',
                    minute: 'numeric',
                    second: 'numeric',
                    day: 'numeric',
                    month: 'short'
                  });

                  return (
                    <tr key={tx.id} id={`tx-row-${tx.id}`} className="hover:bg-slate-900/40 transition-colors group">
                      {/* DateTime */}
                      <td className="py-4 px-5 whitespace-nowrap text-slate-300 font-medium font-mono">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-550 text-slate-500" />
                          <span>{formattedTime}</span>
                        </div>
                      </td>

                      {/* Items title */}
                      <td className="py-4 px-4 min-w-[150px] max-w-[200px] truncate">
                        <span className="text-slate-200 font-semibold leading-normal block group-hover:text-indigo-400 transition-colors">
                          {tx.productNames}
                        </span>
                      </td>

                      {/* Crypto payload */}
                      <td className="py-4 px-4 whitespace-nowrap font-mono text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full bg-slate-950 text-[9px] font-bold text-center flex items-center justify-center text-indigo-400 border border-slate-805">
                            {cfg.logo}
                          </span>
                          <span className="text-slate-200">
                            {formatCrypto(tx.amountCrypto, tx.cryptoType)}
                          </span>
                        </div>
                      </td>

                      {/* Transaction hash */}
                      <td className="py-4 px-4 whitespace-nowrap font-mono">
                        <span className="text-slate-500 font-medium">
                          {shortenAddress(tx.txHash, 6)}
                        </span>
                      </td>

                      {/* IDR value */}
                      <td className="py-4 px-4 whitespace-nowrap text-right font-semibold text-white font-mono text-[11px]">
                        {formatIdr(tx.amountIdr)}
                      </td>

                      {/* Detail action */}
                      <td className="py-4 px-5 whitespace-nowrap text-right">
                        <button
                          id={`btn-view-tx-receipt-${tx.id}`}
                          onClick={() => setSelectedTx(tx)}
                          className="p-1 px-2.5 bg-slate-950 hover:bg-slate-850 text-indigo-400 hover:text-indigo-300 rounded-lg border border-slate-800 text-[9px] uppercase font-bold tracking-wider inline-flex items-center gap-1 transition-all"
                        >
                          <Receipt className="w-3 h-3 text-indigo-400" />
                          <span>Nota</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Receipt Modal Overlay Pop */}
      <AnimatePresence>
        {selectedTx && (
          <>
            <div className="fixed inset-0 z-55 bg-slate-955/80 backdrop-blur-xs" onClick={() => setSelectedTx(null)} />
            
            <div className="fixed inset-0 flex items-center justify-center p-4 z-[56]">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 text-white text-sm"
              >
                {/* Visual Seal Stamp */}
                <div className="flex flex-col items-center text-center pb-4 border-b border-dashed border-slate-800 mb-4">
                  <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/35 text-emerald-405 text-emerald-400 rounded-full flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h4 className="text-sm font-bold text-white tracking-wider font-display uppercase">Kwitansi Blockchain Berhasil</h4>
                  <p className="text-xs text-slate-400 mt-1 font-mono">Pembayaran Terkonfirmasi Miner</p>
                </div>

                {/* Body metadata */}
                <div className="space-y-3 pb-4 border-b border-slate-850/60 mb-4 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">ID Transaksi / Hash:</span>
                    <button
                      onClick={() => triggerCopy(selectedTx.txHash, 'HASH')}
                      className="font-mono text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                    >
                      <span className="truncate max-w-[150px]">{shortenAddress(selectedTx.txHash, 8)}</span>
                      {copiedTx === 'HASH' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Waktu Validasi:</span>
                    <span className="text-slate-300">{new Date(selectedTx.timestamp).toLocaleString('id-ID')}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500 font-mono">Item Dibeli:</span>
                    <span className="text-slate-200 font-bold max-w-[180px] break-words text-right">{selectedTx.productNames}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Jaringan Blockchain:</span>
                    <span className="text-slate-300 font-mono text-xs font-bold">{CRYPTO_CONFIGS[selectedTx.cryptoType]?.network}</span>
                  </div>
                </div>

                {/* Math box total */}
                <div className="bg-slate-950 p-4 rounded-2xl space-y-2 border border-slate-800">
                  <div className="flex justify-between text-xs text-slate-500 font-mono">
                    <span>Kurs Konversi</span>
                    <span>1 {selectedTx.cryptoType} ≈ {formatIdr(CRYPTO_CONFIGS[selectedTx.cryptoType]?.rateIdr)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold pt-1 font-mono">
                    <span>Total Pembayaran Crypto</span>
                    <span className="text-indigo-400 font-mono font-bold font-mono">
                      {formatCrypto(selectedTx.amountCrypto, selectedTx.cryptoType)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 font-medium pt-1 border-t border-slate-850 font-mono">
                    <span>Setara Rupiah Utama</span>
                    <span className="font-bold text-white">{formatIdr(selectedTx.amountIdr)}</span>
                  </div>
                </div>

                {/* Footer disclaimer */}
                <div className="mt-5 text-center">
                  <button
                    id="btn-close-tx-receipt"
                    onClick={() => setSelectedTx(null)}
                    className="w-full py-2.5 bg-slate-950 hover:bg-slate-850 text-xs font-bold uppercase rounded-2xl transition-all font-mono hover:text-white border border-slate-800"
                  >
                    Tutup Nota Resi
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
