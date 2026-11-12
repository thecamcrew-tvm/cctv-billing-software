
"use client";

import { useMemo, useState } from "react";
import { Search, Package, Plus } from "lucide-react";

export default function ProductCatalogSearch({
  products = [],
  onSelect,
}) {
  const [search, setSearch] = useState("");

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return products.slice(0, 10);

    return products
      .filter((product) => {
        const number = String(
          product.productNumber ?? product.code ?? ""
        ).toLowerCase();

        const name = String(
          product.productName ?? product.name ?? ""
        ).toLowerCase();

        return (
          number.includes(query) ||
          name.includes(query)
        );
      })
      .slice(0, 20);
  }, [products, search]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-800">
        <Package size={18} />
        Search Products
      </h3>

      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-3 text-slate-400"
        />

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search product number or name..."
          className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 outline-none focus:border-teal-500"
        />
      </div>

      <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
        {filteredProducts.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">
            No products found.
          </p>
        ) : (
          filteredProducts.map((product, index) => (
            <button
              key={
                product.id ??
                product.productNumber ??
                index
              }
              type="button"
              onClick={() => {
                onSelect?.(product);
                setSearch("");
              }}
              className="flex w-full items-center justify-between rounded-lg border border-slate-100 p-3 text-left transition hover:bg-teal-50"
            >
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {product.productName ??
                    product.name ??
                    "Unnamed Product"}
                </p>

                <p className="text-xs text-slate-500">
                  #{product.productNumber ??
                    product.code ??
                    "N/A"}
                </p>
              </div>

              <Plus size={18} className="text-teal-600" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
