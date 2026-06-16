export function getQualityMultiplier(rating: number | null, reviewCount: number | null) {
  if (rating == null || reviewCount == null) return 1.03;
  if (reviewCount < 10) return 1;
  if (rating >= 4.5) return 0.95;
  if (rating >= 4.0) return 1;
  if (rating < 3.8) return 1.05;
  return 1;
}

export function calculateScore(product: {
  price: number;
  rolls_per_pack: number | null;
  sheets_per_roll: number | null;
  delivery_fee: number | null;
  small_order_charge: number | null;
  rating: number | null;
  review_count: number | null;
}) {
  if (!product.rolls_per_pack || !product.sheets_per_roll) return null;

  const totalSheets = product.rolls_per_pack * product.sheets_per_roll;
  const deliveredPrice =
    product.price + (product.delivery_fee ?? 0) + (product.small_order_charge ?? 0);

  const pricePer100Sheets = (deliveredPrice / totalSheets) * 100;
  const qualityMultiplier = getQualityMultiplier(product.rating, product.review_count);

  return {
    totalSheets,
    deliveredPrice,
    pricePer100Sheets,
    qualityMultiplier,
    adjustedValueScore: pricePer100Sheets * qualityMultiplier,
  };
}