import {test,expect} from "@playwright/test";
import {demoData} from "../lib/demo";
import {HALLS,dataSchema,hallFloor} from "../lib/model";
import {buildRoute,cleanRoutePlans,defaultPlan,priorityRoute,routeText,shortestPath,walkingPath} from "../lib/routes";
import {ENTRY_STARTS,OUTDOOR_TRANSFER,VENUE_EDGES,VENUE_NODES,isHallTransfer} from "../lib/venue";

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
  for(const start of ENTRY_STARTS)for(const hall of HALLS){const result=walkingPath(start,hall.id);expect(result).not.toBeNull();expect(result!.path[0]).toBe(start);expect(VENUE_NODES[result!.path.at(-1)!].hall).toBe(hall.id);}
  expect(shortestPath("east1","eastEntry2")).toBeNull();expect(shortestPath("west1","westSouthEntry4")).toBeNull();
});
test("west/south to east explicitly passes the West 1 exit, crossing and East rear in order",()=>{
  for(const start of ["west1","west2","west3","south4","westSouthEntry4"]){const result=walkingPath(start,"east2")!;const index=result.path.indexOf("west1");expect(result.path.slice(index,index+OUTDOOR_TRANSFER.length)).toEqual([...OUTDOOR_TRANSFER]);expect(result.path).not.toContain("bridge2");}
  const indoor=walkingPath("west1","east2","indoor")!;expect(indoor.path).toContain("bridge2");expect(indoor.path).not.toContain("crosswalkEast1");
  const reverse=walkingPath("east2","west1")!;expect(reverse.path).not.toContain("crosswalkEast1");expect(reverse.path).toContain("bridge2");
  const route=buildRoute([], {...defaultPlan(),stops:["hall:east1"]},1);expect(route.outdoorTransfers).toBe(1);expect(routeText(route,1)).toContain("东馆背面／货车场");expect(routeText(route,1)).toContain("对应馆背面入口直接进馆");
});
test("old daily plans without a transfer preference remain valid and use the outdoor reference",()=>{
  const data=demoData();data.routePlans={"1":{start:"atrium1",enabled:true,stops:["hall:east3"]}};const parsed=dataSchema.parse(data);const route=buildRoute(parsed.booths,parsed.routePlans!["1"]!,1);expect(route.outdoorTransfers).toBe(1);expect(parsed.routePlans!["1"]!.transfer).toBeUndefined();
});

test("South 3/4 admission stays on 4F for corporate halls and uses the South escalator for 1F",()=>{
  const start=VENUE_NODES.westSouthEntry4;expect(start.floor).toBe(4);expect(start.z).toBeLessThan(200);
  for(const hall of ["south3","south4","west3","west4"]){const path=walkingPath(start.id,hall)!;expect(path.path.every(id=>VENUE_NODES[id].floor===4)).toBe(true);}
  const lower=walkingPath(start.id,"south1")!;expect(lower.path).toContain("southLobby4");expect(lower.path).toContain("southLobby2");expect(lower.path).not.toContain("westLobby2");
  for(const origin of ["eastEntry2","circleEntry2"]){expect(VENUE_NODES[origin].z).toBeGreaterThan(480);const east=walkingPath(origin,"east2")!;expect(east.path).toContain("bridge2");expect(east.path).not.toContain("west1Exit1");expect(east.path.at(-1)).toBe("east2");}
});
test("each East 1-3 destination is reached at its own rear door without a side detour or hall crossing",()=>{
  for(const hall of ["east1","east2","east3"]){const result=walkingPath("west1",hall)!;expect(result.path.at(-1)).toBe(hall+"Rear1");expect(VENUE_NODES[result.path.at(-1)!].z).toBe(280);expect(result.path).not.toContain("galleria1");expect(result.path).not.toContain("galleriaMid1");expect(result.path).not.toContain("eastSide1");expect(result.path.slice(result.path.indexOf("eastRear1")).some((id,i,ids)=>i>0&&isHallTransfer(ids[i-1],id))).toBe(false);}
  const route=buildRoute([],{...defaultPlan(),stops:["hall:east1","hall:east2","hall:east3"]},1);expect(route.legs.map(leg=>leg.to)).toEqual(["east1Rear1","east2Rear1","east3Rear1"]);expect(route.legs[1].from).toBe(route.legs[0].to);expect(route.legs[1].nodes.some(n=>n.id.startsWith("galleria"))).toBe(false);expect(route.outdoorTransfers).toBe(1);
  const back=walkingPath("east2Rear1","west2")!;expect(back.path).toContain("bridge2");expect(back.path.slice(1).some((id,i)=>isHallTransfer(back.path[i],id))).toBe(true);
});
test("previous entrance IDs migrate while daily stop order and all purchase records remain intact",()=>{
  const original=demoData(),stops=["booth:demo-booth-0","hall:west4"];
  const parsed=dataSchema.parse({...original,routePlans:{"1":{start:"westSouthEntry2",enabled:true,stops},"2":{start:"eastEntry1",enabled:false,stops:["hall:south3"]}}});expect(parsed.routePlans!["1"]!.start).toBe("westSouthEntry4");expect(parsed.routePlans!["2"]!.start).toBe("eastEntry2");expect(parsed.routePlans!["1"]!.stops).toEqual(stops);expect(parsed.booths).toEqual(original.booths);expect(dataSchema.parse(parsed)).toEqual(parsed);
});
