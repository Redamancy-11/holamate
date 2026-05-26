const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const { pool } = require('../config/pg');

const ids = [
  'the-broker-coffee',
  'cafe-bao-cap',
  'tiệm-cà-phê-lạc',
  'twitter-beans-coffee',
  'twitter-beans',
  'quang-vinh-quán-cơm',
  'saigon-block',
  'bún-đậu-mắm-tôm-hoà-lạc',
  'gà-rán-jinju',
  'com-tam-sai-gon',
  'trà-sữa-mon',
  'trà-sữa-đô-đô',
  'trà-sữa-gaucha',
  'highland-coffee',
  'highlands-coffee',
  'coffee-bao-cap',
  'cafe-bao-cap',
  'son-tay',
];

(async () => {
  for (const id of ids) {
    const r = await pool.query('SELECT id, name, category, menu FROM vendors WHERE id = $1', [id]);
    if (r.rows.length) {
      const v = r.rows[0];
      const menuNames = (v.menu || []).map(m => `${m.name} (${m.price}đ)`).join(' | ');
      console.log('===', v.name, `[${v.category}]`, '===');
      console.log('Menu:', menuNames);
      console.log('');
    }
  }
  process.exit(0);
})();
