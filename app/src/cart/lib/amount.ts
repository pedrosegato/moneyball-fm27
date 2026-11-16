export type Amount = (pounds: number) => string;

export const signedAmount = (amount: Amount, v: number, sign: "−" | "+") =>
  v === 0 ? amount(0) : `${sign}${amount(v)}`;
