/** Educational scheduling model, not RTL edge-accurate. Reference: IN5350 final report, Oct 2026. */
export const ROWS=4, COLS=4;
export const CONFIGS=[
  ['Default',16,4,6,2,1,1,8,160,64],
  ['Longer reset',16,4,6,5,1,1,8,160,64],
  ['Longer transfer',16,4,6,2,3,1,8,160,64],
  ['Longer select',16,4,6,2,1,4,8,160,64],
  ['Longer readout',16,4,6,2,1,1,11,160,64],
  ['Longer exposure',16,6,6,2,1,1,8,160,96],
  ['Longer blanking',16,4,10,2,1,1,8,224,64],
  ['Minimum timing',12,1,1,1,1,1,8,60,12]
].map(([name,row_cycles,exposure_rows,vertical_blank_rows,reset_cycles,transfer_cycles,select_cycles,readout_cycles,frame,exposure])=>({name,row_cycles,exposure_rows,vertical_blank_rows,reset_cycles,transfer_cycles,select_cycles,readout_cycles,frame,exposure}));
export const DEFAULT={...CONFIGS[0]};
export const REF=[[10,20,30,40],[50,60,70,80],[90,10,20,20],[13,14,15,25]];
export function frameCycles(c){return ROWS*c.row_cycles + c.vertical_blank_rows*c.row_cycles}
export function exposureCycles(c){return c.exposure_rows*c.row_cycles}
export function validTiming(c){
 const errors=[];
 for(const k of ['row_cycles','exposure_rows','vertical_blank_rows','reset_cycles','transfer_cycles','select_cycles','readout_cycles'])if(!Number.isInteger(c[k]) || c[k]<1 && k!=='vertical_blank_rows')errors.push(`${k} must be a positive integer${k==='vertical_blank_rows'?' or zero':''}.`);
 if(c.vertical_blank_rows<0)errors.push('vertical_blank_rows cannot be negative.');
 if(c.exposure_rows>c.vertical_blank_rows)errors.push('Scheduler restriction: exposure_rows must not exceed vertical_blank_rows (report §5.4).');
 if(c.readout_cycles<c.columns*c.cycles_per_sample)errors.push(`Illustrative throughput bound: ${c.columns} columns × ${c.cycles_per_sample} cycles/sample need ≥${c.columns*c.cycles_per_sample} readout cycles; actual capture latency must be checked in RTL.`);
 if(c.reset_cycles+c.transfer_cycles>c.row_cycles)errors.push('Conservative illustrative shutter phase budget (reset + transfer) exceeds row_cycles; exact phase overlap is RTL-specific.');
 if(c.reset_cycles+c.transfer_cycles+c.select_cycles>c.row_cycles)errors.push('Conservative illustrative readout setup budget exceeds row_cycles; verify against actual RTL.');
 return errors;
}
export function scheduler(c){
 const exp=exposureCycles(c),frame=frameCycles(c);const starts=Array.from({length:ROWS},(_,i)=>21+i*16);
 const isVerified=CONFIGS[0].row_cycles===c.row_cycles&&CONFIGS[0].exposure_rows===c.exposure_rows&&CONFIGS[0].reset_cycles===c.reset_cycles&&CONFIGS[0].transfer_cycles===c.transfer_cycles&&CONFIGS[0].vertical_blank_rows===c.vertical_blank_rows&&CONFIGS[0].select_cycles===c.select_cycles&&CONFIGS[0].readout_cycles===c.readout_cycles;
 // Absolute anchor 21 is measured only for the default configuration.
 const anchor=isVerified?21:Math.min(c.row_cycles-1,c.reset_cycles+c.transfer_cycles+2);
 const events=Array.from({length:ROWS},(_,row)=>({row,start:anchor+row*c.row_cycles,stop:anchor+(row+c.exposure_rows)*c.row_cycles}));
 return {exp,frame,events,verified:isVerified};
}
export function scaledFrame(c){const factor=exposureCycles(c)/64;return REF.map(row=>row.map(x=>Math.min(255,Math.round(x*factor))))}
export function digitalCDS(reset,signal){return reset-signal}
export function serialization(c){const image=scaledFrame(c);return image.flatMap((row,r)=>row.map((value,col)=>({row:r,column:col,value})));}
export function sampleAtCycle(c,cycle){const s=scheduler(c);return s.events.map(e=>({row:e.row,state:cycle<e.start?'idle':cycle<e.stop?'integrating':cycle<e.stop+c.readout_cycles?'readout':'complete'}));}
export function traceFor(c, row=0){
 const s=scheduler(c);const e=s.events[row];const total=Math.max(s.frame, e.stop+c.row_cycles+6);
 const samples=serialization(c).filter(x=>x.row===row);
 // These transitions are a presentation timeline; reset/transfer/SEL edges are NOT observed RTL edges.
 const out=[];for(let t=0;t<total;t++){
  const shutterStart=e.start-c.reset_cycles-c.transfer_cycles;
  const readStart=e.stop-c.reset_cycles-c.transfer_cycles;
  const shutterRST=t>=shutterStart&&t<shutterStart+c.reset_cycles;
  const shutterTG=t>=shutterStart+c.reset_cycles&&t<e.start;
  const readRST=t>=readStart&&t<readStart+c.reset_cycles;
  const readTG=t>=readStart+c.reset_cycles&&t<e.stop;
  const sel=t>=e.stop&&t<e.stop+c.select_cycles;
  const sampleIndex=t-e.stop-c.select_cycles;
  const pixelValid=sampleIndex>=0 && sampleIndex<c.readout_cycles && sampleIndex%c.cycles_per_sample===0 && sampleIndex/c.cycles_per_sample<samples.length;
  const idx=pixelValid?sampleIndex/c.cycles_per_sample:-1;
  out.push({cycle:t,clk:t%2,frame_active:t<s.frame?1:0,rst:Number(shutterRST||readRST),tg:Number(shutterTG||readTG),sel:Number(sel),pixel_valid:Number(pixelValid),column_index:idx>=0?idx:null,pixel_data:idx>=0?samples[idx].value:null});
 }return out;
}
export const DEFAULT_MEASURED={start:[21,37,53,69],stop:[85,101,117,133],frame:160,order:[0,1,2,3]};
