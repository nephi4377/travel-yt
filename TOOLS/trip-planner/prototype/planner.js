import {mockPlaces,mockRoutes,routeScore,parseAdjustment} from './engine.js';
import {groupRouteCost} from './budget.js';

const option=(mode,duration_min,estimated_cost,walking_min,energy_score,friction_score)=>({mode,duration_min,estimated_cost,currency:'KRW',walking_min,transfers:0,energy_score,friction_score});
const templates=[
  {title:'老城慢遊',stops:mockPlaces,legs:[mockRoutes['station-market'],mockRoutes['market-lunch'],mockRoutes['lunch-cafe']]},
  {title:'海岸與休息',stops:[
    {id:'beach',name:'海雲台海邊',time:'10:30',note:'海岸散步示範，天氣不佳可改室內',priority:'高優先',outdoor:true},
    {id:'lunch2',name:'海邊午餐示範點',time:'12:00',note:'餐廳與營業時間尚未查證',priority:'高優先'},
    {id:'museum',name:'海洋主題展示空間',time:'14:00',note:'午後室內活動與休息',priority:'可取消'}
  ],legs:[
    [option('步行',16,0,16,38,8),option('公車',13,1500,5,16,24),option('計程車',8,6200,2,6,12)],
    [option('步行',21,0,21,48,9),option('公車',18,1500,6,18,27),option('計程車',10,8000,2,6,13)]
  ]},
  {title:'城市探索',stops:[
    {id:'culture',name:'城市文化街區',time:'10:30',note:'同區探索示範，天氣不佳可改室內',priority:'高優先',outdoor:true},
    {id:'lunch3',name:'在地料理示範點',time:'12:30',note:'依飲食限制與人數再查證',priority:'高優先'},
    {id:'rest',name:'咖啡與自由時間',time:'15:00',note:'保留彈性，不必趕行程',priority:'可取消'}
  ],legs:[
    [option('步行',14,0,14,32,7),option('公車',15,1500,5,15,25),option('計程車',8,5800,2,6,12)],
    [option('地鐵',24,1600,9,24,22),option('公車',28,1500,6,18,27),option('計程車',15,9600,2,7,13)]
  ]},
  {title:'海港午後',stops:[
    {id:'harbor',name:'海港散步區',time:'10:30',note:'海邊活動示範，視天氣調整',priority:'高優先',outdoor:true},
    {id:'lunch4',name:'海港午餐示範點',time:'12:30',note:'餐廳與價格尚待查證',priority:'高優先'},
    {id:'gallery',name:'室內藝文空間',time:'14:30',note:'保留休息及自由探索時間',priority:'可取消'}
  ],legs:[
    [option('步行',17,0,17,39,8),option('公車',15,1500,5,16,24),option('計程車',9,6800,2,6,12)],
    [option('公車',22,1500,6,18,26),option('地鐵',20,1600,8,23,20),option('計程車',12,8200,2,6,13)]
  ]},
  {title:'市場與城市生活',stops:[
    {id:'street',name:'城市街區',time:'10:00',note:'在地生活示範，雨天可改室內',priority:'高優先',outdoor:true},
    {id:'market5',name:'市場午餐示範點',time:'12:00',note:'候位與飲食限制須另查',priority:'高優先'},
    {id:'bookshop',name:'書店與咖啡休息',time:'14:00',note:'可自由延長或取消',priority:'可取消'}
  ],legs:[
    [option('步行',13,0,13,30,7),option('公車',14,1500,5,16,23),option('計程車',8,6000,2,5,11)],
    [option('步行',19,0,19,43,8),option('公車',17,1500,5,17,25),option('計程車',10,7600,2,6,12)]
  ]},
  {title:'留白與回程',stops:[
    {id:'park',name:'公園或附近散步',time:'10:30',note:'輕鬆收尾，天氣不佳可改室內',priority:'可取消',outdoor:true},
    {id:'lunch6',name:'最後一餐示範點',time:'12:00',note:'依航班與住宿位置調整',priority:'高優先'},
    {id:'departure',name:'回程準備與緩衝',time:'14:00',note:'不代表機場接送或實際航班時程',priority:'必去'}
  ],legs:[
    [option('步行',15,0,15,35,7),option('公車',14,1500,5,16,24),option('計程車',8,6300,2,6,12)],
    [option('公車',20,1500,6,18,25),option('地鐵',18,1600,8,22,21),option('計程車',11,8100,2,6,12)]
  ]}
];

export const maxDemoDays=templates.length;
export function buildDemoDay(index,input,dna,adjustment={}){
  const template=templates[index];if(!template)throw new RangeError('Demo day unavailable');
  const changes=typeof adjustment==='string'?parseAdjustment(adjustment):adjustment;
  const stops=template.stops.map(stop=>({...stop}));
  if(changes.rain){const target=stops.find(stop=>stop.outdoor||stop.id==='market');if(target){target.name='同區室內展示空間（示範替代）';target.note='雨天替代點尚待查證';target.priority='可取消';}}
  if(changes.tired&&stops.at(-1)?.priority==='可取消')stops.pop();
  const legs=template.legs.slice(0,stops.length-1).map((list,i)=>{
    let options=list.filter(route=>(!changes.noMetro||route.mode!=='地鐵')&&(!changes.tired||route.walking_min<=9));
    options=[...options].sort((a,b)=>routeScore(a,input.travelers,dna)-routeScore(b,input.travelers,dna));
    return {from:stops[i].id,to:stops[i+1].id,options:options.slice(0,3)};
  });
  return {index,title:template.title,stops,legs,mock:true};
}
export function selectedTransportTotal(day,travelers,selected={}){return day.legs.reduce((sum,leg,i)=>sum+groupRouteCost(leg.options[selected[i]??0],travelers),0);}
