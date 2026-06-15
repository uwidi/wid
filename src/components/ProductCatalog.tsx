import React, { useState, useMemo } from 'react';
import { Product, CryptoType } from '../types';
import { CRYPTO_CONFIGS } from '../data/constants';
import { formatIdr, formatCrypto } from '../utils/cryptoUtils';
import { Search, ShoppingCart, Info, TrendingUp, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface ProductCatalogProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
}

export default function ProductCatalog({ products, onAddToCart }: ProductCatalogProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);

  // Extract unique categories
  const categories = useMemo(() => {
    const list = new Set(products.map((p) => p.category));
    return ['Semua', ...Array.from(list)];
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.description.toLowerCase().includes(search.toLowerCase());
      const matchCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [products, search, selectedCategory]);

  return (
    <div id="product-catalog-section" className="space-y-6">
      {/* Search & Filter Header bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900/30 p-4 border border-slate-800 rounded-3xl">
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
          <input
            id="input-product-search"
            type="text"
            placeholder="Cari produk futuristik..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 text-xs pl-11 pr-4 py-2.5 rounded-xl text-white placeholder-slate-550 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Categories Scroller */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              id={`btn-category-${cat.toLowerCase().replace(/\s/g, '-')}`}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl shrink-0 transition-all ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Products */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/10 border border-slate-800 border-dashed rounded-3xl">
          <span className="text-3xl">🔍</span>
          <p className="text-base font-semibold text-slate-300 mt-3">Produk Tidak Ditemukan</p>
          <p className="text-xs text-slate-500 mt-1 font-mono">Coba gunakan kata kunci pencarian atau kategori lain.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            // Equivalent rates preview for selected cryptos
            const btcEq = product.priceIdr / CRYPTO_CONFIGS.BTC.rateIdr;
            const solEq = product.priceIdr / CRYPTO_CONFIGS.SOL.rateIdr;
            const usdtEq = product.priceIdr / CRYPTO_CONFIGS.USDT.rateIdr;

            const isHovered = hoveredProduct === product.id;

            return (
              <motion.div
                key={product.id}
                layout
                id={`product-card-${product.id}`}
                className="group relative flex flex-col justify-between bg-slate-900/30 border border-slate-800 hover:border-indigo-500/30 rounded-3xl overflow-hidden transition-all duration-300 p-6 shadow-sm"
                onMouseEnter={() => setHoveredProduct(product.id)}
                onMouseLeave={() => setHoveredProduct(null)}
              >
                <div>
                  {/* Category & Badge */}
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-xl text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      {product.category}
                    </span>
                    {product.stock <= 5 && (
                      <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-[9px] font-bold text-rose-450">
                        Sisa {product.stock} pcs
                      </span>
                    )}
                  </div>

                  {/* Icon Representation */}
                  <div className="w-16 h-16 flex items-center justify-center text-3xl rounded-2xl bg-gradient-to-br from-slate-950 to-slate-950/40 border border-slate-800/60 group-hover:from-indigo-500/10 group-hover:to-indigo-500/5 group-hover:border-indigo-500/30 transition-all duration-300 mb-4 scale-100 group-hover:scale-[1.03]">
                    {product.image}
                  </div>

                  {/* Info */}
                  <h3 className="font-display font-bold text-base text-slate-100 line-clamp-1 mb-1.5 group-hover:text-indigo-400 transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-normal leading-relaxed line-clamp-3 mb-4 h-13">
                    {product.description}
                  </p>

                  {/* Price */}
                  <div className="pt-2 mb-4 border-t border-slate-800">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-display">Harga Utama</p>
                    <p className="text-base font-bold text-white tracking-tight">{formatIdr(product.priceIdr)}</p>
                  </div>

                  {/* Crypto equivalents dynamic panel */}
                  <div className="bg-slate-950 rounded-2xl p-3 mb-4 border border-slate-800/80">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                      <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wide">Estimasi Kurs Kripto</p>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      <div className="bg-slate-900 border border-slate-800/80 p-1 rounded-xl">
                        <p className="text-[8px] font-bold text-amber-500 font-mono">BTC</p>
                        <p className="text-[10px] font-mono text-slate-300 font-bold">{btcEq.toFixed(5)}</p>
                      </div>
                      <div className="bg-slate-900 border border-slate-800/80 p-1 rounded-xl">
                        <p className="text-[8px] font-bold text-emerald-400 font-mono">SOL</p>
                        <p className="text-[10px] font-mono text-slate-300 font-bold">{solEq.toFixed(1)}</p>
                      </div>
                      <div className="bg-slate-900 border border-slate-800/80 p-1 rounded-xl">
                        <p className="text-[8px] font-bold text-indigo-400 font-mono">USDT</p>
                        <p className="text-[10px] font-mono text-white font-bold">{Math.round(usdtEq)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Add to Cart button */}
                <button
                  id={`btn-add-to-cart-${product.id}`}
                  onClick={() => onAddToCart(product)}
                  disabled={product.stock === 0}
                  className={`w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider mt-auto transform active:scale-95 transition-all ${
                    product.stock === 0
                      ? 'bg-slate-900 text-slate-600 border border-slate-850 cursor-not-allowed'
                      : 'bg-slate-900 hover:bg-indigo-600 text-white border border-slate-800 hover:border-indigo-500 transition-colors shadow-sm'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4 shrink-0 transition-transform group-hover:rotate-6" />
                  <span>{product.stock === 0 ? 'Habis' : 'Tambah Ke Keranjang'}</span>
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
