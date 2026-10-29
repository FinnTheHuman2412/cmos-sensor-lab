import assert from 'node:assert/strict';
import {CONFIGS,DEFAULT,frameCycles,exposureCycles,scheduler,digitalCDS,scaledFrame,serialization,validTiming} from '../js/digital-readout/model.js';
import {verifyDefault,regressionFixtures,validateStream} from '../js/digital-readout/verification.js';
for(const c of CONFIGS){assert.equal(frameCycles(c),c.frame,c.name);assert.equal(exposureCycles(c),c.exposure,c.name)}
assert.ok(regressionFixtures().every(f=>f.pass));assert.ok(verifyDefault());assert.deepEqual(scheduler(DEFAULT).events.map(x=>x.start),[21,37,53,69]);assert.deepEqual(scheduler(DEFAULT).events.map(x=>x.stop),[85,101,117,133]);
assert.equal(digitalCDS(210,160),50);assert.equal(serialization(DEFAULT).length,16);assert.deepEqual(scaledFrame(DEFAULT),[[10,20,30,40],[50,60,70,80],[90,10,20,20],[13,14,15,25]]);
assert.equal(validateStream(serialization(DEFAULT),serialization(DEFAULT)).length,0);
const truncated=serialization(DEFAULT).slice(0,-1);assert.ok(validateStream(truncated,serialization(DEFAULT)).length>0);
assert.ok(validTiming({...DEFAULT,columns:4,cycles_per_sample:1,exposure_rows:7}).some(x=>x.includes('Scheduler restriction')));
assert.ok(validTiming({...DEFAULT,columns:4,cycles_per_sample:3}).some(x=>x.includes('throughput')));
console.log('Digital readout report fixtures and behavioral checks passed');
