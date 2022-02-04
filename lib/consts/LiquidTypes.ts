type MyLiquidBalances = {
  trusted: Record<string, number>,
  untrusted_pending: Record<string, number>,
};

export type LiquidBalances = {
  mine: MyLiquidBalances,
};
