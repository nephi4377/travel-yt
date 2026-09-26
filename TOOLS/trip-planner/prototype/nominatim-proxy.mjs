// Local development proxy only: one process-wide queue and a bounded memory cache.
// A published multi-instance service needs shared quota enforcement and its own provider.
const upstream='https://nominatim.openstreetmap.org';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export function nominatimUrl(kind,searchParams){
  if(!['search','lookup'].includes(kind))throw new RangeError('Unsupported Nominatim operation');
  const params=new URLSearchParams(searchParams),allowed=kind==='search'
    ?new Set(['q','format','limit','viewbox','bounded','namedetails','extratags','accept-language','featureType','addressdetails'])
    :new Set(['osm_ids','format','namedetails','extratags','accept-language']);
  if([...params.keys()].some(key=>!allowed.has(key))||params.get('format')!=='jsonv2')throw new RangeError('Unsupported query parameters');
  if(kind==='search'){
    const q=params.get('q')||'',limit=Number(params.get('limit'));
    if(q.length<2||q.length>80||!Number.isInteger(limit)||limit<1||limit>8)throw new RangeError('Search must be explicit and bounded');
    if(params.has('viewbox')&&!/^-?\d+(?:\.\d+)?(?:,-?\d+(?:\.\d+)?){3}$/.test(params.get('viewbox')))throw new RangeError('Invalid viewbox');
    if(params.has('featureType')&&params.get('featureType')!=='city')throw new RangeError('Unsupported city filter');
  }else if(!/^[NWR][1-9]\d{0,15}$/.test(params.get('osm_ids')||''))throw new RangeError('Lookup requires one OSM object');
  const url=new URL(`/${kind}`,upstream);url.search=params.toString();return url;
}

export function createNominatimProxy({fetcher=fetch,now=Date.now,pause=sleep}={}){
  const cache=new Map(),inflight=new Map();let pending=0,lastStarted=null,queue=Promise.resolve();
  return async(kind,searchParams)=>{
    const url=nominatimUrl(kind,searchParams),key=url.toString(),cached=cache.get(key);
    if(cached&&cached.savedAt>now()-86400000)return cached.result;
    if(inflight.has(key))return inflight.get(key);
    if(pending>=8)throw Object.assign(new Error('Public provider queue is busy'),{status:503});
    pending++;
    const work=queue.then(async()=>{
      if(lastStarted!==null)await pause(Math.max(0,1100-(now()-lastStarted)));
      lastStarted=now();
      const response=await fetcher(key,{signal:AbortSignal.timeout(12000),headers:{'User-Agent':'TripDNA-local-prototype/0.2 (https://github.com/nephi4377/travel-yt)','Accept':'application/json'}});
      if(!response.ok)throw Object.assign(new Error('Public provider unavailable'),{status:response.status});
      const body=await response.text();if(body.length>1000000)throw Object.assign(new Error('Provider response too large'),{status:502});
      try{JSON.parse(body);}catch{throw Object.assign(new Error('Invalid provider response'),{status:502});}
      const result={status:200,body};cache.set(key,{savedAt:now(),result});
      while(cache.size>100)cache.delete(cache.keys().next().value);
      return result;
    });
    queue=work.catch(()=>{});
    inflight.set(key,work);
    try{return await work;}finally{pending--;inflight.delete(key);}
  };
}
