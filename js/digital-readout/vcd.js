/** Parse GHDL VCD into clock-edge samples for the Digital Readout Lab.
 * Real RTL samples are immutable; the browser never simulates VHDL.
 */
export function parseVCD(text) {
  if (typeof text !== 'string' || !text.includes('$enddefinitions')) throw new Error('Not a VCD file.');
  const lines=text.split(/\r?\n/);
  const scope=[], ids=new Map(), values=new Map();
  let inHeader=true, clockId=null, lastClock='x', currentTime=0, cycle=0;
  let rising=false, timescale='unknown';
  const records=[];
  const wanted=['clk','frame_active','vb_active','frame_done','rst_rows','tg_rows','sel_rows','pixel_valid','column_index','pixel_data','frame_shutter_row','frame_readout_row','frame_shutter_start','frame_readout_start'];
  let timeUnit;
  const normalized=n=>n.replace(/\[.*$/,'');
  const read=id=>values.get(id);
  const asNumber=(id)=>{const v=read(id); if(!v || /[xz]/i.test(v)) return null; return parseInt(v,2);};
  let selected={};
  const flush=()=>{
    if(!rising) return;
    const v=selected;
    records.push({cycle:cycle++,time_ps:currentTime*timeUnit,clk:1,
      frame_active:asNumber(v.frame_active),vb_active:asNumber(v.vb_active),
      frame_done:asNumber(v.frame_done),
      rst_mask:asNumber(v.rst_rows),tg_mask:asNumber(v.tg_rows),
      sel_mask:asNumber(v.sel_rows),
      pixel_valid:asNumber(v.pixel_valid),
      column_index:asNumber(v.column_index),
      pixel_data:asNumber(v.pixel_data),
      shutter_row:asNumber(v.frame_shutter_row),
      readout_row:asNumber(v.frame_readout_row),
      shutter_start:asNumber(v.frame_shutter_start),
      readout_start:asNumber(v.frame_readout_start)});
    rising=false;
  };
  for(const raw of lines){
    const line=raw.trim();if(!line)continue;
    if(inHeader){
      if(line.startsWith('$timescale')){
        const inline=line.match(/\$timescale\s+(\d+)\s*(fs|ps|ns|us|ms|s)/);
        if(inline)timescale=inline[1]+' '+inline[2];
        continue;
      }
      if(timescale==='unknown'){
        const m=line.match(/^(\d+)\s*(fs|ps|ns|us|ms|s)(?:\s+\$end)?$/);
        if(m)timescale=m[1]+' '+m[2];
      }
      if(line.startsWith('$scope')){const m=line.match(/^\$scope\s+\S+\s+(\S+)/);if(m)scope.push(m[1]);}
      if(line.startsWith('$upscope'))scope.pop();
      if(line.startsWith('$var')){
        const m=line.match(/^\$var\s+\S+\s+\d+\s+(\S+)\s+(\S+)/);
        if(m){const name=normalized(m[2]);ids.set(m[1],{name,path:scope.join('.')+'.'+name});}
      }
      if(line.startsWith('$enddefinitions')){
        inHeader=false;
        for(const name of wanted){
          const match=[...ids.entries()].find(([_,d])=>d.path==='system.'+name)||
            [...ids.entries()].find(([_,d])=>d.name===name);
          if(match)selected[name]=match[0];
        }
        clockId=selected.clk;
        if(!clockId || !selected.rst_rows || !selected.tg_rows || !selected.sel_rows)
          throw new Error('VCD lacks expected system clock/row buses.');
        const m=timescale.match(/^(\d+)\s*(fs|ps|ns|us|ms|s)$/);
        const factors={fs:0.001,ps:1,ns:1000,us:1e6,ms:1e9,s:1e12};
        timeUnit=m?Number(m[1])*factors[m[2]]:null;
      }
      continue;
    }
    if(line.startsWith('#')){flush();currentTime=Number(line.slice(1));continue;}
    if(line[0]==='$')continue;
    if(line[0]==='b'||line[0]==='B'){
      const m=line.match(/^[bB]([01xXzZ]+)\s+(\S+)/);if(m)values.set(m[2],m[1]);
    } else {
      const m=line.match(/^([01xXzZ])(\S+)$/);
      if(m){
        values.set(m[2],m[1]);
        if(m[2]===clockId){if(lastClock==='0' && m[1]==='1')rising=true;lastClock=m[1];}
      }
    }
  }
  flush();
  if(!records.length)throw new Error('VCD contains no rising clock edges.');
  return {records,timescale,signalNames:Object.keys(selected),source:'GHDL RTL VCD (system.vcd)'};
}

export function rowSamples(vcd,row){
  if(!Number.isInteger(row)||row<0||row>3)throw Error('Row must be 0–3.');
  return vcd.records.map(s=>({
    cycle:s.cycle,clk:s.clk,frame_active:s.frame_active,
    rst:s.rst_mask===null?null:(s.rst_mask>>row)&1,
    tg:s.tg_mask===null?null:(s.tg_mask>>row)&1,
    sel:s.sel_mask===null?null:(s.sel_mask>>row)&1,
    pixel_valid:s.pixel_valid,column_index:s.column_index,pixel_data:s.pixel_data,
    vb_active:s.vb_active,frame_done:s.frame_done
  }));
}
