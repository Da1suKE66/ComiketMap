import { HALLS, hallFloor, isCorporate, type HallId } from "./model";

export type Point = [number, number];
export type VenueFloor = 1 | 2 | 4;
export const MAP_VERSION = "venue-2026-v1" as const;
export const SOURCES = {
  c109: { title: "C109 官方 別紙案内図", url: "https://www.comiket.co.jp/info-c/C109/C109AppealEnclosure.pdf", checked: "2026-11-09", pages: "第 2–5 页" },
  corporate: { title: "C108 官方企业手册（临时参考）", url: "https://www.comiket.co.jp/info-a/C108/C108kigyou/C108Kigyou_Booth_Pamphlet.pdf", checked: "2026-11-09", pages: "第 10–12 页" },
  building: { title: "东京 Big Sight 官方楼层图", url: "https://www.bigsight.jp/download/pdf/bigsight_map_color_j.pdf", checked: "2026-11-09", pages: "1F / 2F / 4F" },
  info: { title: "C109 官方馆区与时间", url: "https://www.comiket.co.jp/info-a/C109/C109Info.html", checked: "2026-11-09", pages: "场馆说明" },
  entry: { title: "C108 官方一般入场说明（临时参考）", url: "https://www.comiket.co.jp/info-a/C108/C108CtlgNotes.pdf", checked: "2026-11-09", pages: "第 10–11、18–19 页 · 东／西南入场分区" },
};
// Digitized relationships from C109 Appeal Enclosure, page 2. These coordinates
// are drawing units, never metres. The 4F footprints follow its 4F inset.
export const FOOTPRINTS: Record<HallId, Point[]> = {
  east1: [[383,280],[463,280],[463,365],[383,365]],
  east2: [[305,280],[383,280],[383,365],[305,365]],
  east3: [[225,280],[305,280],[305,365],[225,365]],
  east7: [[65,480],[168,480],[168,383],[127,383]],
  west1: [[575,192],[654,192],[654,264],[615,299],[575,320]],
  west2: [[660,192],[743,192],[743,320],[713,320],[674,299],[660,264]],
  south1: [[674,112],[748,112],[748,168],[732,180],[674,168]],
  south2: [[674,57],[748,57],[748,112],[674,112]],
  west3: [[575,251],[631,251],[631,301],[609,324],[575,324]],
  west4: [[575,192],[743,192],[743,251],[631,251],[631,237],[575,237]],
  south3: [[674,112],[748,112],[748,168],[732,180],[674,168]],
  south4: [[674,57],[748,57],[748,112],[674,112]],
};
export const CLOSED_HALLS = [
  { name: "东 4", polygon: [[350,393],[430,393],[430,476],[350,476]] as Point[] },
  { name: "东 5", polygon: [[270,393],[350,393],[350,476],[270,476]] as Point[] },
  { name: "东 6", polygon: [[189,393],[270,393],[270,476],[189,476]] as Point[] },
];
export const EAST8: Point[] = [[143,366],[168,366],[191,300],[171,294]];
export const CORRIDORS: { name: string; floor: VenueFloor; points: Point[]; width: number }[] = [
  { name: "ガレリア / Galleria", floor: 1, points: [[168,377],[430,377]], width: 24 },
  { name: "ブリッジ / 北コンコース", floor: 2, points: [[430,377],[514,435],[579,377],[610,377]], width: 23 },
  { name: "エントランスホール", floor: 2, points: [[610,377],[665,324]], width: 29 },
  { name: "南コンコース / 2F 连廊", floor: 2, points: [[665,324],[755,324],[764,190],[754,174]], width: 13 },
  { name: "西 4F 回廊", floor: 4, points: [[650,324],[650,265],[738,265]], width: 12 },
  { name: "屋上 / 南 4F 连廊", floor: 4, points: [[738,265],[768,265],[768,178],[755,174]], width: 12 },
];
export type VenueNode = { id: string; label: string; x: number; z: number; floor: VenueFloor; hall?: HallId };
const nodes: VenueNode[] = [
  { id:"eastEntry1",label:"东入场",x:38,z:411,floor:1 },
  { id:"eastEntryApproach1",label:"东入场后馆外通道",x:38,z:377,floor:1 },
  { id:"westSouthEntry2",label:"西南入场",x:585,z:515,floor:2 },
  { id:"entryPlaza2",label:"入口广场",x:585,z:430,floor:2 },
  { id:"entrance2",label:"入口大厅",x:610,z:377,floor:2 },
  { id:"north2",label:"北连廊",x:579,z:377,floor:2 },
  { id:"bridge2",label:"东／西联系桥",x:514,z:435,floor:2 },
  { id:"eastLobby2",label:"东馆楼梯上层",x:430,z:377,floor:2 },
  { id:"galleria1",label:"东馆 Galleria",x:430,z:377,floor:1 },
  { id:"galleriaMid1",label:"Galleria 中段",x:344,z:377,floor:1 },
  { id:"galleriaWest1",label:"Galleria 西端",x:265,z:377,floor:1 },
  { id:"link1",label:"东 7 链接空间",x:177,z:377,floor:1 },
  { id:"east1",label:"东 1 馆口",x:430,z:365,floor:1,hall:"east1" },
  { id:"east2",label:"东 2 馆口",x:344,z:365,floor:1,hall:"east2" },
  { id:"east3",label:"东 3 馆口",x:265,z:365,floor:1,hall:"east3" },
  { id:"east7",label:"东 7 馆口",x:168,z:397,floor:1,hall:"east7" },
  { id:"westLobby2",label:"西馆 2F 平台",x:665,z:324,floor:2 },
  { id:"atrium1",label:"西馆中庭",x:654,z:324,floor:1 },
  { id:"westLower1",label:"西馆中庭通道",x:654,z:303,floor:1 },
  { id:"west1",label:"西 1 馆口",x:615,z:299,floor:1,hall:"west1" },
  { id:"west1Exit1",label:"西 1 外侧出口",x:575,z:214,floor:1 },
  { id:"crosswalkWest1",label:"过街点 · 西侧",x:550,z:214,floor:1 },
  { id:"crosswalkEast1",label:"过街点 · 东侧",x:522,z:214,floor:1 },
  { id:"eastRear1",label:"东馆背面／货车场",x:478,z:265,floor:1 },
  { id:"eastSide1",label:"东馆侧通道",x:478,z:365,floor:1 },
  { id:"west2",label:"西 2 馆口",x:713,z:320,floor:1,hall:"west2" },
  { id:"southLink2",label:"西南 2F 连廊",x:755,z:324,floor:2 },
  { id:"southBend2",label:"南连廊转角",x:764,z:190,floor:2 },
  { id:"southLobby2",label:"南馆 2F 门厅",x:758,z:174,floor:2 },
  { id:"south1Upper2",label:"南 1 楼梯上层",x:758,z:143,floor:2 },
  { id:"south2Upper2",label:"南 2 楼梯上层",x:758,z:86,floor:2 },
  { id:"south1Lower1",label:"南 1 楼梯下层",x:758,z:143,floor:1 },
  { id:"south2Lower1",label:"南 2 楼梯下层",x:758,z:86,floor:1 },
  { id:"south1",label:"南 1 馆口",x:748,z:143,floor:1,hall:"south1" },
  { id:"south2",label:"南 2 馆口",x:748,z:86,floor:1,hall:"south2" },
  { id:"westUpper4",label:"西馆 4F 扶梯平台",x:650,z:324,floor:4 },
  { id:"westGallery4",label:"西 4F 回廊",x:650,z:285,floor:4 },
  { id:"westTop4",label:"西 4F 上层回廊",x:650,z:265,floor:4 },
  { id:"west3",label:"西 3 企业馆口",x:631,z:285,floor:4,hall:"west3" },
  { id:"west4",label:"西 4 企业馆口",x:695,z:251,floor:4,hall:"west4" },
  { id:"westRoof4",label:"西馆屋上通道",x:738,z:265,floor:4 },
  { id:"southLink4",label:"西南 4F 连廊",x:768,z:265,floor:4 },
  { id:"southLobby4",label:"南馆 4F 门厅",x:768,z:174,floor:4 },
  { id:"south3Lobby4",label:"南 3 上层通道",x:768,z:143,floor:4 },
  { id:"south4Lobby4",label:"南 4 上层通道",x:768,z:86,floor:4 },
  { id:"south3",label:"南 3 企业馆口",x:748,z:143,floor:4,hall:"south3" },
  { id:"south4",label:"南 4 企业馆口",x:748,z:86,floor:4,hall:"south4" },
];
export const VENUE_NODES = Object.fromEntries(nodes.map(n => [n.id,n])) as Record<string,VenueNode>;
// This is a user-requested reference transfer, not a confirmed all-day C109 rule.
// Keep it separate from the building graph: it is used only for west/south -> east.
export const OUTDOOR_TRANSFER = ["west1", "west1Exit1", "crosswalkWest1", "crosswalkEast1", "eastRear1", "eastSide1", "galleria1"] as const;
export const ENTRY_STARTS = ["eastEntry1", "westSouthEntry2"] as const;
export const TRANSFER_NOTE = "西 1 外侧出口 → 过马路 → 东馆背面／货车场 → 东馆侧通道。按你的参考动线加入；C109 开会后通行口与过街位置待确认，以现场引导为准。";
export const isHallTransfer = (a:string,b:string) => a==="west1"&&b==="west1Exit1";
const pairs = [
  ["entrance2","north2"],["north2","bridge2"],["bridge2","eastLobby2"],["eastLobby2","galleria1"],
  ["galleria1","east1"],["galleria1","galleriaMid1"],["galleriaMid1","east2"],["galleriaMid1","galleriaWest1"],["galleriaWest1","east3"],["galleriaWest1","link1"],["link1","east7"],
  ["entrance2","westLobby2"],["westLobby2","atrium1"],["atrium1","westLower1"],["westLower1","west1"],["atrium1","west2"],
  ["westLobby2","southLink2"],["southLink2","southBend2"],["southBend2","southLobby2"],["southLobby2","south1Upper2"],["south1Upper2","south2Upper2"],["south1Upper2","south1Lower1"],["south1Lower1","south1"],["south2Upper2","south2Lower1"],["south2Lower1","south2"],
  ["westLobby2","westUpper4"],["westUpper4","westGallery4"],["westGallery4","west3"],["westGallery4","westTop4"],["westTop4","west4"],["westTop4","westRoof4"],["westRoof4","southLink4"],["southLink4","southLobby4"],["southLobby4","south3Lobby4"],["south3Lobby4","south3"],["south3Lobby4","south4Lobby4"],["south4Lobby4","south4"],
] as const;
function edge(a:string,b:string,kind:"building"|"entry"|"outdoor"="building") { return { a,b,kind,directed:kind!=="building",vertical:VENUE_NODES[a].floor !== VENUE_NODES[b].floor, cost: Math.hypot(VENUE_NODES[a].x-VENUE_NODES[b].x,VENUE_NODES[a].z-VENUE_NODES[b].z)+Math.abs(VENUE_NODES[a].floor-VENUE_NODES[b].floor)*32 }; }
export const VENUE_EDGES = [...pairs.map(([a,b])=>edge(a,b)),edge("eastEntry1","eastEntryApproach1","entry"),edge("eastEntryApproach1","link1","entry"),edge("westSouthEntry2","entryPlaza2","entry"),edge("entryPlaza2","entrance2","entry"),...OUTDOOR_TRANSFER.slice(1).map((id,i)=>edge(OUTDOOR_TRANSFER[i],id,"outdoor"))];
export const STARTS = [...ENTRY_STARTS,"entrance2","galleria1","atrium1","southLobby2"] as const;
export const isEastNode = (id:string) => id.startsWith("east")||id.startsWith("galleria")||id==="link1";
export const polygonPath = (p:Point[]) => p.map((v,i) => `${i ? "L" : "M"}${v[0]},${v[1]}`).join(" ")+"Z";
export function hallBounds(hall: HallId) { const p=FOOTPRINTS[hall];const x=Math.min(...p.map(v=>v[0])),z=Math.min(...p.map(v=>v[1]));return {x,z,w:Math.max(...p.map(v=>v[0]))-x,h:Math.max(...p.map(v=>v[1]))-z}; }
export function hallCenter(hall: HallId):Point { const b=hallBounds(hall);return [b.x+b.w/2,b.z+b.h/2]; }
export const floorHeight = (floor:VenueFloor, exploded = false) => floor===1 ? 0 : floor===2 ? (exploded?28:15) : (exploded?88:39);
export const hallColor = (hall:HallId) => isCorporate(hall) ? "#baa4cb" : hall.startsWith("east") ? "#93b5ac" : hall.startsWith("west") ? "#9daeca" : "#afbc87";
export function hallReference(hall:HallId) { return { ...SOURCES[isCorporate(hall)?"corporate":"c109"], image:`/maps/${hall}.webp`, page:isCorporate(hall)?(hall.startsWith("west")?10:12):hall.startsWith("east")?(hall==="east7"?4:3):5 }; }
export const HALL_CATALOG = HALLS.map(h=>({...h, floor:hallFloor(h.id), kind:isCorporate(h.id)?"企业":"同人"}));
export function hallNotes(hall:HallId,day:number){
  const notes:string[]=[];
  if(hall.startsWith("east")&&hall!=="east7"){notes.push("C109 三天均无 ア 区 89–92 的摊位配置。");if(day===3)notes.push("DAY 3 无 イ 区。");}
  if(hall==="east7"&&day===3)notes.push("C109 DAY 3 无 N、O 区。");
  if(hall==="west1"||hall==="west2"){notes.push("C109 三天均无 あ 区 16–21／35／62–65、め 区 20／62–65 的配置。");if(day===2)notes.push("DAY 2 无 き 区。");}
  if(isCorporate(hall))notes.push("企业详细排布为 C108 参考，不能据此确认 C109 企业编号或出展公司。");
  return notes;
}
