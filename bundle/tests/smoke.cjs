const {engine}=require('./harness.cjs');let e=engine();e.run('let testS=nwNew("campaign",198917);');
for(let i=0;i<49;i++){
 let phase=e.run('testS.phase');if(phase==='brief')e.run('nwStartShift(testS)');
 e.run('nwInspect(testS,"archive"); var testC=nwCaseAt(testS); for(let j=0;j<testC.nodes.length;j++){nwAsk(testS,testC.nodes[j].id);} nwResolve(testS,testC.truth==="hostile"?"quarantine":"admit");');
 if(!e.run('nwDecode(nwEncode(testS))!==null'))throw Error('Save failed at '+i+' '+e.run('testS.phase'));
 e.run('nwAdvance(testS)');if(e.run('testS.phase')==='shiftEnd')e.run('nwNextNight(testS)');
}
console.log(e.get('({phase:testS.phase,cursor:testS.cursor,evidence:testS.evidence,routes:nwEndings(testS)})'));
