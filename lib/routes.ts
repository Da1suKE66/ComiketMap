import { HALLS, hallFloor, hallName, type AppData, type Booth, type HallId, type RoutePlan } from "./model";
import { OUTDOOR_TRANSFER, TRANSFER_NOTE, VENUE_EDGES, VENUE_NODES, isEastNode, type VenueNode } from "./venue";
export const defaultPlan = ():RoutePlan => ({start:"westSouthEntry2",transfer:"west1-outdoor",stops:[],enabled:true});
export function shortestPath(start:string,end:string) {
  if(!VENUE_NODES[start]||!VENUE_NODES[end]) return null;
  const distance:Record<string,number>={[start]:0},previous:Record<string,string>={},pending=new Set(Object.keys(VENUE_NODES));
  while(pending.size){ const current=[...pending].sort((a,b)=>(distance[a]??Infinity)-(distance[b]??Infinity))[0];if(!Number.isFinite(distance[current]))break;pending.delete(current);if(current===end)break;
    for(const edge of VENUE_EDGES){if(edge.kind==="outdoor")continue;const other=edge.a===current?edge.b:!edge.directed&&edge.b===current?edge.a:null;if(!other||!pending.has(other))continue;const next=distance[current]+edge.cost;if(next<(distance[other]??Infinity)){distance[other]=next;previous[other]=current;}}
  }
  if(!Number.isFinite(distance[end]))return null;const path=[end];while(path[0]!==start){const p=previous[path[0]];if(!p)return null;path.unshift(p);}return {path,cost:distance[end]};
}
/** Event transfer policy is applied per leg, without turning a schematic bridge into an event rule. */
export function walkingPath(start:string,end:string,transfer:RoutePlan["transfer"]="west1-outdoor"){
  if(transfer!=="west1-outdoor"||isEastNode(start)||!isEastNode(end))return shortestPath(start,end);
  const before=shortestPath(start,"west1"),after=shortestPath("galleria1",end);if(!before||!after)return null;
  const crossingCost=OUTDOOR_TRANSFER.slice(1).reduce((sum,id,i)=>sum+(VENUE_EDGES.find(e=>e.a===OUTDOOR_TRANSFER[i]&&e.b===id)?.cost??0),0);
  return {path:[...before.path,...OUTDOOR_TRANSFER.slice(1),...after.path.slice(1)],cost:before.cost+crossingCost+after.cost};
}
export type RouteStop={id:string;label:string;hall:HallId;booth?:Booth};
export function resolveStop(id:string,booths:Booth[],day:number):RouteStop|null {
  if(id.startsWith("hall:")){const hall=id.slice(5) as HallId;return HALLS.some(h=>h.id===hall)?{id,label:`${hallName(hall)} 馆口`,hall}:null;}
  if(id.startsWith("booth:")){const booth=booths.find(b=>b.id===id.slice(6)&&b.day===day);return booth?{id,label:booth.circle,hall:booth.hall,booth}:null;}return null;
}
export function buildRoute(booths:Booth[],plan:RoutePlan,day:number){
  const stops:RouteStop[]=[],missing:string[]=[],legs:{from:string;to:string;nodes:VenueNode[];stop:RouteStop}[]=[];let last:string=plan.start;const path:VenueNode[]=[VENUE_NODES[last]];
  for(const id of plan.stops){const stop=resolveStop(id,booths,day);if(!stop){missing.push(id);continue;}const result=walkingPath(last,stop.hall,plan.transfer);if(!result){missing.push(id);continue;}const nodes=result.path.map(id=>VENUE_NODES[id]);stops.push(stop);legs.push({from:last,to:stop.hall,nodes,stop});path.push(...nodes.slice(1));last=stop.hall;}
  const transitions=path.slice(1).filter((n,i)=>n.floor!==path[i].floor).length;
  return {start:VENUE_NODES[plan.start],transfer:plan.transfer??"west1-outdoor",stops,missing,legs,path,transitions,outdoorTransfers:path.filter(n=>n.id==="crosswalkEast1").length,halls:new Set(stops.map(s=>s.hall)).size};
}
export type BuiltRoute=ReturnType<typeof buildRoute>;
export function priorityRoute(booths:Booth[],day:number,start:RoutePlan["start"],transfer:RoutePlan["transfer"]="west1-outdoor"){
  let current:string=start;const remaining=booths.filter(b=>b.day===day&&b.visit==="planned"),ids:string[]=[];const rank={must:0,want:1,maybe:2};
  while(remaining.length){remaining.sort((a,b)=>rank[a.priority]-rank[b.priority]||((walkingPath(current,a.hall,transfer)?.cost??Infinity)-(walkingPath(current,b.hall,transfer)?.cost??Infinity))||a.id.localeCompare(b.id));const next=remaining.shift()!;ids.push(`booth:${next.id}`);current=next.hall;}return ids;
}
export function cleanRoutePlans(data:AppData):AppData { if(!data.routePlans)return data;const plans={...data.routePlans};for(const day of ["1","2","3"] as const){const plan=plans[day];if(plan)plans[day]={...plan,stops:plan.stops.filter(id=>!!resolveStop(id,data.booths,Number(day)))};}return {...data,routePlans:plans}; }
export function routeText(route:BuiltRoute,day:number){return [`ComiPath C109 / DAY ${day} · 馆口间候选路线`,`起点：${route.start.label} / ${route.start.floor}F（入馆后示意，不含排队）`,...route.legs.map((leg,i)=>`${i+1}. ${leg.stop.label} / ${hallName(leg.stop.hall)} ${hallFloor(leg.stop.hall)}F\n   ${leg.nodes.map(n=>`${n.label}(${n.floor}F)`).join(" → ")}`),route.outdoorTransfers?`\n室外参考线：${TRANSFER_NOTE}\n西 1 馆内到出口的段落未计算桌间通道。`:"\n使用建筑馆内连接参考，开放状态以现场为准。","\n路线连接到馆口，馆内桌间路径未计算。入场标记不代表准确检票点或等待区；入场方向暂参考 C108。现场临时管制和入场队列未建模，请遵从当日指引。"].join("\n");}
