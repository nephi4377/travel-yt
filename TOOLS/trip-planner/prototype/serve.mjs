import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,relative,extname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createNominatimProxy} from './nominatim-proxy.mjs';
const root=fileURLToPath(new URL('.',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const queryNominatim=createNominatimProxy();
const port=Number(process.argv[2]||8000);
if(!Number.isInteger(port)||port<1024||port>65535)throw new RangeError('Invalid preview port');
createServer(async(req,res)=>{
  try{
    const requestUrl=new URL(req.url,'http://localhost');
    const requestedPath=decodeURIComponent(requestUrl.pathname);
    if(requestedPath.startsWith('/api/nominatim/')){
      if(req.method!=='GET'){res.writeHead(405).end();return;}
      try{
        const {status,body}=await queryNominatim(requestedPath.slice('/api/nominatim/'.length),requestUrl.searchParams);
        res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}).end(body);
      }catch(error){res.writeHead(error.status>=400&&error.status<=599?error.status:400,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}).end(JSON.stringify({error:error.message}));}
      return;
    }
    const legacyPrefix='/TOOLS/trip-planner/prototype/';
    const pathname=requestedPath.startsWith(legacyPrefix)?`/${requestedPath.slice(legacyPrefix.length)}`:requestedPath;
    const target=resolve(root,`.${pathname}`);
    if(relative(root,target).startsWith('..')){res.writeHead(403).end();return;}
    const file=(await stat(target)).isDirectory()?join(target,'index.html'):target;
    res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
    res.end(await readFile(file));
  }catch{res.writeHead(404).end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`TripDNA prototype: http://localhost:${port}/`));
