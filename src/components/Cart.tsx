import React from 'react';
import { CartItem, CryptoType, Wallet } from '../types';
import { CRYPTO_CONFIGS } from '../data/constants';
import { formatIdr, formatCrypto } from '../utils/cryptoUtils';
import { Trash2, Plus, Minus, ArrowRight, ShieldCheck, Wallet as WalletIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface CartProps {
  items: CartItem[];
  wallet: Wallet;
  selectedCrypto: CryptoType;
  onSelectCrypto: (crypto: CryptoType) => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: () => void;
  cryptoConfigs?: Record<CryptoType, any>;
}

export default function Cart({
  items,
  wallet,
  selectedCrypto,
  onSelectCrypto,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  cryptoConfigs = CRYPTO_CONFIGS
}: CartProps) {
  const totalIdr = items.reduce((sum, item) => sum + item.product.priceIdr * item.quantity, 0);
  const selectedConfig = cryptoConfigs[selectedCrypto] || CRYPTO_CONFIGS[selectedCrypto];
  const totalCrypto = totalIdr / selectedConfig.rateIdr;

  if (items.length === 0) {
    return (
      <div id="cart-empty-state" className="flex flex-col items-center justify-center py-16 text-center bg-slate-900/20 border border-slate-800 border-dashed rounded-3xl p-8">
        <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-2xl mb-4 text-slate-400">
          🛍️
        </div>
        <h3 className="text-base font-semibold text-slate-300">Keranjang Belanja Kosong</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-[280px] font-mono">
          Silakan beralih ke katalog toko dan temukan produk digital menarik untuk dibeli.
        </p>
      </div>
    );
  }

  return (
    <div id="cart-section" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Box listing items (Left 7-columns) */}
      <div className="lg:col-span-7 space-y-3.5">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-display mb-2">Item Di Keranjang</h3>
        
        {items.map((item) => (
          <div
            key={item.product.id}
            id={`cart-item-${item.product.id}`}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-slate-900/30 border border-slate-800 rounded-3xl gap-4"
          >
            {/* Left section: Icon & Title */}
            <div className="flex items-center gap-3.5 min-w-0">
              <span className="text-2xl bg-slate-950 border border-slate-800 w-11 h-11 flex items-center justify-center rounded-2xl shrink-0">
                {item.product.image}
              </span>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-100 truncate pr-2">
                  {item.product.name}
                </h4>
                <p className="text-[11px] text-slate-400 font-bold font-mono">{formatIdr(item.product.priceIdr)}</p>
              </div>
            </div>

            {/* Right section: Quantity controls & Delete */}
            <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 w-full sm:w-auto">
              {/* Quantity Changer */}
              <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800">
                <button
                  id={`btn-cart-dec-${item.product.id}`}
                  onClick={() => onUpdateQuantity(item.product.id, -1)}
                  className="p-1 hover:bg-slate-800 hover:text-white text-slate-400 rounded-lg transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-mono font-bold text-slate-200 px-1 min-w-[14px] text-center">
                  {item.quantity}
                </span>
                <button
                  id={`btn-cart-inc-${item.product.id}`}
                  onClick={() => onUpdateQuantity(item.product.id, 1)}
                  className="p-1 hover:bg-slate-800 hover:text-white text-slate-400 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Subtotal Item & Remove */}
              <div className="text-right min-w-[70px]">
                <p className="text-xs font-bold text-white font-mono">
                  {formatIdr(item.product.priceIdr * item.quantity)}
                </p>
              </div>

              <button
                id={`btn-cart-remove-${item.product.id}`}
                onClick={() => onRemoveItem(item.product.id)}
                className="p-2 hover:bg-rose-500/10 text-slate-500 hover:text-rose-450 rounded-xl transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Box Payment details (Right 5-columns) */}
      <div className="lg:col-span-5 space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-display mb-2">Metode & Integrasi</h3>

        <div className="bg-slate-900/30 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
          {/* Pick Crypto Currency */}
          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 block font-display">
              Pilih Aset Pembayaran Kripto
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(cryptoConfigs) as CryptoType[]).map((coin) => {
                const config = cryptoConfigs[coin] || CRYPTO_CONFIGS[coin];
                const active = selectedCrypto === coin;

                return (
                  <button
                    key={coin}
                    id={`btn-select-crypto-${coin.toLowerCase()}`}
                    onClick={() => onSelectCrypto(coin)}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl text-left transition-all border ${
                      active
                        ? 'bg-slate-950 border-indigo-505 border-indigo-500/80 text-white'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[9px] uppercase ${
                      active ? 'bg-indigo-650 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {config.logo}
                    </span>
                    <div>
                      <p className="text-xs font-bold">{coin}</p>
                      <p className="text-[9px] text-slate-500 truncate leading-none mt-0.5 font-mono">{config.name}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Network details snippet */}
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
            <div className="flex justify-between text-xs mb-1 font-mono">
              <span className="text-slate-500">Jaringan Transfer:</span>
              <span className="font-bold text-slate-300">
                {selectedConfig.network}
              </span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-500">Kurs Konversi:</span>
              <span className="font-bold text-slate-300">
                1 {selectedCrypto} ≈ {formatIdr(selectedConfig.rateIdr)}
              </span>
            </div>
          </div>

          {/* Checkout summary math */}
          <div className="pt-3.5 border-t border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Subtotal Belanja</span>
              <span className="font-mono">{formatIdr(totalIdr)}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Biaya Jaringan/Gas (Demo)</span>
              <span className="text-emerald-400 font-bold font-mono">Gratis</span>
            </div>
            <div className="pt-3 border-t border-slate-800 flex justify-between items-baseline">
              <span className="text-xs font-semibold text-slate-300">Total Pembayaran</span>
              <div className="text-right">
                <p className="text-lg font-bold text-white leading-none mb-1 font-mono">
                  {formatIdr(totalIdr)}
                </p>
                <p className="text-sm font-mono font-bold text-indigo-400">
                  ≈ {formatCrypto(totalCrypto, selectedCrypto)}
                </p>
              </div>
            </div>
          </div>

          {/* Wallet connection reminder */}
          {!wallet.connected ? (
            <div className="bg-amber-500/5 border border-amber-500/15 p-3.5 rounded-2xl flex items-start gap-2.5">
              <WalletIcon className="w-4.5 h-4.5 text-amber-505 text-amber-505 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-[10px] text-amber-400 leading-normal">
                <strong>Wallet Anda belum terhubung.</strong> Anda tetap bisa membuat invoice pembayaran dan mentransfer aset secara manual ke QR Code alamat deposit.
              </div>
            </div>
          ) : (
            <div className={`p-3.5 rounded-2xl flex items-start gap-2.5 border ${
              wallet.balances[selectedCrypto] >= totalCrypto
                ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400'
                : 'bg-rose-500/5 border-rose-500/15 text-rose-450'
            }`}>
              <ShieldCheck className="w-4.5 h-4.5 shrink-0 mt-0.5" />
              <div className="text-[10px] leading-normal">
                {wallet.balances[selectedCrypto] >= totalCrypto ? (
                  <span>
                    Saldo wallet <strong>{wallet.name}</strong> Anda mencukupi! Anda bisa melunasi pesanan secara instan via Metamask signing di halaman invoice.
                  </span>
                ) : (
                  <span>
                    Saldo {selectedCrypto} Anda di <strong>{wallet.name}</strong> tidak mencukupi (Tersedia: {wallet.balances[selectedCrypto]} {selectedCrypto}). Silakan isi ulang saldo Anda via menu wallet di atas.
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action button */}
          <button
            id="btn-process-checkout"
            onClick={onCheckout}
            className="w-full flex items-center justify-between bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-650 text-white py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all transform active:scale-[0.98] shadow-md shadow-indigo-600/10"
          >
            <span className="pl-4">Buat Invoice Pembayaran</span>
            <span className="pr-4 flex items-center gap-1 font-mono">
              <span>{formatCrypto(totalCrypto, selectedCrypto)}</span>
              <ArrowRight className="w-4 h-4" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
