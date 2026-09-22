import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,relative,extname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const target=resolve(root,`.${pathname}`);
    if(relative(root,target).startsWith('..')){res.writeHead(403).end();return;}
    const file=(await stat(target)).isDirectory()?join(target,'index.html'):target;
    res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});
    res.end(await readFile(file));
  }catch{res.writeHead(404).end('Not found');}
}).listen(8000,'127.0.0.1',()=>console.log('TripDNA prototype: http://localhost:8000/'));
