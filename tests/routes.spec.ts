import {test,expect} from "@playwright/test";
import {demoData} from "../lib/demo";
import {HALLS,dataSchema,hallFloor} from "../lib/model";
import {buildRoute,cleanRoutePlans,defaultPlan,priorityRoute,routeText,shortestPath,walkingPath} from "../lib/routes";
import {ENTRY_STARTS,OUTDOOR_TRANSFER,VENUE_EDGES,VENUE_NODES} from "../lib/venue";

test("all twelve halls are reachable and corporate destinations require a 4F transition",()=>{
  expect(HALLS).toHaveLength(12);
  for(const hall of HALLS){const path=shortestPath("entrance2",hall.id);expect(path).not.toBeNull();expect(path!.path.at(-1)).toBe(hall.id);expect(VENUE_NODES[hall.id].floor).toBe(hallFloor(hall.id));if(hallFloor(hall.id)===4)expect(path!.path.some(id=>VENUE_NODES[id].floor===4)).toBe(true);}
  expect(Object.keys(VENUE_NODES).some(id=>["east4","east5","east6","east8"].includes(id))).toBe(false);
  for(const edge of VENUE_EDGES)expect(edge.vertical).toBe(VENUE_NODES[edge.a].floor!==VENUE_NODES[edge.b].floor);
});
test("routes traverse only defined graph edges and count real floor changes",()=>{
  const plan={...defaultPlan(),stops:["hall:east7","hall:west3","hall:south4"]};const route=buildRoute(demoData().booths,plan,1);expect(route.stops).toHaveLength(3);expect(route.transitions).toBeGreaterThan(0);
  route.path.slice(1).forEach((n,i)=>expect(VENUE_EDGES.some(e=>(e.a===route.path[i].id&&e.b===n.id)||(e.b===route.path[i].id&&e.a===n.id))).toBe(true));
});
test("priority order stays within one day and excludes visited or sold-out booths",()=>{
  const data=demoData();data.booths[0].visit="visited";data.booths[1].visit="soldout";const ids=priorityRoute(data.booths,1,"entrance2");expect(ids).not.toContain("booth:demo-booth-0");expect(ids).not.toContain("booth:demo-booth-1");expect(ids).not.toContain("booth:demo-booth-6");expect(ids[0]).toBe("booth:demo-booth-3");
});
test("legacy notebook compatibility, route validation and cleanup preserve unrelated purchases",()=>{
  const data=demoData();expect(dataSchema.safeParse(data).success).toBe(true);data.routePlans={"1":{...defaultPlan(),stops:["booth:demo-booth-0","hall:west4"]}};expect(dataSchema.parse(JSON.parse(JSON.stringify(data)))).toEqual(data);
  data.routePlans["1"]!.stops.push("booth:demo-booth-6");expect(dataSchema.safeParse(data).success).toBe(false);data.routePlans["1"]!.stops.pop();data.booths=data.booths.filter(b=>b.id!=="demo-booth-0");const cleaned=cleanRoutePlans(data);expect(cleaned.routePlans!["1"]!.stops).toEqual(["hall:west4"]);expect(dataSchema.safeParse(cleaned).success).toBe(true);expect(cleaned.booths[0].items[0].orders[0].quantity).toBe(2);
});
test("east and west/south entry origins reach every hall without making queues a through-route",()=>{
  for(const start of ENTRY_STARTS)for(const hall of HALLS){const result=walkingPath(start,hall.id);expect(result).not.toBeNull();expect(result!.path[0]).toBe(start);expect(result!.path.at(-1)).toBe(hall.id);}
  expect(shortestPath("east1","eastEntry1")).toBeNull();expect(shortestPath("west1","westSouthEntry2")).toBeNull();
});
test("west/south to east explicitly passes the West 1 exit, crossing and East rear in order",()=>{
  for(const start of ["west1","west2","west3","south4","westSouthEntry2"]){const result=walkingPath(start,"east2")!;const index=result.path.indexOf("west1");expect(result.path.slice(index,index+OUTDOOR_TRANSFER.length)).toEqual([...OUTDOOR_TRANSFER]);expect(result.path).not.toContain("bridge2");}
  const indoor=walkingPath("west1","east2","indoor")!;expect(indoor.path).toContain("bridge2");expect(indoor.path).not.toContain("crosswalkEast1");
  const reverse=walkingPath("east2","west1")!;expect(reverse.path).not.toContain("crosswalkEast1");expect(reverse.path).toContain("bridge2");
  const route=buildRoute([], {...defaultPlan(),stops:["hall:east1"]},1);expect(route.outdoorTransfers).toBe(1);expect(routeText(route,1)).toContain("东馆背面／货车场");expect(routeText(route,1)).toContain("待确认");
});
test("old daily plans without a transfer preference remain valid and use the outdoor reference",()=>{
  const data=demoData();data.routePlans={"1":{start:"atrium1",enabled:true,stops:["hall:east3"]}};const parsed=dataSchema.parse(data);const route=buildRoute(parsed.booths,parsed.routePlans!["1"]!,1);expect(route.outdoorTransfers).toBe(1);expect(parsed.routePlans!["1"]!.transfer).toBeUndefined();
});
