const fs = require('fs');

function run() {
  const pbPath = 'C:\\Users\\Anh Tuan\\.gemini\\antigravity\\conversations\\64833b3e-d4f3-415b-b9b5-30336ba8b088.pb';
  if (!fs.existsSync(pbPath)) {
    console.error('File does not exist');
    return;
  }
  const buf = fs.readFileSync(pbPath);
  let out = '';
  let start = -1;
  
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    // Printable ASCII, tab, newline, carriage return, or UTF-8 continuation/lead bytes
    const isPrintable = (b >= 32 && b <= 126) || b === 9 || b === 10 || b === 13 || b >= 0x80;
    if (isPrintable) {
      if (start === -1) start = i;
    } else {
      if (start !== -1) {
        const len = i - start;
        if (len > 30) {
          const slice = buf.slice(start, i);
          const text = slice.toString('utf8');
          if (text.trim().length > 30) {
            out += text + '\n==========================================\n';
          }
        }
        start = -1;
      }
    }
  }
  fs.writeFileSync('d:\\KI 8\\hanomate\\extracted_pb_clean.txt', out);
  console.log('Clean extraction complete');
}

run();
