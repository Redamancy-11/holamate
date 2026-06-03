const fs = require('fs');
const path = require('path');
const { pool } = require('../config/pg');

const OVERRIDE_PATH = path.resolve(__dirname, '../data/local_vendors_override.json');
const CSV_PATH = path.resolve(__dirname, '../data_import/vendors_template.csv');

// Seedable random helper (Mulberry32)
function createRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return function() {
    let t = h += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates shuffle using seedable random
function shuffleArray(array, rng) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Master lists of items
const BASE_POOLS = {
  bun_bo_hue: {
    mains: [
      { name: "Bún Bò Huế Tái Nạm Gân", price: 40000, desc: "Bún sợi to bò Huế thơm ngon bắp bò tái nạm bò cùng gân giòn sần sật." },
      { name: "Bún Bò Huế Chả Cua Thịt Chín", price: 35000, desc: "Tô bún bò Huế kèm chả cua viên thơm bùi và thịt gầu nạm bò chín mềm." },
      { name: "Bún Bò Huế Sườn Sụn Non", price: 40000, desc: "Sườn sụn non heo giòn dai ninh nhừ trong nước dùng cay nồng hương sả." },
      { name: "Bún Bò Huế Móng Giò Heo", price: 40000, desc: "Móng giò heo luộc nhừ béo ngậy ăn cùng nước lèo chua cay đúng điệu." },
      { name: "Bún Bò Huế Bắp Bò Hoa", price: 45000, desc: "Thịt bắp bò hoa giòn ngọt thái mỏng trần chín tái hấp dẫn." },
      { name: "Bún Bò Huế Đuôi Bò Hầm", price: 50000, desc: "Khúc đuôi bò hầm nhừ ngọt tủy ngậy béo thơm nồng nước dùng." },
      { name: "Bún Bò Huế Đặc Biệt đầy đủ", price: 50000, desc: "Tô bún bò đầy đủ giò heo, tiết hầm, chả cua, thịt tái nạm và gân bò." }
    ],
    sides: [
      { name: "Quẩy giòn rụm chấm nước béo", price: 3000, desc: "Một chiếc quẩy chiên giòn để nhúng nước dùng bún nóng hổi." },
      { name: "Trứng chần hành lá lòng đào", price: 7000, desc: "Trứng gà chần nước dùng hành trần béo ngậy bổ dưỡng." },
      { name: "Viên chả cua Huế gọi thêm", price: 8000, desc: "Chả cua viên đặc sản thơm ngậy giòn sần sật." },
      { name: "Móng giò heo ninh thêm (1 cái)", price: 12000, desc: "Giò khoanh luộc mềm thêm cho tô bún nhiều thịt." },
      { name: "Đĩa thịt bò trần gọi thêm", price: 20000, desc: "Thêm bò tái hoặc bò chín nạm cho thực khách ăn khỏe." }
    ],
    drinks: [
      { name: "Nước quất đá đường mát lạnh", price: 12000, desc: "Nước quất tươi vắt thơm dịu giải nhiệt giải cay." },
      { name: "Sữa đậu nành đá lạnh", price: 15000, desc: "Sữa đậu nành nguyên chất thơm béo thanh ngọt." },
      { name: "Trà đá Thái Nguyên truyền thống", price: 3000, desc: "Trà đá giải khát sinh viên mát lạnh bình dân." }
    ]
  },
  pho: {
    mains: [
      { name: "Phở Bò Tái chín truyền thống", price: 35000, desc: "Bánh phở tươi mềm mỏng, bò tái chín ngọt ngào hầm xương trong vắt." },
      { name: "Phở Bò Tái Lăn cháy tỏi", price: 45000, desc: "Thịt bò xào lăn tỏi thơm lừng cháy cạnh rưới nước béo ngậy." },
      { name: "Phở Bò Sốt Vang đậm đà", price: 40000, desc: "Thịt bò sốt vang gân mềm nhừ rắc hành ngò thơm nức mũi." },
      { name: "Phở Bò Gầu Nạm giòn bùi", price: 40000, desc: "Thịt gầu nạc mỡ đan xen giòn sần sật béo ngậy quyện nước phở ngon." },
      { name: "Phở Gà Ta Xé lá chanh", price: 35000, desc: "Thịt gà ta da vàng giòn xé nhỏ hành hoa chanh thái chỉ thơm thanh mát." },
      { name: "Phở Gà Đùi Cánh đặc sắc", price: 45000, desc: "Đùi gà ta cánh gà ta chắc ngọt nước dùng trong vắt thanh dịu." },
      { name: "Phở Gà Lòng Mề Trứng Non", price: 45000, desc: "Phở gà kèm lòng mề trứng non chần béo ngậy hấp dẫn." },
      { name: "Phở Bò Viên gân giòn rụm", price: 35000, desc: "Bò viên gân tiêu đen giòn dai đậm vị bò tự nhiên." },
      { name: "Phở Bò Thập Cẩm đặc biệt", price: 50000, desc: "Tô phở ngập tràn bò tái, bò chín, nạm gầu và bò viên thơm ngon." }
    ],
    sides: [
      { name: "Đĩa quẩy giòn phở (3 cái)", price: 10000, desc: "Quẩy phở vàng giòn xốp rụm nhúng canh ngọt lịm." },
      { name: "Trứng gà chần lòng đào", price: 7000, desc: "Trứng chần nước dùng hành chần béo ngậy." },
      { name: "Đĩa thịt gà xé gọi thêm", price: 20000, desc: "Thêm thịt gà xé da giòn cho tô phở ngập thịt." },
      { name: "Đĩa đầu hành lá trần nước béo", price: 5000, desc: "Hành trần ngọt ngào nhúng mỡ hành phở." }
    ],
    drinks: [
      { name: "Nước nhân trần đá mát giải nhiệt", price: 5000, desc: "Nước nhân trần thanh mát ngọt hậu giải nhiệt." },
      { name: "Coca-Cola lon lạnh", price: 15000, desc: "Nước ngọt có ga ướp đá lạnh cực mát." },
      { name: "Trà đá Thái Nguyên mát lạnh", price: 3000, desc: "Trà đá bình dân giải khát." }
    ]
  },
  bun_dau: {
    mains: [
      { name: "Mẹt Bún Đậu Đầy Đủ mẹt lớn", price: 45000, desc: "Đầy đủ đậu rán giòn, thịt chân giò luộc, chả cốm, nem chua rán, lòng dồi heo rán." },
      { name: "Mẹt Bún Đậu Chả Cốm Hà Nội", price: 35000, desc: "Mẹt bún lá, đậu chiên giòn ăn kèm chả cốm rán nóng hổi dẻo thơm." },
      { name: "Mẹt Bún Đậu Chân Giò Luộc thái mỏng", price: 35000, desc: "Thịt chân giò rút xương luộc mềm ngọt thái mỏng béo ngậy." },
      { name: "Mẹt Bún Đậu Lòng Dồi Sụn chiên", price: 40000, desc: "Mẹt đậu bún lá ăn kèm lòng non luộc dồi sụn chiên thơm lừng lá mơ." },
      { name: "Mẹt Bún Đậu Nem Chua Rán giòn", price: 35000, desc: "Bún đậu rán giòn ăn kèm nem chua bọc bột chiên giòn rụm." },
      { name: "Mẹt Bún Đậu Chay thanh tịnh", price: 25000, desc: "Chỉ gồm bún lá đậu hũ rán giòn chấm tương bần hoặc mắm tôm chay." }
    ],
    sides: [
      { name: "Đĩa đậu hũ chiên giòn nóng hổi thêm", price: 12000, desc: "Đậu mơ chiên giòn ngoài mềm trong thơm ngậy rán thêm." },
      { name: "Đĩa chả cốm chiên thêm (1 cái)", price: 15000, desc: "Chả cốm dẻo bùi thơm cốm xanh Hà Nội rán thêm." },
      { name: "Đĩa thịt chân giò thái mỏng thêm", price: 20000, desc: "Thịt chân giò luộc thêm đĩa đầy đặn." },
      { name: "Đĩa lòng dồi sụn nướng rán thêm", price: 20000, desc: "Dồi sụn non rán thơm lừng giòn sần sật thêm." },
      { name: "Nem chua rán giòn gọi thêm", price: 15000, desc: "Nem chua rán giòn rụm chấm tương ớt." },
      { name: "Bún lá tươi ăn thêm đĩa", price: 5000, desc: "Đĩa bún lá cắt miếng vuông ăn thêm." }
    ],
    drinks: [
      { name: "Trà quất đá siêu to khổng lồ", price: 15000, desc: "Trà tắc chua ngọt mát lạnh sảng khoái." },
      { name: "Nước sấu đá Hà Nội quả chua", price: 15000, desc: "Nước sấu ngâm đường chua thanh kèm sấu giòn sần sật." },
      { name: "Trà đá Thái Nguyên mát", price: 3000, desc: "Trà đá mát lạnh giải khát." }
    ]
  },
  bun_cha: {
    mains: [
      { name: "Bún Chả Hà Nội truyền thống", price: 35000, desc: "Chả băm và chả miếng nướng than hoa, bún tươi, nước mắm pha nóng chua ngọt." },
      { name: "Bún Chả Hà Nội suất đặc biệt nhiều thịt", price: 45000, desc: "Chả nướng than hoa ngập tràn thơm lừng kèm đu đủ chua ngọt giòn giòn." },
      { name: "Bún Chả Nem Cua Bể giòn rụm", price: 45000, desc: "Bún chả nướng kết hợp nem cua bể rán giòn rụm nhân cua biển ngọt bùi." },
      { name: "Bún Chả Tre nướng cổ truyền", price: 40000, desc: "Thịt dải chả băm kẹp trong nẹp tre nướng than hoa thơm lừng mộc mạc." }
    ],
    sides: [
      { name: "Nem cua bể Hải Phòng chiên (1 cái)", price: 15000, desc: "Nem vuông cua bể rán vàng giòn ngập nhân hải sản." },
      { name: "Chả băm nướng than gọi thêm", price: 15000, desc: "Thêm phần chả băm nướng thơm ngậy." },
      { name: "Chả miếng nướng than gọi thêm", price: 15000, desc: "Thêm phần ba chỉ nướng cháy xém cạnh thơm nức." },
      { name: "Đĩa bún tươi gọi thêm", price: 5000, desc: "Bún rối sợi nhỏ thêm đĩa giải đói." }
    ],
    drinks: [
      { name: "Nước quất đá mật ong dịu thanh", price: 15000, desc: "Quất tươi mật ong ngọt mát lạnh." },
      { name: "Trà quất sả đá mát", price: 15000, desc: "Trà tắc thơm sả mát lạnh giải ngấy thịt nướng." },
      { name: "Trà đá giải khát", price: 3000, desc: "Trà đá mát lạnh." }
    ]
  },
  mi_cay: {
    mains: [
      { name: "Mì Cay Hải Sản Seoul chua cay", price: 49000, desc: "Sợi mì Hàn Quốc cay nồng kèm tôm sú, mực trứng, chả cá, nấm và bông cải." },
      { name: "Mì Cay Ba Chỉ Bò Mỹ ngọt lịm", price: 45000, desc: "Thịt ba chỉ bò Mỹ cuộn nấm kim châm nấu mì gói chua cay Seoul hấp dẫn." },
      { name: "Mì Cay Thập Cẩm Seoul đầy đủ", price: 49000, desc: "Đầy đủ mực tôm, thịt bò cuộn, xúc xích Đức, chả cá và rau nấm tươi." },
      { name: "Mì Cay Đùi Gà Nấm hương cay", price: 45000, desc: "Mì cay nồng nấu cùng đùi gà xé thịt chắc ngọt và nấm đông cô dai bùi." },
      { name: "Mì Lẩu Thái Bạch Tuộc chua ngọt", price: 49000, desc: "Bạch tuộc sữa giòn sần sật xào sa tế lẩu Thái chua cay nóng hổi." }
    ],
    sides: [
      { name: "Kimbap chiên giòn rụm rưới sốt", price: 30000, desc: "Cơm cuộn kimbap chiên xù vàng giòn rưới tương cà sốt mayonnaise." },
      { name: "Kimbap truyền thống cuộn rong biển", price: 25000, desc: "Cơm cuộn xúc xích trứng rán cà rốt dưa leo tươi mát." },
      { name: "Bánh gạo Tokbokki lắc phô mai cay", price: 35000, desc: "Bánh gạo dẻo mịn ngập sốt tương ớt Hàn Quốc rắc phô mai kéo sợi." },
      { name: "Khoai tây lốc xoáy tẩm bột phô mai", price: 25000, desc: "Khoai tây cắt xoắn ốc rán giòn lắc bột phô mai mặn béo ngọt." }
    ],
    drinks: [
      { name: "Trà sữa Thái xanh trân châu đen", price: 25000, desc: "Trà sữa Thái xanh thơm mát chát nhẹ trân châu giòn dai." },
      { name: "Trà sữa Thái đỏ thạch sương sáo", price: 25000, desc: "Trà sữa Thái đỏ thơm nồng thạch sương sáo thanh mát." },
      { name: "Trà đào thạch đào thanh mát sảng khoái", price: 20000, desc: "Trà đào ngọt ngào thêm lát đào giòn ngọt xua tan độ cay." }
    ]
  },
  bun_ca: {
    mains: [
      { name: "Bún Cá Cay Hải Phòng rô phi chiên", price: 35000, desc: "Cá rô phi lọc xương tẩm bột chiên giòn tan, chả cá thu dai bùi chua cay." },
      { name: "Bún Cá Rô Đồng luộc gỡ xương", price: 35000, desc: "Cá rô đồng luộc gỡ thịt ngọt nước canh thanh tao nấu thì là dọc mùng." },
      { name: "Bún Lòng Cá rô đồng xào nghệ cay", price: 40000, desc: "Bao tử lòng cá xào nghệ sả cay giòn sần sật đưa bún lạ miệng cực đã." },
      { name: "Bún Cá Thu chả cá rán vàng", price: 40000, desc: "Lát cá thu hấp ngọt mềm và chả cá rán vàng bùi ngậy nước dùng trong." },
      { name: "Bún Hải Sản thập cẩm bề bề tôm mực", price: 45000, desc: "Bún mực tươi tôm sú lột vỏ bề bề luộc ngọt nước hải sản biển khơi." }
    ],
    sides: [
      { name: "Đĩa lòng cá xào nghệ gọi thêm", price: 20000, desc: "Thêm lòng cá xào sả ớt nghệ cay ngon giòn sần sật." },
      { name: "Đĩa chả cá thu Hải Phòng chiên thêm", price: 15000, desc: "Chả cá thu dai dai giòn giòn rán vàng ruột thêm đĩa." },
      { name: "Đĩa cá rô chiên giòn rụm gọi thêm", price: 15000, desc: "Thịt cá rô phi chiên giòn ăn kèm bún thêm ngon giòn." }
    ],
    drinks: [
      { name: "Trà tắc đá mát lạnh", price: 12000, desc: "Trà tắc thanh ngọt thơm giải nhiệt." },
      { name: "Trà đá giải khát", price: 3000, desc: "Trà đá mát lạnh bình dân." }
    ]
  },
  com_tam: {
    mains: [
      { name: "Cơm Tấm Sườn cốt lết nướng lu", price: 40000, desc: "Sườn cốt lết heo tẩm ướp sữa đặc mật ong nướng than hoa thơm lừng mọng nước." },
      { name: "Cơm Tấm Sườn Bì Chả trứng béo ngậy", price: 45000, desc: "Đầy đủ sườn cốt lết, bì heo thính thơm và chả trứng chưng truyền thống." },
      { name: "Cơm Tấm Đùi Gà nướng góc tư mật ong", price: 50000, desc: "Đùi gà lớn nướng mật ong vàng ruộm da giòn ngọt thịt béo ngậy đưa cơm." },
      { name: "Cơm Tấm Ba Chỉ Heo quay giòn da", price: 45000, desc: "Thịt ba chỉ heo quay da giòn xôm xốp thái mỏng nước mắm chua ngọt sệt." },
      { name: "Cơm Tấm Sườn Ốp La lòng đào béo", price: 45000, desc: "Sườn cốt lết nướng cùng trứng gà chiên ốp la lòng đào dẻo béo ngậy bùi." }
    ],
    sides: [
      { name: "Sườn cốt lết nướng mật ong gọi thêm", price: 22000, desc: "Một miếng sườn nướng thêm cho đĩa cơm nhiều thịt." },
      { name: "Trứng chưng chả thính chưng thêm", price: 8000, desc: "Một phần chả trứng chưng béo ngậy nấm mèo chà bông thêm." },
      { name: "Trứng gà chiên ốp la thêm (1 quả)", price: 5000, desc: "Trứng gà chiên lòng đào ngậy béo rưới mỡ hành." },
      { name: "Bát canh chua dứa thơm cà chua thịt băm", price: 8000, desc: "Canh chua giải nhiệt ngấy đưa cơm ngon tuyệt." }
    ],
    drinks: [
      { name: "Nước sâm dứa hạt chia lá dứa mát", price: 15000, desc: "Nước sâm mát ngọt thanh hương lá dứa thêm hạt chia bùi bùi." },
      { name: "Trà quất đá giải khát khổng lồ", price: 15000, desc: "Trà tắc chua ngọt mát lạnh sảng khoái cực đưa cơm." },
      { name: "Trà đá Thái Nguyên mát", price: 3000, desc: "Trà đá giải khát mát lạnh." }
    ]
  },
  com_rang: {
    mains: [
      { name: "Cơm rang dưa bò giòn hạt tơi", price: 40000, desc: "Cơm rang hạt tơi giòn giã giòn chiên cùng dưa chua xào bò mềm ngọt tỏi." },
      { name: "Cơm rang thập cẩm giò lạp sườn Hà Nội", price: 35000, desc: "Cơm rang vàng thơm cùng lạp sườn thái hạt lựu, giò nạc, ngô ngọt và cà rốt." },
      { name: "Cơm gà xối mỡ đùi chiên vàng giòn da", price: 40000, desc: "Cơm chiên hồng kèm đùi gà góc tư chiên xối mỡ nóng hổi giòn tan ngọt thịt." },
      { name: "Cơm sườn rim chua ngọt đưa cơm sinh viên", price: 45000, desc: "Sườn heo non rim sốt me chua ngọt đậm đà đưa cơm trắng dẻo." },
      { name: "Cơm thịt ba chỉ kho tàu trứng cút hầm nấm", price: 35000, desc: "Thịt ba rọi hầm mềm nhừ béo ngậy nước màu caramel cùng trứng cút kho sệt." },
      { name: "Cơm ba chỉ heo rang cháy cạnh hành tỏi", price: 35000, desc: "Ba chỉ thái mỏng rang sém cạnh thơm ngậy vị nước mắm và hành củ củ tỏi." },
      { name: "Cơm bò xào sả ớt sả băm cay nồng", price: 40000, desc: "Thịt bò thái mỏng xào sả ớt tươi cay nồng đậm vị đưa cơm nóng hổi." },
      { name: "Cơm sườn sụn heo sốt me rim giòn sật", price: 45000, desc: "Sườn sụn giòn sần sật rim nước sốt me ngọt chua đậm đà khó cưỡng." }
    ],
    sides: [
      { name: "Bát canh cải xanh thịt băm thêm mát", price: 8000, desc: "Canh cải ngọt thanh thịt băm nóng giải ngấy ăn cơm." },
      { name: "Trứng gà chiên ốp la thêm lòng đỏ dẻo", price: 5000, desc: "Trứng chiên rưới xì dầu mỡ hành thêm ngậy bùi." },
      { name: "Đĩa thịt ba chỉ rang sém cạnh gọi thêm", price: 18000, desc: "Thêm phần ba chỉ rang cháy cạnh đậm vị mặn ngọt ngon miệng." }
    ],
    drinks: [
      { name: "Coca-Cola lon lạnh mát", price: 15000, desc: "Lon giải khát ga cực đã ăn kèm cơm rang." },
      { name: "Trà tắc tắc tươi vắt mát lạnh", price: 12000, desc: "Nước tắc đá chua chua ngọt dịu giải khát cực tốt." },
      { name: "Trà đá Thái Nguyên giải nhiệt", price: 3000, desc: "Trà đá mát lạnh quen thuộc." }
    ]
  },
  bbq_hotpot: {
    mains: [
      { name: "Set Lẩu Thái chua cay hải sản (2-3 người)", price: 199000, desc: "Nồi lẩu Thái chua ngọt cay nồng, tôm mực ngao, ba chỉ bò Mỹ cuộn nấm và rau nấm." },
      { name: "Set Lẩu Riêu cua bắp bò sườn non sụn (3 người)", price: 299000, desc: "Lẩu riêu cua tươi béo ngậy ngọt nước hầm xương, bắp bò hoa chần, sườn sụn non và giò tai." },
      { name: "Set Lẩu Ếch măng chua cay nóng hổi (2-3 người)", price: 199000, desc: "Ếch đồng xào sa tế đậm vị xào măng chua, nước dùng cay xuýt xoa đưa bún đậu." },
      { name: "Set Lẩu Bò nhúng giấm chua ngọt (2 người)", price: 189000, desc: "Nước dùng chua thanh vị giấm táo nước dừa tươi nhúng bắp bò chín cuốn rau sống tráng bánh mì." },
      { name: "Buffet Nướng Lẩu Sinh Viên (Set Basic)", price: 139000, desc: "Thả ga nướng ba chỉ bò Mỹ sốt BBQ, thịt dải heo, nầm heo sốt cay nướng cùng lẩu Thái." },
      { name: "Buffet Nướng Lẩu Premium (Set Hải Sản đầy đủ)", price: 189000, desc: "Thêm hải sản cua ghẹ, tôm sú nướng muối ớt, bạch tuộc sốt cay và nầm heo sữa nướng." }
    ],
    sides: [
      { name: "Đĩa ba chỉ bò Mỹ nướng lẩu thêm", price: 59000, desc: "Thịt ba chỉ bò vân mỡ đều thơm ngọt béo ngậy thêm đĩa." },
      { name: "Đĩa nầm heo sữa ướp sa tế nướng thêm", price: 49000, desc: "Nầm heo sữa giòn sần sật thơm ngậy gia vị nướng thêm." },
      { name: "Đĩa mực ống sốt sa tế cay nướng thêm", price: 69000, desc: "Mực ống biển dày thịt nướng cay ngọt thêm phần." },
      { name: "Đĩa tôm sú nướng muối ớt cay giòn thêm", price: 69000, desc: "Tôm sú biển tươi ngon nướng muối ớt cay giòn thêm đĩa." },
      { name: "Đĩa ngô chiên ngọt bơ tỏi giòn tan", price: 30000, desc: "Ngô ngọt tách hạt bao bột rán giòn thơm bơ tỏi ăn vặt." },
      { name: "Đĩa khoai tây chiên lắc bột phô mai giòn", price: 35000, desc: "Khoai chiên giòn rụm bột phô mai béo mặn ngọt giòn tan." }
    ],
    drinks: [
      { name: "Bia hơi Hà Nội mát lạnh (Ca 1 lít lạnh)", price: 25000, desc: "Bia hơi mát rượi sủi bọt thích hợp tụ họp bạn bè." },
      { name: "Bia Hà Nội chai lạnh mát", price: 15000, desc: "Chai bia Hà Nội giải nhiệt ăn đồ nướng." },
      { name: "Coca-Cola lon lạnh ga mát", price: 15000, desc: "Nước ngọt lon giải khát sảng khoái ăn lẩu nướng." }
    ]
  },
  chicken: {
    mains: [
      { name: "Gà ri đồi đắp đất nướng lu mật ong (nguyên con)", price: 280000, desc: "Gà ri chắc thịt da giòn bọc đất nướng lu mật ong nguyên con ngọt thịt thơm nồng." },
      { name: "Gà ta hấp lá chanh da giòn ngọt thịt (nửa con)", price: 120000, desc: "Gà ta luộc vàng óng da dai giòn rắc lá chanh xắt chỉ chấm muối ớt tiêu vắt chanh." },
      { name: "Gà đồi rang muối sả ớt giòn thơm", price: 110000, desc: "Thịt gà đồi chặt khúc rang cháy cạnh phủ muối tỏi sả giòn tan ngon miệng." },
      { name: "Lẩu gà lá giang chua ngọt ấm cúng (2-3 người)", price: 199000, desc: "Lẩu gà nấu lá giang chua mát thơm lừng ăn kèm bún tươi măng chua tươi mát." },
      { name: "Gà rán giòn rụm cay nồng (2 miếng đùi)", price: 45000, desc: "Đùi gà tẩm bột chiên giòn tan da vàng giòn cay thơm nồng đậm sốt tương ớt." },
      { name: "Gà rán sốt mật ong tỏi béo ngọt (3 miếng)", price: 59000, desc: "Thịt gà chiên phủ sốt mật ong ngọt thanh thơm nồng bơ tỏi rắc vừng." }
    ],
    sides: [
      { name: "Đĩa khoai tây chiên vàng giòn", price: 20000, desc: "Khoai chiên giòn bùi ăn kèm gà rán sốt." },
      { name: "Đĩa ngô chiên bơ ngậy ngọt ngon", price: 25000, desc: "Ngô chiên giòn thơm ngậy bơ lạt ngọt." },
      { name: "Đĩa dưa chuột chẻ ăn giải ngấy gà luộc", price: 10000, desc: "Dưa chuột tươi chẻ thanh mát chấm muối tiêu ớt giải ngấy cực tốt." }
    ],
    drinks: [
      { name: "Lon Pepsi ướp đá lạnh ga mát", price: 15000, desc: "Nước ngọt lon giải khát sảng khoái ga." },
      { name: "Trà quất mát lạnh", price: 12000, desc: "Quất tươi mát lạnh ngọt dịu giải khát cực tốt." }
    ]
  },
  cafe_tea: {
    mains: [
      { name: "Cà phê đen đá Robusta đậm đà truyền thống", price: 20000, desc: "Cà phê đen pha phin Robusta Tây Nguyên đắng dịu hậu ngọt thơm nồng." },
      { name: "Cà phê sữa đá pha phin sữa béo ngọt ngào", price: 25000, desc: "Cà phê sữa đặc béo ngậy đắng thơm truyền thống đá mát lạnh." },
      { name: "Bạc xỉu ba tầng Hola sữa thơm nhẹ cafe", price: 29000, desc: "Sữa tươi thanh trùng, sữa đặc ngậy béo kết hợp Espresso nhẹ nhàng thơm ngậy." },
      { name: "Cà phê muối kem béo mặn ngọt độc đáo", price: 25000, desc: "Cà phê phin kết hợp lớp kem sữa muối mặn ngọt dẻo ngậy độc đáo." },
      { name: "Cà phê cốt dừa đá xay thơm béo ngậy bùi", price: 35000, desc: "Nước cốt dừa thơm bùi đá xay nhuyễn rưới Espresso đắng thơm mát lạnh." },
      { name: "Trà sữa trân châu hoàng kim béo ngậy đậm trà", price: 35000, desc: "Trà sữa vị hồng trà đậm vị sữa ngọt thanh kèm trân châu hoàng kim dai giòn." },
      { name: "Trà sữa Matcha trân châu trắng Nhật Bản", price: 40000, desc: "Trà sữa bột trà xanh Nhật Bản thơm chát nhẹ trân châu trắng dai dai giòn giòn." },
      { name: "Trà đào cam sả thanh mát ngọt thơm", price: 35000, desc: "Trà hồng đào thanh mát hòa quyện hương sả tươi sảng khoái lát cam vàng." },
      { name: "Trà sen vàng kem béo hạt sen dẻo", price: 45000, desc: "Trà ô long thanh nhẹ kèm hạt sen dừa sợi dẻo bùi và lớp kem cheese béo mặn." },
      { name: "Sữa tươi trân châu đường đen sủi bọt kem sữa", price: 35000, desc: "Sữa tươi trân châu ngập sốt đường đen đậm đà kèm lớp kem sữa sủi bọt ngậy béo." },
      { name: "Sinh tố bơ sáp Đắk Lắk ngọt ngào béo mịn", price: 40000, desc: "Sinh tố quả bơ chín sáp béo ngậy ngọt ngào giàu dinh dưỡng đá mịn." },
      { name: "Nước cam sành vắt nguyên chất tươi ngọt", price: 30000, desc: "Cam sành vắt tươi giàu vitamin C giải nhiệt cực tốt không đường đá." }
    ],
    sides: [
      { name: "Bánh sừng bò Croissant bơ Pháp nướng giòn", price: 28000, desc: "Bánh sừng bò xếp lớp thơm lừng bơ Pháp nướng nóng giòn ruột xốp." },
      { name: "Bánh bông lan trứng muối ngập sốt dầu trứng", price: 35000, desc: "Bông lan xốp mềm phết sốt bơ dầu trứng muối béo ngậy ruốc mặn ngọt." },
      { name: "Đĩa hướng dương rang thơm thảo mộc cắn nhót", price: 15000, desc: "Hướng dương rang giòn thơm thảo dược lý tưởng cắn nhâm nhi buôn chuyện." },
      { name: "Đĩa khô gà lá chanh cay ngọt dai dai ngon", price: 25000, desc: "Khô gà xé sợi tẩm ướp cay mặn ngọt sấy khô lá chanh thơm nồng." }
    ],
    drinks: [
      { name: "Trà quất mật ong đá mát ngọt dịu", price: 15000, desc: "Tắc tươi pha mật ong rừng đá giải nhiệt thanh họng tốt." },
      { name: "Trà chanh truyền thống phố cổ mát lạnh", price: 15000, desc: "Trà xanh chanh tươi đường lạt mát giải nhiệt cực đã." }
    ]
  },
  banh_mi: {
    mains: [
      { name: "Bánh mì pate chả lụa nóng giòn bì", price: 20000, desc: "Bánh mì giòn ruột xốp pate gan tự làm chả giò lụa ruốc heo nước sốt đỏ cay nhẹ." },
      { name: "Bánh mì xá xíu mật ong thơm ngậy ngọt", price: 25000, desc: "Thịt heo xá xíu rim mật ong mềm ngọt xắt mỏng dưa leo rau thơm giòn bì." },
      { name: "Bánh mì gà xé phay bơ béo ngậy giòn", price: 25000, desc: "Thịt đùi gà ta xé phay trộn bơ lạt mayonnaise dưa góp hành ngò thơm nức." },
      { name: "Bánh mì trứng ốp la xúc xích rán hành", price: 20000, desc: "Bánh mì kẹp hai quả trứng gà chiên ốp la xúc xích chiên nước sốt mặn ngọt cay." },
      { name: "Bánh mì que Hải Phòng pate trứ danh (5 chiếc)", price: 25000, desc: "Bánh mì que nhỏ giòn rụm phết pate gan mịn màng rưới chí chương cay xè chuẩn vị." },
      { name: "Bánh mì chảo đặc biệt nóng xèo (Trứng pate chả bò)", price: 45000, desc: "Chảo nóng xèo xèo pate gan, trứng ốp, xúc xích nướng, chả bò sốt bơ cà chua béo ngậy kèm bánh mì." }
    ],
    sides: [],
    drinks: [
      { name: "Trà chanh giải nhiệt mát lạnh", price: 15000, desc: "Giải nhiệt mát lạnh chanh tươi đường lạt dưa góp." },
      { name: "Sữa đậu nành đá lạnh béo thơm", price: 12000, desc: "Sữa đậu nành nguyên chất thơm dịu mát lạnh." },
      { name: "Coca-Cola lon lạnh ga mát", price: 15000, desc: "Lon giải khát cực đã ăn bánh mì ngon." }
    ]
  },
  seafood: {
    mains: [
      { name: "Ốc hương luộc lá chanh sả gừng tươi ngọt", price: 65000, desc: "Ốc hương biển luộc chín lá chanh sả gừng chấm mắm gừng ớt cay nồng giòn ngọt." },
      { name: "Ốc mỡ xào sa tế me dừa béo cay chua", price: 75000, desc: "Ốc mỡ dày thịt xào sốt me chua cay cốt dừa béo bùi rắc hành phi rau răm." },
      { name: "Ốc móng tay xào tỏi hành sả thơm lừng", price: 65000, desc: "Ốc móng tay tươi sống xào cháy tỏi hành bơ lạt thơm lừng đậm đà giòn ngọt." },
      { name: "Hàu nướng mỡ hành lạc rang bùi béo (6 con)", price: 55000, desc: "Hàu sữa tươi nướng mỡ hành rưới lạc rang đập dập thơm lừng béo ngậy cồn." },
      { name: "Hàu nướng phô mai kéo sợi thơm ngậy (6 con)", price: 65000, desc: "Hàu sữa tươi nướng phô mai đút lò kéo sợi béo ngậy ngọt hàu sữa." },
      { name: "Sò huyết cháy tỏi sả ớt sần sật sảng khoái", price: 75000, desc: "Sò huyết biển cháy tỏi sém cạnh sả ớt ngọt thịt đậm đà đưa bia." },
      { name: "Mực trứng hấp gừng sả hành củ ngọt lịm", price: 85000, desc: "Mực trứng tươi sống hấp gừng sả ớt ngọt đậm đà nước chấm mắm ớt." }
    ],
    sides: [
      { name: "Đĩa sung muối chua ngọt cay tỏi kèm ốc", price: 10000, desc: "Sung nếp muối chua ngọt sả tỏi ớt dầm giòn ăn kèm ốc giải ngấy." },
      { name: "Đĩa xoài non dầm bò khô chua ngọt cay", price: 25000, desc: "Xoài non thái lát dầm muối ớt đường khô bò xé sợi chua ngọt cực cuốn." },
      { name: "Đĩa nem chua rán chiên xù chấm tương ớt (5 cái)", price: 35000, desc: "Nem chua bọc bột xù rán giòn rụm nóng hổi chấm tương ớt cay nồng." }
    ],
    drinks: [
      { name: "Bia Hà Nội chai lạnh mát sủi bọt giải nhiệt", price: 15000, desc: "Chai bia giải khát sảng khoái ăn ốc hải sản." },
      { name: "Trà quất tắc mát lạnh ngọt sướng", price: 15000, desc: "Trà tắc đá lạnh chua ngọt ngon tuyệt giải ngấy hải sản." }
    ]
  },
  noodle_variety: {
    mains: [
      { name: "Bún riêu cua bắp bò giò tai đầy đủ", price: 40000, desc: "Cua đồng giã nhỏ riêu nổi, thịt bắp bò hoa trần chín giò tai giòn bì." },
      { name: "Bún riêu cua đậu rán tóp mỡ giòn ruột", price: 35000, desc: "Bún riêu cua đồng gạch béo ngậy kèm đậu mơ rán giòn tóp mỡ béo bùi." },
      { name: "Bún mọc sườn heo dọc mùng thanh tao", price: 35000, desc: "Sườn heo ninh mềm, viên mọc nấm hương dai giòn dọc mùng trần xanh giòn." },
      { name: "Bún riêu ốc nhồi giò heo đầy đủ tô", price: 40000, desc: "Ốc nhồi luộc giòn sật ăn kèm riêu cua cà chua giò heo luộc nước dùng thanh mát." },
      { name: "Bánh cuốn nóng tráng tay nhân mộc nhĩ chả quế", price: 30000, desc: "Bánh cuốn nóng tráng mỏng nhân thịt băm mộc nhĩ rắc hành phi giòn chả quế." },
      { name: "Bánh xèo miền Tây nhân tôm thịt giòn tan da", price: 35000, desc: "Bánh xèo giòn ruộm vỏ vàng nghệ tôm thịt giá đỗ cuốn bánh tráng rau sống nước mắm chua ngọt." },
      { name: "Cháo sườn sụn quẩy giòn ngọt sánh", price: 25000, desc: "Cháo bột gạo ninh sườn heo sụn giòn nhừ sánh mịn rắc ruốc quẩy giòn hạt tiêu." },
      { name: "Cháo lòng tiết canh dồi heo chuẩn vị bắc", price: 35000, desc: "Cháo lòng hầm nước luộc dồi lòng heo thập cẩm sần sật ăn kèm tiết canh dồi rán." },
      { name: "Đĩa lòng lợn luộc thập cẩm nóng hổi đầy đặn", price: 80000, desc: "Lòng non luộc dồi sụn dạ dày gan heo trần nóng chấm mắm tôm hành chưng sả." }
    ],
    sides: [
      { name: "Đĩa quẩy giòn cháo bún phở (3 chiếc)", price: 10000, desc: "Quẩy phở chiên giòn bùi để nhúng cháo riêu bún." },
      { name: "Trứng chần hành trần lòng đào béo ngậy", price: 7000, desc: "Trứng gà chần lòng đỏ dẻo chần hành hoa nước riêu cua ngọt lịm." }
    ],
    drinks: [
      { name: "Trà nhân trần đá mát ngọt giọng thanh nhiệt", price: 5000, desc: "Nước nhân trần đá mát thanh ngọt giải khát." },
      { name: "Trà đá giải nhiệt Thái Nguyên mát", price: 3000, desc: "Trà đá giải khát sinh viên." }
    ]
  }
};

// Smart classifier to map vendor name/category to one of the pools above
const classifyVendorToPool = (name, category) => {
  const n = (name || '').toLowerCase();
  const cat = (category || '').toLowerCase();

  if (n.includes('bún bò') || n.includes('bun bo')) return 'bun_bo_hue';
  if (n.includes('phở') || n.includes('pho') || n.includes('gia truyền')) return 'pho';
  if (n.includes('bún đậu') || n.includes('bun dau')) return 'bun_dau';
  if (n.includes('bún chả') || n.includes('bun cha')) return 'bun_cha';
  if (n.includes('mì cay') || n.includes('mỳ cay') || n.includes('mi cay')) return 'mi_cay';
  if (n.includes('bún cá') || n.includes('bun ca')) return 'bun_ca';
  if (n.includes('cơm tấm') || n.includes('com tam')) return 'com_tam';
  if (n.includes('cơm rang') || n.includes('com rang') || n.includes('cơm chiên') || n.includes('com chien')) return 'com_rang';
  if (n.includes('lẩu') || n.includes('nướng') || n.includes('bbq') || n.includes('grill') || n.includes('hotpot') || n.includes('lau ') || n.includes('nuong ') || cat.includes('lẩu') || cat.includes('nướng') || cat.includes('bbq') || cat.includes('grill') || cat.includes('hot pot') || cat.includes('buffet')) return 'bbq_hotpot';
  if (n.includes('gà') || n.includes('chicken') || cat.includes('chicken')) return 'chicken';
  if (n.includes('cà phê') || n.includes('cafe') || n.includes('coffee') || n.includes('trà sữa') || n.includes('tea') || n.includes('sinh tố') || n.includes('juice') || n.includes('chè') || n.includes('đồ uống') || cat.includes('cafe') || cat.includes('coffee') || cat.includes('tea') || cat.includes('drink') || cat.includes('bubble tea') || cat.includes('juice') || cat.includes('ice cream') || cat.includes('dessert')) return 'cafe_tea';
  if (n.includes('bánh mì') || n.includes('banh mi') || n.includes('bánh mỳ')) return 'banh_mi';
  if (n.includes('ốc') || n.includes('hải sản') || n.includes('seafood') || cat.includes('seafood') || cat.includes('fish')) return 'seafood';
  if (n.includes('bún') || n.includes('riêu') || n.includes('mọc') || n.includes('bánh cuốn') || n.includes('bánh xèo') || n.includes('cháo') || n.includes('lòng') || cat.includes('noodle') || cat.includes('breakfast')) return 'noodle_variety';
  
  // Category fallbacks
  if (cat.includes('cafe') || cat.includes('coffee') || cat.includes('tea') || cat.includes('bubble')) return 'cafe_tea';
  if (cat.includes('noodle')) return 'noodle_variety';
  if (cat.includes('rice') || cat.includes('cơm')) return 'com_rang';
  if (cat.includes('seafood') || cat.includes('fish')) return 'seafood';
  if (cat.includes('chicken')) return 'chicken';
  
  return 'com_rang'; 
};

// Returns signature items if the name is specific
const getSignatureItems = (name, rng) => {
  const n = name.trim();
  const lowercaseName = n.toLowerCase();
  
  if (lowercaseName.includes('bún bò huế ngô thúy') || lowercaseName.includes('ngô thúy') || lowercaseName.includes('ngo thuy')) {
    return [
      {
        name: "Bún Bò Huế Ngô Thúy Đặc Biệt",
        price: 50000,
        description: "Tô bún bò Huế mang thương hiệu Ngô Thúy trứ danh Hòa Lạc với bắp bò, gân, móng giò, chả cua và nước dùng cực kỳ đậm đà chuẩn vị Huế hầm xương bò 24h."
      },
      {
        name: "Trà Tắc Ngô Thúy Siêu To",
        price: 15000,
        description: "Trà tắc mát lạnh giải nhiệt, vị ngọt thơm dịu đặc trưng của quán ăn kèm bún bò cực hợp."
      }
    ];
  }
  
  if (lowercaseName.includes('highlands coffee') || lowercaseName.includes('highlands')) {
    return [
      { name: "Trà Sen Vàng Highlands (Size L)", price: 55000, description: "Hương vị trà ô long thanh mát kết hợp cùng hạt sen dẻo thơm bùi và kem sữa béo mịn trứ danh." },
      { name: "Phin Sữa Đá Highlands (Size M)", price: 39000, description: "Cà phê phin đậm đà từ hạt Robusta rang xay truyền thống hòa quyện sữa đặc béo ngậy." },
      { name: "Freeze Trà Xanh Highlands (Size M)", price: 55000, description: "Đá xay trà xanh thơm lừng đặc trưng Highlands kết hợp thạch trà xanh giòn dai và kem whipping béo ngậy." },
      { name: "Bánh Mì Thịt Nướng Highlands", price: 29000, description: "Bánh mì giòn rụm kẹp thịt nướng đậm vị, rưới sốt bơ và rau thơm giòn ngọt." }
    ];
  }

  if (lowercaseName.includes('mixue')) {
    return [
      { name: "Kem Ốc Quế Mixue siêu to", price: 10000, description: "Kem tươi vị vani thơm sữa béo ngậy đựng trong vỏ ốc quế giòn rụm đặc trưng của Mixue." },
      { name: "Trà Sữa Ba Anh Em Mixue", price: 30000, description: "Trà sữa đậm vị kết hợp 3 loại topping: trân châu dai giòn, thạch dừa thanh ngọt và thạch sương sáo thanh mát." },
      { name: "Dương Chi Cam Lộ Mixue", price: 35000, description: "Thức uống xoài lạnh kết hợp thạch dừa bưởi đỏ hạt sago ngọt ngào thơm mát béo ngậy." },
      { name: "Trà Đào Tứ Kỳ Mixue (L)", price: 25000, description: "Trà đào thơm nồng chua thanh thạch đào giòn sần sật mát lạnh." }
    ];
  }

  if (lowercaseName.includes('toco') || lowercaseName.includes('tocotoco')) {
    return [
      { name: "Trà Sữa Ba Anh Em Tocotoco", price: 32000, description: "Hồng trà sữa thơm ngậy cùng trân châu đen, pudding mềm mịn và thạch sương sáo thanh mát." },
      { name: "Trà Sữa Trân Châu Hoàng Kim Tocotoco", price: 35000, description: "Sự kết hợp tuyệt vời giữa trà sữa truyền thống và trân châu hoàng kim dẻo dai óng ánh." },
      { name: "Trà Sữa Panda Tocotoco", price: 35000, description: "Hồng trà sữa ngập tràn trân châu sợi dai dai và trân châu đen ngọt bùi." },
      { name: "Chè Xoài Mango Tocotoco", price: 39000, description: "Chè xoài thơm ngậy cốt dừa thạch dừa dai giòn trân châu trắng." }
    ];
  }

  if (lowercaseName.includes('ding tea') || lowercaseName.includes('dingtea')) {
    return [
      { name: "Trà Sữa Trân Châu Ding Tea (L)", price: 39000, description: "Trà sữa trân châu truyền thống bán chạy nhất thế giới của Ding Tea ngọt thanh ngậy sữa." },
      { name: "Trà Xanh Ding Tea thạch dừa", price: 32000, description: "Trà xanh lài nhài thanh mát hương thơm dịu thêm thạch dừa dai giòn sần sật." },
      { name: "Trà Ô Long sữa Ding Tea (L)", price: 42000, description: "Trà sữa ô long thơm chát nhẹ ngậy béo sữa đặc biệt." }
    ];
  }

  if (lowercaseName.includes('giang béo') || lowercaseName.includes('bún đậu giang béo')) {
    return [
      { name: "Mẹt Bún Đậu Đầy Đủ Giang Béo", price: 45000, description: "Mẹt bún đậu đầy đủ đặc sắc của quán Giang Béo Tân Xã với đậu chiên phồng giòn ruột, thịt chân giò luộc, chả cốm dẻo, nem chua rán và dồi sụn." },
      { name: "Lòng Dồi Sụn Chiên Giang Béo", price: 25000, description: "Dồi sụn non chiên giòn thơm lừng lá mơ sả ớt, chả cốm dai ngon." }
    ];
  }

  if (lowercaseName.includes('cô hương') || lowercaseName.includes('bún đậu cô hương')) {
    return [
      { name: "Mẹt Bún Đậu Đầy Đủ Cô Hương", price: 45000, description: "Suất bún đậu đầy ắp chả cốm, nem rán, chân giò giòn ruột chiên nóng giòn của thương hiệu Cô Hương." },
      { name: "Nem Chua Rán Giòn Cô Hương (5 cái)", price: 30000, description: "Nem chua rán bọc bột xù rán vàng giòn giòn sần sật đặc sản." }
    ];
  }

  if (lowercaseName.includes('duy cường') || lowercaseName.includes('phở duy cường')) {
    return [
      { name: "Phở Bò Tái Gầu Duy Cường", price: 40000, description: "Bánh phở mềm dai, thịt bắp bò tái và gầu bò giòn ngậy, chan nước dùng hầm xương trong vắt ngọt lịm Duy Cường." },
      { name: "Phở Gà Xé Ta Duy Cường", price: 35000, desc: "Thịt gà ta da vàng giòn dai xé phay rắc lá chanh thơm mát nước dùng trong." }
    ];
  }

  if (lowercaseName.includes('đức béo') || lowercaseName.includes('lẩu bò đức béo')) {
    return [
      { name: "Set Lẩu Đuôi Bò Đức Béo (Nhỏ)", price: 199000, description: "Đuôi bò hầm thảo mộc nhừ ngọt tủy kết hợp bò tái chín gân gầu sườn non." },
      { name: "Set Lẩu Bắp Bò Nhúng Giấm Đức Béo", price: 189000, description: "Bắp bò hoa thái mỏng nhúng nước giấm hoa quả chua ngọt thanh dịu cuốn bánh tráng rau sống ngon tuyệt." }
    ];
  }

  if (lowercaseName.includes('phú bình') || lowercaseName.includes('gà ri phú bình')) {
    return [
      { name: "Mẹt Gà Ri Đắp Đất Nướng Phú Bình", price: 250000, description: "Gà ri đồi thả vườn thịt chắc ngọt bọc đất nướng lu mật ong thơm phức của thương hiệu Phú Bình nổi tiếng Thạch Thất." },
      { name: "Gà Ri Hấp Lá Chanh Phú Bình (Nửa con)", price: 120000, description: "Gà luộc vàng óng thịt dai ngọt lịm chấm muối tiêu chanh ớt lá chanh tươi." }
    ];
  }

  if (lowercaseName.includes('cơm gà sài gòn') || lowercaseName.includes('cơm gà hải nam')) {
    return [
      { name: "Cơm Gà Xối Mỡ Sài Gòn Đùi Góc Tư", price: 45000, description: "Đùi gà lớn chiên vàng giòn da ngọt thịt, cơm rang hồng ăn kèm kim chi dưa leo nước sốt tỏi ớt Sài Gòn." },
      { name: "Cơm Gà Luộc Hải Nam", price: 40000, description: "Cơm nấu nước dùng gà dẻo bùi kèm đùi cánh gà luộc ngọt mát nước mắm gừng sệt." }
    ];
  }

  if (lowercaseName.includes('ốc bà ngân') || lowercaseName.includes('bà ngân')) {
    return [
      { name: "Ốc Luộc Mắm Gừng Ốc Bà Ngân", price: 50000, description: "Ốc nếp luộc sả lá chanh giòn ngọt chấm nước mắm gừng sả tỏi ớt chua ngọt gia truyền Bà Ngân." },
      { name: "Hàu Nướng Phô Mai Kéo Sợi Bà Ngân (6 con)", price: 60000, description: "Hàu sữa tươi béo ngậy nướng phô mai đút lò kéo sợi thơm lừng ăn kèm sung muối." }
    ];
  }

  if (lowercaseName.includes('alo cơm ngon') || lowercaseName.includes('alo com ngon')) {
    return [
      {
        name: "Cơm Alo Đặc Biệt Sườn Cốt Lết",
        price: 45000,
        description: "Cơm rang hạt giòn kèm sườn cốt lết rim mật ong thơm phức của thương hiệu Alo Cơm Ngon nổi tiếng Hòa Lạc."
      }
    ];
  }

  if (lowercaseName.includes('bún bò')) {
    return [
      {
        name: `Bún Bò ${n} Đặc Sản`,
        price: 45000 + Math.floor(rng() * 3) * 5000,
        description: `Tô bún bò đặc sắc mang phong vị riêng của quán ${n}, đầy ắp thịt bò, chả cua nồng nàn vị lèo Huế.`
      }
    ];
  }

  if (lowercaseName.includes('bún đậu')) {
    return [
      {
        name: `Mẹt Bún Đậu Tá Lả ${n}`,
        price: 50000 + Math.floor(rng() * 2) * 5000,
        description: `Mẹt bún đậu đầy đủ ngập tràn các món chiên giòn, mắm tôm pha cực chất chính hiệu ${n}.`
      }
    ];
  }
  
  if (lowercaseName.includes('phở') || lowercaseName.includes('pho')) {
    return [
      {
        name: `Phở Đặc Biệt ${n}`,
        price: 45000 + Math.floor(rng() * 3) * 5000,
        description: `Tô phở bò gà đặc biệt của quán ${n} hầm xương ngọt lịm với nhiều loại bò tái chín nạm gầu trứng non.`
      }
    ];
  }

  return [];
};

// Categories that do not sell food and should have empty menus
const NON_FOOD_CATEGORIES = [
  'Apartment building', 'Apartment rental agency', 'Bus stop', 'Car wash',
  'Florist', 'Gym', 'Hostel', 'Housing development', 'Internet cafe',
  'Office space rental agency', 'Place of worship', 'Real estate developer',
  'Senior high school', 'Software company', 'Store', 'Supermarket',
  'Technology park', 'University', 'Variety store', 'Village hall', 'Market'
];

const DESCRIPTIONS_TEMPLATES = [
  "Hương vị hấp dẫn đậm đà được chuẩn bị tỉ mỉ từ nguyên liệu tươi sạch nhập mới mỗi sáng.",
  "Món ăn đặc sắc bán chạy nhất của quán, hương vị thơm ngon vừa miệng chuẩn vị truyền thống.",
  "Chuẩn bị từ nguyên liệu tươi sạch chọn lọc kĩ càng, đảm bảo vệ sinh an toàn thực phẩm.",
  "Hương vị gia truyền độc đáo được chế biến bởi đầu bếp nhiều năm kinh nghiệm tại Hòa Lạc.",
  "Được đông đảo sinh viên FPT cực kỳ ưa chuộng vì độ ngon khó cưỡng và giá cả vô cùng hợp lý."
];

// Generates a completely unique, realistic menu for a vendor
const generateMenuForVendor = (name, category) => {
  if (NON_FOOD_CATEGORIES.includes(category)) {
    return [];
  }

  const seed = name + category;
  const rng = createRandom(seed);
  
  const poolKey = classifyVendorToPool(name, category);
  const pool = BASE_POOLS[poolKey] || BASE_POOLS.com_rang;

  // Shuffle mains, sides, and drinks independently using seedable random
  const shuffledMains = shuffleArray(pool.mains, rng);
  const shuffledSides = shuffleArray(pool.sides || [], rng);
  const shuffledDrinks = shuffleArray(pool.drinks || [], rng);

  // Take a random selection from each sub-pool
  const mainCount = 5 + Math.floor(rng() * 4); // 5 to 8 mains
  const sideCount = Math.min(shuffledSides.length, 2 + Math.floor(rng() * 3)); // 2 to 4 sides
  const drinkCount = Math.min(shuffledDrinks.length, 2 + Math.floor(rng() * 2)); // 2 to 3 drinks

  const selectedMains = shuffledMains.slice(0, mainCount);
  const selectedSides = shuffledSides.slice(0, sideCount);
  const selectedDrinks = shuffledDrinks.slice(0, drinkCount);

  // Merge the selection
  const rawMenu = [...selectedMains, ...selectedSides, ...selectedDrinks];

  // Map to final items with randomized adjustments
  const finalMenu = rawMenu.map((item) => {
    // Price adjustment (+/- 5000đ in steps of 2000đ or 5000đ)
    const priceDiffs = [-5000, -3000, -2000, 0, 2000, 3000, 5000];
    const diff = priceDiffs[Math.floor(rng() * priceDiffs.length)];
    const adjustedPrice = Math.max(5000, item.price + diff);

    // Randomize description template if none exists or slightly mix them
    const descIdx = Math.floor(rng() * DESCRIPTIONS_TEMPLATES.length);
    const desc = item.desc || DESCRIPTIONS_TEMPLATES[descIdx];

    return {
      name: item.name,
      price: adjustedPrice,
      description: desc
    };
  });

  // Inject signature items at the beginning
  const signatures = getSignatureItems(name, rng);
  const combinedMenu = [...signatures, ...finalMenu];

  // Final deduplication by name
  const uniqueMenu = [];
  combinedMenu.forEach((item) => {
    if (!uniqueMenu.some((m) => m.name.toLowerCase() === item.name.toLowerCase())) {
      uniqueMenu.push(item);
    }
  });

  return uniqueMenu.slice(0, 18); // Max 18 items for neatness
};

const run = async () => {
  console.log('🚀 Loading local_vendors_override.json...');
  if (!fs.existsSync(OVERRIDE_PATH)) {
    console.error(`❌ Local overrides file not found at: ${OVERRIDE_PATH}`);
    process.exit(1);
  }

  let localData = [];
  try {
    localData = JSON.parse(fs.readFileSync(OVERRIDE_PATH, 'utf8'));
  } catch (err) {
    console.error(`❌ Failed to parse local override file: ${err.message}`);
    process.exit(1);
  }

  console.log(`📦 Generating unique menus for ${localData.length} local vendors...`);
  
  localData.forEach((vendor) => {
    const menu = generateMenuForVendor(vendor.name, vendor.category);
    vendor.menu = menu;
  });

  try {
    fs.writeFileSync(OVERRIDE_PATH, JSON.stringify(localData, null, 2), 'utf8');
    console.log(`✅ Saved unique menus to local_vendors_override.json!`);
  } catch (err) {
    console.error(`❌ Failed to save local override file: ${err.message}`);
  }

  // === STEP 2: Sync to CSV template ===
  if (fs.existsSync(CSV_PATH)) {
    console.log(`📝 Syncing CSV template file: ${CSV_PATH}...`);
    try {
      const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
      const lines = csvContent.split('\n');
      if (lines.length > 1) {
        const headers = lines[0].split(',');
        const nameIdx = headers.indexOf('name');
        const catIdx = headers.indexOf('category');
        const menuIdx = headers.indexOf('menu');

        if (nameIdx !== -1 && catIdx !== -1 && menuIdx !== -1) {
          const updatedLines = [lines[0]];
          
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            let fields = [];
            let field = '';
            let inQuotes = false;
            for (let cIdx = 0; cIdx < line.length; cIdx++) {
              const char = line[cIdx];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                fields.push(field);
                field = '';
              } else {
                field += char;
              }
            }
            fields.push(field);

            if (fields.length >= Math.max(nameIdx, catIdx, menuIdx)) {
              const name = fields[nameIdx].replace(/^"|"$/g, '').trim();
              const category = fields[catIdx].replace(/^"|"$/g, '').trim();
              
              const menu = generateMenuForVendor(name, category);
              const csvMenuStr = menu.map(item => `${item.name}:${item.price >= 1000 ? (item.price/1000) + 'k' : item.price}`).join(';');
              
              fields[menuIdx] = `"${csvMenuStr}"`;
              
              fields = fields.map((f, index) => {
                if (index !== menuIdx) {
                  const cleaned = f.replace(/^"|"$/g, '').trim();
                  if (cleaned.includes(',')) {
                    return `"${cleaned}"`;
                  }
                  return cleaned;
                }
                return f;
              });

              updatedLines.push(fields.join(','));
            } else {
              updatedLines.push(line);
            }
          }
          fs.writeFileSync(CSV_PATH, updatedLines.join('\n'), 'utf8');
          console.log(`✅ CSV template file synchronized successfully!`);
        }
      }
    } catch (err) {
      console.warn(`⚠️ Warning: could not sync CSV file: ${err.message}`);
    }
  }

  // === STEP 3: Sync to Postgres/Supabase ===
  if (!pool) {
    console.warn('⚠️ DATABASE_URL not configured. Skipping Supabase sync.');
    process.exit(0);
  }

  console.log('🔌 Connecting to Postgres/Supabase to update menus...');
  let client = null;
  try {
    client = await pool.connect();
    
    // Fetch all vendors from DB
    const res = await client.query('SELECT id, name, category FROM vendors');
    const vendors = res.rows;
    console.log(`... Updating ${vendors.length} vendors in Supabase database...`);

    let updateCount = 0;
    const query = 'UPDATE vendors SET menu = $1, price_min = $2, price_max = $3, price_range = $4, updated_at = now() WHERE id = $5';
    
    for (const v of vendors) {
      const menu = generateMenuForVendor(v.name, v.category);
      
      const prices = menu.map(m => m.price).filter(p => typeof p === 'number' && p > 0);
      const priceMin = prices.length > 0 ? Math.min(...prices) : null;
      const priceMax = prices.length > 0 ? Math.max(...prices) : null;
      const priceRange = { min: priceMin, max: priceMax, unit: 'VND' };

      await client.query(query, [
        JSON.stringify(menu),
        priceMin,
        priceMax,
        JSON.stringify(priceRange),
        v.id
      ]);
      updateCount++;
    }
    
    console.log(`🎉 Supabase database menus sync completed successfully! Updated ${updateCount} records.`);
  } catch (err) {
    console.error(`❌ Failed to update Supabase database: ${err.message}`);
  } finally {
    if (client) {
      client.release();
    }
    process.exit(0);
  }
};

run();
