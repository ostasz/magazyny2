import { drizzle } from 'drizzle-orm/mysql2';

const db = drizzle(process.env.DATABASE_URL);

const prices = await db.execute('SELECT MIN(price_pln_mwh) as min_price, MAX(price_pln_mwh) as max_price, AVG(price_pln_mwh) as avg_price FROM global_rdn_prices');

console.log('RDN Prices:');
console.log(prices[0][0]);
