// Purchase-cost discount guard. Values are rupees, not paise.
// This module is intentionally independent of React and the database.
function validMoney(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function toPaise(value) {
  return Math.max(0, Math.round((Number(value) || 0) * 100));
}

export function productPurchasePrice(product) {
  if (!product || typeof product !== "object") return null;
  const keys = ["purchasePrice", "costPrice", "buyPrice", "buyingPrice", "purchaseAmount"];
  for (const key of keys) {
    const amount = validMoney(product[key]);
    if (amount !== null) return amount;
  }
  // Backward compatibility for older Products with Unit Rate and Sale Price:
  // Unit Rate is treated as the cost floor ONLY when a distinct Sale Price exists.
  if (validMoney(product.salePrice) !== null) return validMoney(product.price);
  return null;
}

export function isServiceProduct(product) {
  const category = String(product?.category ?? "").trim().toLowerCase();
  return category === "service" || category.startsWith("service ") || category.startsWith("services");
}

export function purchasePriceForLine(line, product) {
  const snapshot = validMoney(line?.purchasePrice);
  return snapshot === null ? productPurchasePrice(product) : snapshot;
}

// No purchase cost recorded -> no discount on physical products until configured.
// Services can have discounts without a product purchase cost.
export function maxAllowedLineDiscount(line, product) {
  const qty = Number(line?.qty ?? line?.quantity);
  const rate = Number(line?.price ?? line?.rate);
  if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(rate) || rate < 0) return 0;
  const grossPaise = toPaise(qty * rate);
  if (line?.isService || isServiceProduct(product)) return grossPaise / 100;
  const purchase = purchasePriceForLine(line, product);
  if (purchase === null) return 0;
  const minAmountPaise = Math.ceil(qty * purchase * 100 - 1e-7);
  return Math.max(0, grossPaise - minAmountPaise) / 100;
}

export function lineDiscountError(line, product) {
  const discount = Number(line?.discount || 0);
  const max = maxAllowedLineDiscount(line, product);
  const purchase = purchasePriceForLine(line, product);
  const rate = Number(line?.price ?? line?.rate);
  if (!line?.isService && !isServiceProduct(product) && purchase !== null && Number.isFinite(rate) && rate < purchase - 0.00001) {
    return `Selling rate ₹${rate.toFixed(2)} is below purchase price ₹${purchase.toFixed(2)}.`;
  }
  if (!Number.isFinite(discount) || discount < 0) return "Discount must be a valid, non-negative number.";
  if (discount > max + 0.001) {
    if (!line?.isService && !isServiceProduct(product) && purchasePriceForLine(line, product) === null) {
      return "Enter Purchase Price in Products & Services before applying a discount.";
    }
    return `Discount cannot exceed ₹${max.toFixed(2)} or reduce the product below purchase cost.`;
  }
  return null;
}