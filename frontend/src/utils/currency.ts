/**
 * Utility functions for converting between display units and smallest units
 * Using NO decimals for simple 1:1 pricing (real-world scenario)
 * 1 Unit = 1 smallest unit
 *
 * Examples:
 * - 50 Unit = 50 smallest units (like $50)
 * - 100 Unit = 100 smallest units (like $100)
 * - 10 Unit = 10 smallest units (like $10)
 */

const DECIMALS = 0;
const DECIMAL_MULTIPLIER = 10 ** DECIMALS; // = 1

/**
 * Convert from display units (SBY) to smallest units (planck)
 * Example: 1.9 SBY -> 1900000000000000000
 */
export const toSmallestUnit = (amount: string | number): bigint => {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  return BigInt(Math.floor(numAmount * DECIMAL_MULTIPLIER));
};

/**
 * Convert from smallest units (planck) to display units (SBY)
 * Example: 1900000000000000000 -> "1.9"
 */
export const fromSmallestUnit = (amount: string | number | bigint): string => {
  let amountBigInt: bigint;

  if (typeof amount === "bigint") {
    amountBigInt = amount;
  } else if (typeof amount === "string") {
    // Remove commas if present
    amountBigInt = BigInt(amount.replace(/,/g, ""));
  } else {
    amountBigInt = BigInt(amount);
  }

  // Convert to number and divide
  const displayAmount = Number(amountBigInt) / DECIMAL_MULTIPLIER;

  // Format with up to 4 decimal places, removing trailing zeros
  return displayAmount.toFixed(4).replace(/\.?0+$/, "");
};

/**
 * Format currency for display with token symbol
 * Uses "Unit" for local node, "DOT" for display purposes
 */
export const formatCurrency = (amount: string | number | bigint): string => {
  return `${fromSmallestUnit(amount)} Unit`;
};
