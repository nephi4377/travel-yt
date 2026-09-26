// Curated offline Busan seed. Coordinates are map references, not live provider results.
// Replace this array through a Places adapter when verified provider data is available.
export const places = [
  {id:'busan-station',name:'釜山站',area:'釜山站／南浦',lat:35.11519,lng:129.04148,kind:'indoor',minutes:45,note:'交通樞紐；可作為集合點'},
  {id:'choryang-steps',name:'草梁 40 階梯',area:'釜山站／南浦',lat:35.1178,lng:129.0385,kind:'outdoor',minutes:55,note:'坡道與階梯較多'},
  {id:'chinatown',name:'草梁中華街',area:'釜山站／南浦',lat:35.1172,lng:129.0388,kind:'outdoor',minutes:55,note:'街區散步'},
  {id:'nampo',name:'南浦洞',area:'釜山站／南浦',lat:35.0979,lng:129.0304,kind:'outdoor',minutes:90,note:'商圈與自由探索'},
  {id:'jagalchi',name:'札嘎其市場',area:'釜山站／南浦',lat:35.09663,lng:129.03069,kind:'indoor',minutes:75,note:'市場；餐飲請自行確認'},
  {id:'yeongdo-bridge',name:'影島大橋',area:'釜山站／南浦',lat:35.0953,lng:129.0368,kind:'outdoor',minutes:40,note:'港景散步'},
  {id:'seomyeon',name:'西面商圈',area:'西面',lat:35.1578,lng:129.0592,kind:'indoor',minutes:90,note:'購物與餐飲自由時間'},
  {id:'haeundae',name:'海雲台海水浴場',area:'海雲台／廣安里',lat:35.1587,lng:129.1604,kind:'outdoor',minutes:90,note:'海岸散步，留意天氣'},
  {id:'hae-market',name:'海雲台市場',area:'海雲台／廣安里',lat:35.161555,lng:129.162428,kind:'indoor',minutes:75,note:'市場；餐飲請自行確認'},
  {id:'centum',name:'新世界 Centum City',area:'海雲台／廣安里',lat:35.1688,lng:129.1308,kind:'indoor',minutes:100,note:'室內購物休息；營業請查證'},
  {id:'gwangalli',name:'廣安里海水浴場',area:'海雲台／廣安里',lat:35.1532,lng:129.1185,kind:'outdoor',minutes:80,note:'海岸散步，留意天氣'},
  {id:'taejongdae',name:'太宗台',area:'影島',lat:35.0528,lng:129.0875,kind:'outdoor',minutes:130,note:'戶外步行較多，預留體力'}
];
export const defaultPlaceIds=['busan-station','choryang-steps','nampo','yeongdo-bridge','haeundae','centum','gwangalli'];
export const placeById=id=>places.find(place=>place.id===id);
export function mapUrl(place){return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.lat},${place.lng}`)}`;}
