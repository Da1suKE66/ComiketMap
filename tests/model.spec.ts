import { test, expect } from "@playwright/test";
import { demoData } from "../lib/demo";
import { completeBoothDraft, csvText, dataSchema, emptyData, itemPurchased, itemTotal, newBoothDraft, totals } from "../lib/model";

test("A and B retain separate quantities, planned costs and actual costs", () => {
  const data = demoData(); const booth = data.booths[0], item = booth.items[0];
  expect(dataSchema.safeParse(data).success).toBe(true);
  expect(itemTotal(item)).toBe(3); expect(item.orders.map(o => [o.recipientId, o.quantity])).toEqual([["recipient-a", 1], ["recipient-b", 1]]);
  item.orders[0].purchased = 1;
  expect(itemPurchased(item)).toBe(1); expect(totals([booth])).toMatchObject({ quantity: 3, proxy: 2, estimate: 3000, spent: 1000, purchased: 1 });
  expect(item.orders[1].purchased).toBe(0); expect(item.selfPurchased).toBe(0);
});
test("unknown prices stay unknown and zero is an explicitly free item", () => {
  const data = demoData(), b = data.booths[0]; b.items[0].price = null;
  expect(totals([b])).toMatchObject({ unknown: 3, estimate: 0 });
  b.items[0].price = 0; expect(totals([b])).toMatchObject({ unknown: 0, estimate: 0 });
});
test("backup validation rejects invalid dates, dangling recipients and over-purchases", () => {
  const data = demoData();
  const invalidDay = JSON.parse(JSON.stringify(data)); invalidDay.booths[0].day = 4;
  expect(dataSchema.safeParse(invalidDay).success).toBe(false);
  data.recipients = []; expect(dataSchema.safeParse(data).success).toBe(false);
  const second = demoData(); second.booths[0].items[0].orders[0].purchased = 2;
  expect(dataSchema.safeParse(second).success).toBe(false);
});
test("backup validation rejects duplicate allocations, duplicate IDs, executable images and invalid coordinates", () => {
  const dup = demoData(); dup.booths[0].items[0].orders[1].recipientId = "recipient-a";
  expect(dataSchema.safeParse(dup).success).toBe(false);
  const ids = demoData(); ids.booths[1].id = ids.booths[0].id; expect(dataSchema.safeParse(ids).success).toBe(false);
  const src = demoData(); src.booths[0].images[0].src = "javascript:alert(1)"; expect(dataSchema.safeParse(src).success).toBe(false);
  const xy = demoData(); xy.booths[0].x = -1; expect(dataSchema.safeParse(xy).success).toBe(false);
});
test("JSON roundtrip preserves images, positions and per-person purchases", () => {
  const original = demoData(); expect(dataSchema.parse(JSON.parse(JSON.stringify(original)))).toEqual(original);
});
test("CSV safely escapes formulas, commas, quotes and multiline names", () => {
  const result = csvText([["=SUM(A1)", "@user", "A, B", 'say "hi"', "a\nb"]]);
  expect(result).toContain('"\'=SUM(A1)"'); expect(result).toContain('"\'@user"'); expect(result).toContain('"A, B"'); expect(result).toContain('"say ""hi"""'); expect(result).toContain('"a\nb"');
});
test("unassigned names roundtrip without a fabricated day or hall and promote only with a valid address", () => {
  const draft = { ...newBoothDraft(), circle: "未公布地点的画师", artist: "画师", xHandle: "example", notes: "等更新" };
  const data = { ...emptyData(), boothDrafts: [draft] };
  expect(dataSchema.parse(JSON.parse(JSON.stringify(data)))).toEqual(data);
  expect(completeBoothDraft(draft)).toBeNull();
  expect(completeBoothDraft({ ...draft, day: 3, hall: "east3", block: "ア", space: "64ab" })).toMatchObject({ id: draft.id, day: 3, hall: "east3", block: "ア", space: "64ab", xHandle: "example", notes: "等更新", images: [], items: [] });
  expect(completeBoothDraft({ ...draft, day: 1, hall: "east1", block: "ア", space: "invalid" })).toBeNull();
  const conflict = demoData(); conflict.boothDrafts = [{ ...draft, id: conflict.booths[0].id }];
  expect(dataSchema.safeParse(conflict).success).toBe(false);
  expect(dataSchema.safeParse({ ...data, routePlans: { "1": { start: "eastEntry2", enabled: true, stops: [`booth:${draft.id}`] } } }).success).toBe(false);
});
