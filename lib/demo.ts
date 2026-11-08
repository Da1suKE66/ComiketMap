import { type AppData, type Booth, type HallId, type Item } from "./model";
export function demoData(): AppData {
  const rows: [string, string, HallId, string, string, Booth["priority"], number, number, number, Booth["day"]][] = [
    ["雨の日レコード", "あめ / ame", "east1", "ア", "24a", "must", 186000, .28, .35, 1],
    ["青い栞", "shiori", "east2", "コ", "12b", "must", 92000, .64, .56, 1],
    ["ひだまり工房", "こはる", "east3", "シ", "08a", "want", 64000, .37, .7, 1],
    ["夜航星", "yoru", "east7", "A", "16ab", "must", 320000, .6, .32, 1],
    ["月と喫茶", "月野", "west1", "あ", "32a", "want", 28500, .29, .38, 1],
    ["KUMO STUDIO", "くも", "south1", "a", "05b", "maybe", 16800, .7, .63, 1],
    ["白昼夢ノート", "mio", "west2", "け", "18a", "want", 78000, .53, .43, 2],
    ["風のアトリエ", "風見", "south2", "m", "27b", "maybe", 12000, .37, .63, 2],
    ["ORBITAL", "sora", "east1", "イ", "04b", "must", 254000, .77, .67, 2],
    ["小さな惑星", "ほし", "east3", "ト", "36a", "want", 41000, .65, .34, 3],
    ["余白の庭", "yohaku", "west1", "え", "09b", "maybe", 8300, .71, .65, 3],
    ["橙色の手紙", "だいだい", "south2", "n", "14a", "want", 59000, .68, .31, 3],
  ];
  const booths: Booth[] = rows.map((r, index) => {
    const items: Item[] = index % 3 === 2 ? [] : [{ id: `demo-item-${index}`, name: index === 0 ? "雨のあとで · 新刊" : index === 1 ? "冬の栞 · イラスト集" : "冬コミ新刊セット", kind: index === 1 ? "画集" : "本子", price: index === 3 ? null : [1000, 1500, 800, 2000][index % 4], selfQuantity: 1, selfPurchased: 0,
      orders: index === 0 ? [{ id: "demo-order-a", recipientId: "recipient-a", quantity: 1, purchased: 0 }, { id: "demo-order-b", recipientId: "recipient-b", quantity: 1, purchased: 0 }] : index === 1 ? [{ id: "demo-order-c", recipientId: "recipient-a", quantity: 2, purchased: 0 }] : [] }];
    return { id: `demo-booth-${index}`, circle: r[0], artist: r[1], hall: r[2], block: r[3], space: r[4], priority: r[5], fans: r[6], x: r[7], y: r[8], day: r[9], status: items.length ? "published" : "pending", visit: "planned", xHandle: "", notes: index === 0 ? "新刊优先，记得分别给 A 和 B 各带一本。这里是虚构示例，可自由编辑。" : "虚构演示摊位，地点与坐标仅供体验。", images: index === 0 ? [{ id: "demo-image", name: "示例品书.svg", src: "/demo-menu.svg" }] : [], items };
  });
  return { version: 1, demo: true, updatedAt: new Date().toISOString(), booths, recipients: [{ id: "recipient-a", name: "A", note: "示例代购对象" }, { id: "recipient-b", name: "B", note: "示例代购对象" }], floorplans: {} };
}
