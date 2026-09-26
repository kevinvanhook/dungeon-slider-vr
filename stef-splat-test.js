import * as THREE from 'three';
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark';

const $=id=>document.getElementById(id);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x090a0d);
const camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,.01,100);camera.position.set(0,1.55,0);camera.lookAt(0,1,-2);
const renderer=new THREE.WebGLRenderer({antialias:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local-floor');renderer.xr.setFramebufferScaleFactor(.9);renderer.xr.setFoveation(1);$('viewport').append(renderer.domElement);
const spark=new SparkRenderer({renderer,enableLod:false,covSplats:true,accumExtSplats:true,preBlurAmount:.15,blurAmount:0,sortRadial:true});scene.add(spark);
const root=new THREE.Group();root.position.z=-2;scene.add(root);let model,drag=null,yaw=0;
const sourceHeight=1.0001868605613708,sourceFloor=-0.49909359216690063;
function report(error){console.error(error);$('error').hidden=false;$('error').textContent=error.message||String(error);$('status').textContent='Load failed';}
function place(){if(!model)return;const h=Number($('height').value),distance=Number($('distance').value),floor=Number($('floor').value),scale=h/sourceHeight;model.scale.setScalar(scale);model.position.set(0,floor-sourceFloor*scale,0);root.position.z=-distance;$('floorValue').value=`${floor.toFixed(2)} m`;}
async function load(){try{$('load').disabled=true;$('status').textContent='Loading 262,144 Gaussians…';const splat=new SplatMesh({url:'stef-triposplat-262144.ply?v=2',enableLod:false,extSplats:true,covSplats:true});await splat.initialized;splat.rotation.y=Math.PI/2;model=new THREE.Group();model.rotation.x=Math.PI;model.add(splat);root.add(model);place();$('status').textContent='262,144 Gaussians · 1.65 m · ready';$('load').hidden=true;$('vr').disabled=false;$('reset').disabled=false;}catch(error){report(error);$('load').disabled=false;}}
async function enterVR(){try{const session=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});await renderer.xr.setSession(session);}catch(error){report(error);}}
function reset(){yaw=0;root.rotation.y=0;camera.position.set(0,1.55,0);}
$('load').onclick=load;$('vr').onclick=enterVR;$('reset').onclick=reset;$('height').onchange=$('distance').onchange=$('floor').oninput=place;
renderer.domElement.addEventListener('pointerdown',e=>{drag=e.clientX;renderer.domElement.setPointerCapture(e.pointerId)});renderer.domElement.addEventListener('pointermove',e=>{if(drag===null||renderer.xr.isPresenting)return;yaw+=(e.clientX-drag)*.006;drag=e.clientX;root.rotation.y=yaw});renderer.domElement.addEventListener('pointerup',()=>drag=null);
renderer.xr.addEventListener('sessionstart',()=>document.body.classList.add('immersive'));renderer.xr.addEventListener('sessionend',()=>document.body.classList.remove('immersive'));
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});renderer.setAnimationLoop(()=>renderer.render(scene,camera));
