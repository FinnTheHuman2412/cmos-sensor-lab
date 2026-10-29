/** Electron-domain SNR and sampled-difference CDS. Educational assumptions explicitly stated in UI. */
export const baseline={cg:80,gsf:0.8,bits:10,vref:640,prnu:1.2,fwc:10000,dark:0,read:0,ne:400};
export function noiseAt(n,p=baseline){
  const lsbMv=p.vref/(2**p.bits);
  const lsbElectrons=lsbMv*1000/(p.cg*p.gsf);
  const quant=lsbElectrons/Math.sqrt(12);
  const shot=Math.sqrt(Math.max(0,n));
  const dark=Math.sqrt(Math.max(0,p.dark));
  const prnu=p.prnu/100*n;
  const read=Math.max(0,p.read);
  const sigma=Math.hypot(shot,dark,prnu,read,quant);
  const limited=Math.min(p.fwc,p.vref*1000/(p.cg*p.gsf));
  return {shot,dark,prnu,read,quant,sigma,lsbElectrons,snr:n>0?20*Math.log10(n/sigma):null,shotSnr:n>0?10*Math.log10(n):null,saturation:limited};
}
export function snrCurves(p=baseline,count=260){
  const nmax=noiseAt(1,p).saturation;
  const points=Array.from({length:count},(_,i)=>{const n=Math.pow(10,Math.log10(.1)+i/(count-1)*(Math.log10(Math.max(nmax,.11))-Math.log10(.1)));return {n,...noiseAt(n,p)};});
  return points;
}
export function cdsPower(f,tUs){return 4*Math.sin(Math.PI*f*tUs*1e-6)**2;}
export function analogLowpassPower(f,fcHz){return 1/(1+(f/fcHz)**2);}
export function cdsIntegrated(tUs,fcHz,whiteDensity=1,steps=5000){
  // One-sided white PSD integrated 0..20*fc; finite numerical approximation.
  const df=20*fcHz/steps;
  let sum=0,unfiltered=0;
  for(let i=0;i<=steps;i++){
    const f=i*df,w=i===0||i===steps?.5:1;
    sum+=w*cdsPower(f,tUs)*analogLowpassPower(f,fcHz)*whiteDensity*df;
    unfiltered+=w*analogLowpassPower(f,fcHz)*whiteDensity*df;
  }
  return {variance:sum,referenceVariance:unfiltered,rms:Math.sqrt(sum),ratio:sum/unfiltered};
}
