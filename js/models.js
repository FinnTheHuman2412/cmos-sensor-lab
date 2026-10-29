// Analytical teaching models, not PDK-backed circuit simulations.
export const q=1.602176634e-19, k=1.380649e-23;
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const logspace=(lo,hi,count=250)=>Array.from({length:count},(_,i)=>10**(lo+(hi-lo)*i/(count-1)));
export function conversionGainUv(capFf){return 1e21*q/capFf;}
export function capacitanceFf(cgUv){return 1e21*q/cgUv;}
export function noiseElectrons(p,high){
 const cg=(high?p.highConversionGainUv:p.lowConversionGainUv)*1e-6;
 const ga=high?p.highAnalogGain:p.lowAnalogGain;
 const fs=p.sourceFollowerGain;
 const pre=(p.sfNoiseUv**2+p.biasNoiseUv**2)*1e-12;
 const post=(p.ampNoiseUv**2+p.adcNoiseUv**2)*1e-12;
 const lsb=p.adcRangeV/(2**p.adcBits);
 // Assumption: SF and bias noise before analog gain; amplifier/ADC and quantization after gain.
 return Math.sqrt(pre+ (post+lsb**2/12)/ga**2)/(fs*cg);
}
export function limitElectrons(p,high){
 const cg=(high?p.highConversionGainUv:p.lowConversionGainUv)*1e-6;
 const ga=high?p.highAnalogGain:p.lowAnalogGain;
 return Math.min(p.fullWellElectrons,p.adcRangeV/(p.sourceFollowerGain*cg*ga));
}
export function snrDb(e,p,high){
 if(e<=0)return -Infinity;
 const r=noiseElectrons(p,high);
 return 20*Math.log10(e/Math.sqrt(r*r+e+(p.prnuPercent/100*e)**2));
}
export function snrThreshold(p,high){
 // SNR=1: e^2 = r^2 + e + (prnu*e)^2
 const a=1-(p.prnuPercent/100)**2,r=noiseElectrons(p,high);
 return (1+Math.sqrt(1+4*a*r*r))/(2*a);
}
export function dynamicRangeDb(p){
 const upper=limitElectrons(p,false), lower=snrThreshold(p,true);
 return upper>lower?20*Math.log10(upper/lower):NaN;
}
export function combinedSnrDb(e,p){return e<=limitElectrons(p,true)?snrDb(e,p,true):e<=limitElectrons(p,false)?snrDb(e,p,false):null;}
export function pixelState({capFf=2,resetV=1.1,photocurrentFa=8,exposureMs=10,fullWell=30000}){
 const ideal=photocurrentFa*1e-15*exposureMs*1e-3/q;
 const electrons=Math.min(fullWell,ideal);
 const cg=conversionGainUv(capFf);
 return {electrons,voltageDrop:electrons*cg*1e-6,fdVoltage:resetV-electrons*cg*1e-6,cgUv:cg,resetNoiseEv:Math.sqrt(k*300*capFf*1e-15)/q};
}
export function cdsTransfer(f,t){return 2*Math.abs(Math.sin(Math.PI*f*t));}
export function frameTiming(rows,blank,rowUs,exposureRows){
 const frameMs=(rows+blank)*rowUs/1000;
 return {frameMs,fps:1000/frameMs,exposureMs:exposureRows*rowUs/1000};
}
export function rampAdc(inputV,refV,bits){return Math.round(clamp(inputV/refV,0,1)*(2**bits-1));}
export function exposureSnr(lightElectronsLong,ratio,fullWell,noise){
 const long=Math.min(fullWell,lightElectronsLong);
 const short=Math.min(fullWell,lightElectronsLong/ratio);
 const useLong=lightElectronsLong<=fullWell;
 const signal=useLong?long:short*ratio;
 const variance=useLong?long+noise**2:ratio**2*(short+noise**2);
 return signal>0?20*Math.log10(signal/Math.sqrt(variance)):-Infinity;
}
