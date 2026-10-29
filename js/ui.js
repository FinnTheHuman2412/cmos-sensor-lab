export const $=(s)=>document.querySelector(s);
export const fmt=(n,d=1)=>Number.isFinite(n)?n.toLocaleString('en-US',{maximumFractionDigits:d}):'—';
export const getConfig=async()=>fetch(new URL('../config/sensor.json',import.meta.url)).then(r=>{if(!r.ok)throw new Error('Cannot load config.json');return r.json()});
export const bindSlider=(id,initial,callback)=>{const el=$('#'+id);el.value=initial;const out=$('#'+id+'-value');const run=()=>{const n=+el.value;if(out)out.textContent=fmt(n,3);callback(n)};el.addEventListener('input',run);if(out)out.textContent=fmt(+el.value,3);return run};
export function svgPlot(el,series,{xMin=0,xMax=5,yMin=-20,yMax=55,xLabel='Input electrons (log10)',yLabel='SNR (dB)',vertical=[]}={}){
 const W=760,H=390,L=68,R=22,T=20,B=52,cw=W-L-R,ch=H-T-B;
 const xx=x=>L+(x-xMin)/(xMax-xMin)*cw,yy=y=>T+(yMax-y)/(yMax-yMin)*ch;
 let s=`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${yLabel} chart">`;
 for(let t=Math.ceil(yMin/10)*10;t<=yMax;t+=10)s+=`<line x1="${L}" x2="${W-R}" y1="${yy(t)}" y2="${yy(t)}" stroke="#244057"/><text x="${L-12}" y="${yy(t)+4}" text-anchor="end" fill="#91adc5" font-size="12">${t}</text>`;
 for(let t=Math.ceil(xMin);t<=xMax;t++)s+=`<line x1="${xx(t)}" x2="${xx(t)}" y1="${T}" y2="${H-B}" stroke="#1e384c"/><text x="${xx(t)}" y="${H-B+20}" text-anchor="middle" fill="#91adc5" font-size="12">${t}</text>`;
 for(const v of vertical){if(v.x>=xMin&&v.x<=xMax)s+=`<line x1="${xx(v.x)}" x2="${xx(v.x)}" y1="${T}" y2="${H-B}" stroke="${v.color}" stroke-dasharray="5 5"/><text x="${xx(v.x)+4}" y="${T+13}" fill="${v.color}" font-size="11">${v.label}</text>`}
 for(const t of series){let path='',active=false;for(const [x,y] of t.data){if(x<xMin||x>xMax||y===null||!Number.isFinite(y)){active=false;continue;}path+=`${active?'L':'M'}${xx(x).toFixed(2)},${yy(Math.max(yMin,Math.min(yMax,y))).toFixed(2)} `;active=true;}s+=`<path d="${path}" stroke="${t.color}" stroke-width="2.6" fill="none" stroke-linejoin="round"/>`}
 s+=`<text x="${W/2}" y="${H-8}" text-anchor="middle" fill="#b9d2e8" font-size="13">${xLabel}</text><text transform="translate(17 ${H/2}) rotate(-90)" text-anchor="middle" fill="#b9d2e8" font-size="13">${yLabel}</text></svg>`;el.innerHTML=s;
}
export function saveCsv(filename,rows){const csv=rows.map(row=>row.map(v=>v===null?'':v).join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=filename;a.click();URL.revokeObjectURL(a.href)}
