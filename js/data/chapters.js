// เนื้อกลอนคัดจาก "ประชุมกลอนนิราศต่างๆ ภาคที่ ๑" (หอสมุดวชิรญาณ) คงอักขรวิธีตามต้นฉบับ
// นิราศเรื่องนี้เล่าด้วยน้ำเสียงของ "เณรหนูพัด" บุตรชายสุนทรภู่ ที่ตามบิดาไปกรุงเก่าเพื่อหาลายแทงยาอายุวัฒนะ
export const CHAPTERS = [
  {
    id: 1,
    thaiNum: '๑',
    title: 'บทที่ ๑: ออกเรือจากวัดโพธิ์ ล่องสู่เจ้าพระยา',
    location: 'วัดพระเชตุพน — วัดระฆัง',
    skyColor: '#f3ebd9',
    waterDeep: '#1e3b4d',
    waterShallow: '#688c96',
    artTheme: 'wat_pho',
    backdropParts: {
      sky: './assets/art/ch1-sky.png',
      temple: './assets/art/ch1-temple.png',
      foliage: './assets/art/ch1-foliage.png'
    },
    boatSpritePath: './assets/art/main-boat.png',
    verse: `พอออกเรือเมื่อตวันสายัณห์ย่ำ
ลอองน้ำค้างย้อยเปนฝอยฝน
ตลึงเหลียวเปลี่ยวเปล่าเมื่อคราวจน
ไม่มีคนเกื้อหนุนกรุณา`,
    narrative:
      'เณรหนูพัดเล่าว่าตามบิดา (สุนทรภู่) ออกเรือจากวัดพระเชตุพนยามเย็น มุ่งขึ้นไปกรุงเก่าเพื่อตามหายาอายุวัฒนะตามลายแทง ก่อนล่องต่อเรือแวะบังคมพระบรมธาตุที่วัดระฆัง',
    minigame: {
      type: 'paddle_rhythm',
      genreLabel: 'เกมจับจังหวะ (Rhythm)',
      title: 'ประคองฝีพายออกปากคลอง',
      instruction: 'แตะหรือคลิกที่ผิวน้ำตามจังหวะวงกลมสีทองขยายตัว เพื่อจ้วงพายเรือออกจากท่า (ครบ 5 ครั้ง)'
    }
  },
  {
    id: 2,
    thaiNum: '๒',
    title: 'บทที่ ๒: บางกอกน้อยถึงตลาดขวัญ',
    location: 'บางกอกน้อย — ตลาดขวัญ',
    skyColor: '#efe2c6',
    waterDeep: '#244554',
    waterShallow: '#7ba0a8',
    artTheme: 'bangkok_noi',
    backdropParts: {
      sky: './assets/art/ch2-sky.png',
      temple: './assets/art/ch2-temple.png',
      foliage: './assets/art/ch2-foliage.png',
      boatProp: './assets/art/ch2-boat-prop.png'
    },
    boatSpritePath: './assets/art/main-boat.png',
    verse: `ถึงบางแวกแยกคลองเปนสองทาง
เหมือนจืดจางใจแยกไปแตกกัน
ตลาดขวัญขวัญฉันนี้ขวัญหาย
ใครเขาขายขวัญฤๅจะซื้อขวัญ`,
    narrative:
      'เรือผ่านปากง่าม บางกอกน้อย บางพรหม บางจาก บางพลู บางอ้อ บางซ่อน บางเขน ตลาดแก้ว บางขวาง บางแวก จนถึงตลาดขวัญ ผู้เล่าหยิบชื่อแต่ละย่านมาเล่นคำ รำพันถึงความรักและความตกอับ',
    minigame: {
      type: 'lotus_collect',
      genreLabel: 'เกมเก็บของลอยน้ำ (Reaction)',
      title: 'ช้อนดอกบัวหลวงกลางสายน้ำ',
      instruction: 'คลิกหรือแตะเก็บดอกบัวสีชมพูที่ลอยผ่านสายน้ำให้ครบ 6 ดอก (ระวังอย่าเผลอเก็บกอจอกแหน แต่ไม่มีการหักคะแนน)'
    }
  },
  {
    id: 3,
    thaiNum: '๓',
    title: 'บทที่ ๓: ถิ่นมอญปากเกร็ด สู่สามโคกปทุมธานี',
    location: 'ปากเกร็ด — สามโคก — เกาะเกิด',
    skyColor: '#e8d7b9',
    waterDeep: '#2b4c59',
    waterShallow: '#8aa8a8',
    artTheme: 'sam_khok',
    backdropParts: {
      sky: './assets/art/ch3-sky.png',
      temple: './assets/art/ch3-temple.png',
      foliage: './assets/art/ch3-foliage.png'
    },
    boatSpritePath: './assets/art/main-boat.png',
    verse: `ครั้งพระโกษฐโปรดปรานประทานแปลง
ที่ตำแหน่งมอญมาสามิภักดิ์
ชื่อประทุมธานีที่เสด็จ
เดือนสิบเบ็ดบัวออกทั้งดอกฝัก`,
    narrative:
      'จากปากเกร็ดซึ่งเป็นถิ่นชาวมอญ เรือผ่านบางพูด วัดเทียนถวาย คืนหนึ่งคณะค้างแรมที่ป่าช้าวัดมอญใต้ต้นไทรจนเจอเรื่องขนพองสยองเกล้า ก่อนผ่านบางหลวงและบ้านกระแชง ถึงสามโคก ซึ่งผู้เล่ากล่าวถึงที่มาของชื่อสามโคกและเมืองปทุมธานี',
    minigame: {
      type: 'wind_steer',
      genreLabel: 'เกมประคองทิศทาง (Steering)',
      title: 'บังคับเรือรับกระแสลมสู่กรุงเก่า',
      instruction: 'เลื่อนเมาส์หรือลากนิ้วซ้าย-ขวา เพื่อประคองเรือให้แล่นผ่านช่องกระแสลมสีทองจนเต็ม 100%'
    }
  },
  {
    id: 4,
    thaiNum: '๔',
    title: 'บทที่ ๔: กรุงเก่า วัดพนัญเชิง และลายแทงวัดเจ้าฟ้าอากาศ',
    location: 'วัดพนัญเชิง — วัดเจ้าฟ้าอากาศ — อยุธยา',
    skyColor: '#e3cda8',
    waterDeep: '#233947',
    waterShallow: '#7c8f94',
    artTheme: 'wat_chao_fa',
    backdropParts: {
      sky: './assets/art/ch4-sky.png',
      temple: './assets/art/ch4-temple.png',
      foliage: './assets/art/ch4-foliage.png'
    },
    boatSpritePath: './assets/art/main-boat.png',
    verse: `วัดเจ้าฟ้าอากาศนารถนรินทร์
ให้ทราบสิ้นสืบสายเพราะลายแทง
เปนตำรามาแต่เหนือท่านเชื่อถือ
ดูหนังสือเสาะหาอุส่าห์แสวง`,
    narrative:
      'ถึงอยุธยา คณะนมัสการพระใหญ่วัดพนัญเชิง (ในเรื่องเรียกว่า "วัดเจ้าฟ้าพระกลาโหม") แล้วไปวัดใหญ่ชัยมงคลเพื่อตามหาพระปรอทแต่ไม่พบ จึงเดินเท้าข้ามทุ่งไปวัดเจ้าฟ้าอากาศตามลายแทง วัดร้างกลางทุ่งที่ปัจจุบันยังถกเถียงกันว่าตรงกับวัดใด',
    minigame: {
      type: 'pagoda_rubbing',
      genreLabel: 'เกมขูดเผยภาพ (Scratch / Reveal)',
      title: 'ปัดฝุ่นใบไม้ เผยลายแทงยาอายุวัฒนะ',
      instruction: 'กดค้างแล้วลากเมาส์หรือนิ้วถูบนแผ่นศิลาโบราณ เพื่อปัดคราบตะไคร่ออกและเผยข้อความลายแทง'
    }
  },
  {
    id: 5,
    thaiNum: '๕',
    title: 'บทที่ ๕: พายุขัดพิธี ลายแทงสูญ ล่องกลับพระนคร',
    location: 'วัดเจ้าฟ้าอากาศ — ล่องกลับพระนคร',
    skyColor: '#3b3f5c',
    waterDeep: '#182b38',
    waterShallow: '#58727d',
    artTheme: 'return_journey',
    backdropParts: {
      sky: './assets/art/ch5-sky.png',
      temple: './assets/art/ch5-temple.png',
      foliage: './assets/art/ch5-foliage.png'
    },
    boatSpritePath: './assets/art/main-boat.png',
    verse: `มาเห็นฤทธิ์กฤษณาอานุภาพ
ก็เข็ดหลาบลมพาตำราหาย
ได้กรวดน้ำคว่ำขันจนวันตาย
ให้ภูตพรายไพรโขมดที่โขดดิน`,
    narrative:
      'คืนทำพิธีเบิกฤกษ์ตามตำรา เกิดพายุฝนลูกเห็บ ผู้เล่าสลบไปครู่หนึ่ง ตื่นมาผ้าห่มปลิวหาย เมื่อเข็ดหลาบจึงถวายวัดและเลิกตามลายแทง เดินกลับลงเรือ แวะรับอาหารที่บ้านพระยารักษากรุง แล้วล่องกลับพระนคร',
    minigame: {
      type: 'verse_weave',
      genreLabel: 'เกมเรียงร้อยบทกลอน (Poetry Puzzle)',
      title: 'ร้อยเรียงบทกลอนตอนลายแทงสูญ',
      instruction: 'เลือกคลิกวรรคกลอนด้านล่างมาเรียงต่อกันให้ครบทั้ง ๔ วรรค (คำท้ายวรรคที่ ๒ สัมผัสกับวรรคที่ ๓)'
    }
  }
];
