import * as THREE from 'three';
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark';

const $ = id => document.getElementById(id);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0810);
const camera = new THREE.PerspectiveCamera(55, 16/9, .005, 500);
const rig = new THREE.Group();rig.add(camera);scene.add(rig);
let renderer, mesh, meta, poses=[], worldFromModel, span, worldScale, ready=false;
let progress=0, vertical=0, preview=false, lastTime=0, pendingXRReset=false, lastResetButton=false;
let yaw=0,pitch=0,drag=null;
const headAnchor=new THREE.Vector3(), yawRotation=new THREE.Quaternion();
const upAxis=new THREE.Vector3(0,1,0);
function reportError(err){console.error(err);$('error').hidden=false;$('error').textContent=err.message||String(err);$('status').textContent='Could not complete';}
function matrix(rows){return new THREE.Matrix4().set(...rows.flat());}
function position(m){return new THREE.Vector3().setFromMatrixPosition(m);}
function sample(t){
 const x=THREE.MathUtils.clamp(t,0,1)*(poses.length-1),i=Math.min(Math.floor(x),poses.length-2),f=x-i;
 const p=position(poses[i]).lerp(position(poses[i+1]),f);
 const q=new THREE.Quaternion().setFromRotationMatrix(poses[i]);
 q.slerp(new THREE.Quaternion().setFromRotationMatrix(poses[i+1]),f);
 return {p,q};
}
function resize(){
 if(!renderer||renderer.xr.isPresenting)return;
 const aspect=meta?meta.calibration.w/meta.calibration.h:16/9;
 let w=innerWidth,h=w/aspect;if(h>innerHeight){h=innerHeight;w=h*aspect;}
 renderer.setSize(Math.floor(w),Math.floor(h));
 if(meta){const {w:iw,h:ih,fx,fy,cx,cy}=meta.calibration,n=camera.near;
  camera.projectionMatrix.makePerspective(-cx*n/fx,(iw-cx)*n/fx,cy*n/fy,-(ih-cy)*n/fy,n,camera.far);
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
 }
}
function updateSceneScale(){
 worldScale=.6/span*Number($('scale').value);
 mesh.matrix.copy(new THREE.Matrix4().makeScale(worldScale,worldScale,worldScale).multiply(worldFromModel));
 mesh.matrixWorldNeedsUpdate=true;
 poses=meta.modelPoses.map(m=>new THREE.Matrix4().makeScale(worldScale,worldScale,worldScale).multiply(worldFromModel).multiply(m));
 // Camera orientations must stay unit length after changing scene scale.
 poses=poses.map(m=>{const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();m.decompose(p,q,s);return new THREE.Matrix4().compose(p,q,new THREE.Vector3(1,1,1));});
}
function reset(){progress=0;vertical=0;yaw=0;pitch=0;preview=false;$('preview').textContent='Preview path';$('path').value=0;
 if(renderer?.xr.isPresenting)pendingXRReset=true;else{rig.position.set(0,0,0);rig.quaternion.identity();camera.position.set(0,0,0);camera.quaternion.identity();}
}
async function fetchModel(){
 const all=new Uint8Array(meta.bytes);let offset=0;
 for(let i=0;i<meta.chunks.length;i++){
  const chunk=meta.chunks[i];$('status').textContent=`Loading room · part ${i+1} of ${meta.chunks.length}`;
  const r=await fetch(chunk.name);if(!r.ok)throw Error(`Model download failed (${r.status}). Reload and try again.`);
  const bytes=new Uint8Array(await r.arrayBuffer());if(bytes.length!==chunk.bytes)throw Error('Incomplete model download. Reload and try again.');
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  if(digest!==chunk.sha256)throw Error('Model verification failed. Reload and try again.');
  all.set(bytes,offset);offset+=bytes.length;
 }return all;
}
async function load(){
 $('load').disabled=true;$('error').hidden=true;
 try{
  renderer=new THREE.WebGLRenderer({antialias:false,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local-floor');renderer.xr.setFramebufferScaleFactor(.85);renderer.xr.setFoveation(1);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
  $('viewport').append(renderer.domElement);
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();reportError(Error('Graphics connection lost. Reload this page to restore the viewer.'));});
  const res=await fetch('scene.json');if(!res.ok)throw Error('Scene settings could not be loaded.');meta=await res.json();
  const transform=matrix([...meta.parser.transform,[0,0,0,1]]);
  // The saved parser transform includes the COLMAP-to-Nerfstudio transform,
  // but frames in transforms.json have already received that transform.
  transform.multiply(matrix(meta.appliedTransform).invert());
  meta.modelPoses=meta.frames.map(f=>{const m=transform.clone().multiply(matrix(f.matrix));const p=position(m).multiplyScalar(meta.parser.scale);m.setPosition(p);return m;});
  worldFromModel=meta.modelPoses[0].clone().invert();span=0;
  for(const a of meta.modelPoses)for(const b of meta.modelPoses)span=Math.max(span,position(a).distanceTo(position(b)));
  if(!Number.isFinite(span)||span<=0)throw Error('Invalid camera calibration.');
  const spark=new SparkRenderer({renderer,enableLod:false,preBlurAmount:.3,blurAmount:0,sortRadial:true});scene.add(spark);
  const bytes=await fetchModel();$('status').textContent='Preparing 209,649 splats…';
  mesh=new SplatMesh({fileBytes:bytes,fileName:'slider.ply',enableLod:false});await mesh.initialized;
  mesh.matrixAutoUpdate=false;updateSceneScale();scene.add(mesh);
  ready=true;$('poster').hidden=true;$('load').hidden=true;$('settings').hidden=false;$('reset').disabled=false;
  $('status').textContent=`${mesh.numSplats.toLocaleString()} splats · ready`;
  const supported=!!navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr');
  $('vr').disabled=!supported;if(!supported)$('vr').textContent='VR: open on Quest';
  resize();reset();
  renderer.xr.addEventListener('sessionstart',()=>{document.body.classList.add('immersive');pendingXRReset=true;preview=false;});
  renderer.xr.addEventListener('sessionend',()=>{document.body.classList.remove('immersive');reset();resize();$('vr').textContent='Enter VR';});
  renderer.domElement.addEventListener('pointerdown',e=>{drag=[e.clientX,e.clientY];renderer.domElement.setPointerCapture(e.pointerId);});
  renderer.domElement.addEventListener('pointermove',e=>{if(!drag||renderer.xr.isPresenting)return;yaw-=(e.clientX-drag[0])*.002;pitch=THREE.MathUtils.clamp(pitch-(e.clientY-drag[1])*.002,-1.2,1.2);drag=[e.clientX,e.clientY];});
  renderer.domElement.addEventListener('pointerup',()=>drag=null);
  renderer.domElement.addEventListener('pointercancel',()=>drag=null);
  renderer.setAnimationLoop(animate);
 }catch(e){reportError(e);$('load').textContent='Reload page to retry';$('load').disabled=false;$('load').onclick=()=>location.reload();}
}
function animate(time,frame){
 const dt=Math.min((time-lastTime)/1000||0,.05);lastTime=time;
 if(renderer.xr.isPresenting&&frame){
  const pose=frame.getViewerPose(renderer.xr.getReferenceSpace());
  if(pose&&pendingXRReset){
   const h=pose.transform.position,q=pose.transform.orientation;headAnchor.set(h.x,h.y,h.z);
   const forward=new THREE.Vector3(0,0,-1).applyQuaternion(new THREE.Quaternion(q.x,q.y,q.z,q.w));
   yawRotation.setFromAxisAngle(upAxis,Math.atan2(forward.x,-forward.z));
   camera.position.set(0,0,0);camera.quaternion.identity();pendingXRReset=false;
  }
  let resetPressed=false;
  for(const input of renderer.xr.getSession().inputSources){const g=input.gamepad;if(!g)continue;
   const x=g.axes.length>=4?g.axes[2]:g.axes[0]||0,y=g.axes.length>=4?g.axes[3]:g.axes[1]||0;
   if(input.handedness==='left'&&Math.abs(x)>.18)progress=THREE.MathUtils.clamp(progress+x*dt*.12,0,1);
   if(input.handedness==='right'&&Math.abs(y)>.18)vertical=THREE.MathUtils.clamp(vertical-y*dt*.025,-.06,.06);
   resetPressed ||= !!g.buttons[4]?.pressed;
  }
  if(resetPressed&&!lastResetButton)reset();lastResetButton=resetPressed;
  const target=sample(progress);rig.quaternion.copy(target.q).multiply(yawRotation);
  rig.position.copy(target.p).add(new THREE.Vector3(0,vertical,0)).sub(headAnchor.clone().applyQuaternion(rig.quaternion));
 }else{
  if(preview){progress+=dt/30;if(progress>=1){progress=0;preview=false;$('preview').textContent='Preview path';}}
  const target=sample(progress);rig.position.copy(target.p);rig.quaternion.copy(target.q);
  camera.position.set(0,vertical,0);camera.quaternion.setFromEuler(new THREE.Euler(pitch,yaw,0,'YXZ'));
  $('path').value=progress;
 }
 renderer.render(scene,camera);
}
$('load').onclick=load;$('reset').onclick=reset;
$('path').oninput=e=>{progress=Number(e.target.value);preview=false;$('preview').textContent='Preview path';};
$('scale').onchange=()=>{if(!ready)return;updateSceneScale();reset();};
$('preview').onclick=()=>{preview=!preview;$('preview').textContent=preview?'Pause preview':'Preview path';};
$('vr').onclick=async()=>{try{const session=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});await renderer.xr.setSession(session);}catch(e){reportError(e);}};
addEventListener('resize',resize);addEventListener('keydown',e=>{if(e.key.toLowerCase()==='r'&&ready)reset();});

