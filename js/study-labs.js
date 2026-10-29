import {baseline,noiseAt,snrCurves,cdsPower,analogLowpassPower,cdsIntegrated} from './study-model.js';
const $=id=>document.getElementById(id);
const snr={...baseline},cds={t:12,fc:100000};
let mode='experiment',revealed=false;
const spec=[
 ['ne','Signal electrons','e⁻',1,10000,1],
 ['cg','Conversion gain','µV/e⁻',10,200,1],
 ['gsf','Source-follower gain','×',.3,1,.01],
 ['bits','ADC resolution','bits',6,16,1],
 ['vref','ADC reference','mV',100,1200,10],
 ['prnu','PRNU','%',0,5,.1],
 ['fwc','Full-well capacity','e⁻',1000,40000,500],
 ['dark','Dark signal, mean','e⁻',0,500,5],
 ['read','Read noise, input-referred','e⁻ RMS',0,20,.25]
];
const cspec=[['t','CDS separation','µs',1,100,1],['fc','Analog LP cutoff','Hz',1000,1000000,1000]];
function format(v){return Number(v).toLocaleString('en-US',{maximumFractionDigits:2})}
function controls(target,items,obj){$(target).innerHTML=items.map(([key,label,unit,low,high,step])=>`<div class="control"><div class="top"><label for="control-${key}">${label}</label><output id="out-${key}">${format(obj[key])} ${unit}</output></div><input type="range" id="control-${key}" min="${low}" max="${high}" step="${step}" value="${obj[key]}"></div>`).join('');
 items.forEach(([key,,,,,])=>{$('control-'+key).addEventListener('input',ev=>{obj[key]=+ev.target.value;$('out-'+key).textContent=format(obj[key])+' '+items.find(i=>i[0]===key)[2];revealed=false;draw();modeUI()})});}
const svg=(series,options)=>{
 const {xmin,xmax,ymin,ymax,xlog=false,xlabel,ylabel,colors=['#47d7e9','#f0c26a','#b69cff'],markers=[]}=options;
 const W=780,H=295,L=75,R=24,T=17,B=49,pw=W-L-R,ph=H-T-B;
 const fx=x=>L+(xlog?(Math.log10(Math.max(x,1e-12))-Math.log10(xmin))/(Math.log10(xmax)-Math.log10(xmin)):(x-xmin)/(xmax-xmin))*pw;
 const fy=y=>T+(ymax-y)/(ymax-ymin)*ph;
 let out=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${ylabel} against ${xlabel}"><rect width="${W}" height="${H}" fill="#091728"/>`;
 for(let k=0;k<=5;k++){const y=ymin+(ymax-ymin)*k/5;const py=fy(y);out+=`<line x1="${L}" y1="${py}" x2="${W-R}" y2="${py}" stroke="#243b55" stroke-width=".8"/><text x="${L-9}" y="${py+4}" fill="#a3bed3" font-size="11" text-anchor="end">${format(y)}</text>`}
 const ticks=xlog?Array.from({length:Math.ceil(Math.log10(xmax))-Math.floor(Math.log10(xmin))+1},(_,i)=>10**(Math.floor(Math.log10(xmin))+i)).filter(x=>x>=xmin&&x<=xmax):Array.from({length:6},(_,i)=>xmin+i*(xmax-xmin)/5);
 for(const x of ticks){const px=fx(x);out+=`<line x1="${px}" y1="${T}" x2="${px}" y2="${H-B}" stroke="#243b55" stroke-width=".8"/><text x="${px}" y="${H-B+19}" fill="#a3bed3" font-size="11" text-anchor="middle">${format(x)}</text>`}
 const path=points=>points.filter(p=>Number.isFinite(p[0])&&Number.isFinite(p[1])).map(([x,y],i)=>`${i?'L':'M'}${fx(x).toFixed(2)},${fy(Math.max(ymin,Math.min(ymax,y))).toFixed(2)}`).join(' ');
 series.forEach((data,i)=>out+=`<path d="${path(data)}" fill="none" stroke="${colors[i]}" stroke-width="${i===0?2.7:1.8}" stroke-linecap="round"/>`);
 for(const marker of markers){if(marker.x<xmin||marker.x>xmax)continue;out+=`<line x1="${fx(marker.x)}" y1="${T}" x2="${fx(marker.x)}" y2="${H-B}" stroke="#ffffff" stroke-dasharray="4 5" opacity=".6"/>`}
 out+=`<text x="${L+pw/2}" y="${H-7}" fill="#e6f6ff" font-size="12" text-anchor="middle">${xlabel}</text><text x="17" y="${T+ph/2}" fill="#e6f6ff" font-size="12" transform="rotate(-90 17 ${T+ph/2})" text-anchor="middle">${ylabel}</text></svg>`;return out;
};
function drawSNR(){
 const pts=snrCurves(snr,320);const selected=noiseAt(snr.ne,snr),sat=selected.saturation;
 const valid=pts.filter(p=>p.n<=sat);
 const without=valid.map(p=>[p.n,20*Math.log10(p.n/Math.hypot(p.shot,p.dark,p.read,p.quant))]);
 $('snr-chart').innerHTML=svg([valid.map(p=>[p.n,p.snr]),valid.map(p=>[p.n,p.shotSnr]),without],{xmin:.1,xmax:Math.max(sat,.11),ymin:-25,ymax:55,xlog:true,xlabel:'Photon-generated electrons (log scale)',ylabel:'SNR (dB)',markers:[{x:snr.ne}]});
 $('snr-result').textContent=snr.ne>sat?'CLIPPED':format(selected.snr)+' dB';
 $('quant-result').textContent=format(selected.quant)+' e⁻ RMS';
 $('sat-result').textContent=format(sat)+' e⁻';
 const values=[['Shot',selected.shot],['Dark',selected.dark],['PRNU',selected.prnu],['Read',selected.read],['ADC',selected.quant]];
 $('snr-breakdown').innerHTML=values.map(([name,v])=>`<div class="study-noise-row"><span>${name}</span><div class="study-noise-track"><div class="study-noise-fill" style="width:${Math.min(100,100*(v/Math.max(selected.sigma,1e-15))**2)}%"></div></div><span>${format(v)} e⁻</span></div>`).join('')+'<p class="study-fine">Bars show fraction of total noise variance; numeric labels give RMS noise.</p>';
}
function drawCDS(){
 const maxF=Math.max(5*1e6/cds.t,5*cds.fc);
 const pts=Array.from({length:500},(_,i)=>{const f=maxF*i/499;return [f,cdsPower(f,cds.t),cdsPower(f,cds.t)*analogLowpassPower(f,cds.fc)]});
 $('cds-chart').innerHTML=svg([pts.map(p=>[p[0]/1000,p[1]]),pts.map(p=>[p[0]/1000,p[2]])],{xmin:0,xmax:maxF/1000,ymin:0,ymax:4.1,xlabel:'Frequency (kHz)',ylabel:'Power gain |H(f)|²',markers:[{x:1000/cds.t}]});
 const integ=cdsIntegrated(cds.t,cds.fc);
 $('notch-result').textContent=format(1000/cds.t)+' kHz';
 $('rms-result').textContent=format(integ.rms)+' a.u.';
 $('variance-result').textContent=format(integ.ratio)+' ×';
}
function draw(){drawSNR();drawCDS()}
const quiz={
 exercise:['At 400 photoelectrons and zero additional dark/read noise, calculate the shot-noise-only SNR (dB).','Shot noise is √400 = 20 e⁻ RMS. SNR = 20 log₁₀(400/20) = 26.02 dB.'],
 experiment:['Predict: If PRNU doubles while all other settings remain fixed, what happens to the bright-signal SNR?','PRNU noise grows proportionally to signal. At large signal, SNR approaches 20 log₁₀(1/PRNU), so doubling PRNU reduces the ceiling by about 6.02 dB.'],
 exam:['For a CDS interval of 10 µs, where is the first nonzero notch in |H(f)|² (kHz)?','Notches occur at f = m/T_CDS. The first nonzero notch is at 1/(10 µs) = 100 kHz.']
};
function modeUI(){
 document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('chosen',b.dataset.mode===mode));
 $('mode-title').textContent=mode[0].toUpperCase()+mode.slice(1)+' mode';
 $('question-text').textContent=quiz[mode][0];
 $('feedback').hidden=!revealed;
 $('feedback').textContent=quiz[mode][1];
 $('reveal').textContent=revealed?'Hide explanation':'Reveal explanation';
 document.body.classList.toggle('study-exam',mode==='exam');
 document.body.classList.toggle('revealed',revealed);
}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;revealed=false;$('answer').value='';modeUI()}));
$('reveal').onclick=()=>{revealed=!revealed;modeUI()};
$('reset-all').onclick=()=>{Object.assign(snr,baseline);Object.assign(cds,{t:12,fc:100000});controls('snr-controls',spec,snr);controls('cds-controls',cspec,cds);revealed=false;draw();modeUI()};
$('snr-csv').onclick=()=>{const rows=['electrons,total_snr_db,shot_snr_db,shot_noise_e,dark_noise_e,prnu_noise_e,read_noise_e,adc_noise_e'];for(const p of snrCurves(snr))rows.push([p.n,p.snr,p.shotSnr,p.shot,p.dark,p.prnu,p.read,p.quant].join(','));const a=document.createElement('a');const url=URL.createObjectURL(new Blob([rows.join('\n')],{type:'text/csv'}));a.href=url;a.download='snr-noise-exercise.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),500)};
controls('snr-controls',spec,snr);controls('cds-controls',cspec,cds);draw();modeUI();
