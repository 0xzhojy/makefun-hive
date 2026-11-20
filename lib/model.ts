// Values are a transparent scenario, not an airdrop prediction.
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y), i = Math.floor(s.length / 2);
  return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2;
};
const noToken = (p: any) => !p.gecko_id && !p.symbol && !(p.mcap_usd > 0);
function plan(p: any, age: number | null): string[] {
  const chain = p.chains[0] || 'the supported chain';
  const cat = (p.category || '').toLowerCase();
  const capital = p.tvl_usd >= 1e9 ? 150 : 50;
  const action = /lend|cdp/.test(cat) ? 'supply a small amount to a lending market' : /dex/.test(cat) ? 'make a small swap; consider a liquid pool only after checking impermanent loss' : /bridge/.test(cat) ? 'bridge a small amount and verify its arrival' : /perpetual|derivative/.test(cat) ? 'make a small trade without leverage if available' : /staking|restaking/.test(cat) ? 'stake a small amount only after checking the unbonding period' : /yield|vault|curator/.test(cat) ? 'deposit a small amount in a vault after reviewing its strategy' : 'try the core product with a small position if it is open to users';
  const days = age === null || age < 365 ? 60 : 30;
  return [
    `Find ${p.name}'s official app independently and verify its ${chain} deployment and eligibility in your jurisdiction. Cost: $0. Time: 10 minutes.`,
    `Fund a separate wallet on ${chain} with about $${capital} and native gas; never disclose the seed phrase. Cost: $${capital} at risk plus variable network fees. Time: 10 minutes.`,
    `On ${p.name}, ${action}. Cost: up to $${capital} exposed plus variable fees and slippage. Time: 15 minutes.`,
    `Revisit weekly for ${days} days, using a relevant feature only if useful; record transactions and check withdrawal conditions. Cost: variable gas, budget $2 per visit. Time: 10 minutes weekly.`,
    `Review official rewards information and unwind when appropriate; no eligibility or token launch is guaranteed. Cost: variable exit fees. Time: 15 minutes.`
  ];
}
export function build(snapshot: any) {
  const groups = new Map<string, number[]>();
  for (const p of snapshot.protocols) {
    if (p.mcap_usd > 0 && p.tvl_usd > 0) {
      const k = p.category || 'Unclassified';
      groups.set(k, [...(groups.get(k) || []), p.mcap_usd / p.tvl_usd]);
    }
  }
  const watch = new Set(snapshot.watchlist);
  const rows = snapshot.protocols.filter((p: any) => noToken(p) || watch.has(p.slug)).map((p: any) => {
    const peers = groups.get(p.category || 'Unclassified') || [];
    // A single peer remains visible but lowers confidence; no peer uses 1.0x.
    const multiple = peers.length ? median(peers) : 1;
    const age = p.listed_at && Number.isFinite(Date.parse(p.listed_at)) ? Math.max(0, Math.floor((Date.parse(snapshot.as_of) - Date.parse(p.listed_at)) / 86400000)) : null;
    const growth = clamp(p.change_7d ?? 0, -50, 50);
    const momentum = 1 + growth / 200;
    const maturity = 0.75 + 0.25 * Math.min(age ?? 365, 730) / 730;
    const breadth = 1 + 0.05 * Math.min(Math.max(p.chains.length - 1, 0), 4);
    const implied = Math.max(1, Math.round(p.tvl_usd * multiple * momentum * maturity * breadth));
    const confidence = peers.length >= 3 && p.change_7d !== null && age !== null && p.chains.length ? 'Higher' : peers.length && p.change_7d !== null && age !== null ? 'Medium' : 'Limited';
    return {...p, watchlist: watch.has(p.slug), age_days: age, implied_value_usd: implied, confidence, model: {multiple, peer_count: peers.length, growth, momentum, maturity, breadth}, farm_steps: plan(p, age)};
  }).sort((a: any,b: any) => b.implied_value_usd - a.implied_value_usd || a.slug.localeCompare(b.slug));
  rows.forEach((r: any, i: number) => r.rank = i + 1);
  const live = snapshot.protocols.filter((p: any) => !noToken(p) && !watch.has(p.slug)).map((p: any) => ({...p, implied_value_usd: p.mcap_usd > 0 ? p.mcap_usd : null})).sort((a: any,b: any) => (b.mcap_usd || 0) - (a.mcap_usd || 0));
  return {as_of: snapshot.as_of, source: snapshot.source, watchlist_size: watch.size, rows, live};
}
