const fs = require('fs');

function run() {
  const pbPath = 'C:\\Users\\Anh Tuan\\.gemini\\antigravity\\conversations\\64833b3e-d4f3-415b-b9b5-30336ba8b088.pb';
  if (!fs.existsSync(pbPath)) {
    console.error('File does not exist');
    return;
  }
  const buf = fs.readFileSync(pbPath);
  const text = buf.toString('utf8');
  
  // Match readable Unicode ranges for Vietnamese and ASCII characters
  const rx = /[\sA-Za-z0-9àáâãèéêìíòóôõùúýăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳýỵỷỹÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝĂĐĨŨƠƯẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲÝỴỶỸ.,;:!?()"'đ🗺️💬🤖🍔🍕🥤🍲🥖🍟🍱🍤🍣🥟🍖🍗🥩🍛🍳🧼🧴🪒\-–—+*=><&%#@\n\r\t]+/g;
  const matches = text.match(rx);
  if (matches) {
    const clean = matches.filter(m => m.trim().length > 60);
    fs.writeFileSync('d:\\KI 8\\hanomate\\extracted_long_texts.txt', clean.join('\n\n==========================================\n\n'));
    console.log('Extracted', clean.length, 'long text blocks');
  } else {
    console.log('No matches found');
  }
}

run();
