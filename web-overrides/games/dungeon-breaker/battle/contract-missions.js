/* Contract rules only. Mission assignment/evaluation and voting UI are separate. */
(function(root){
'use strict';
const MISSION_FLOORS=Object.freeze([3,6]),EXECUTION_FLOOR=8;
function restore(value){return {version:1,results:Object.fromEntries(MISSION_FLOORS.map(f=>[f,typeof value?.results?.[f]==='boolean'?value.results[f]:null]))};}
function successfulFloors(progress){return MISSION_FLOORS.filter(f=>progress?.results?.[f]===true);}
function record(progress,floor,success){
 if(!MISSION_FLOORS.includes(floor)||typeof success!=='boolean'||progress?.version!==1||!progress.results||progress.results[floor]!==null)return false;
 progress.results[floor]=success;return true;
}
const api=Object.freeze({MISSION_FLOORS,EXECUTION_FLOOR,restore,successfulFloors,record});
if(typeof module==='object'&&module.exports)module.exports=api;
root.ContractMissions=api;
})(typeof window!=='undefined'?window:globalThis);
