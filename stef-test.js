import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const $=id=>document.getElementById(id);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x292c33);
const camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,.01,100);camera.position.set(0,1.55,0);camera.lookAt(0,1,-2);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local-floor');renderer.xr.setFramebufferScaleFactor(.9);renderer.xr.setFoveation(1);$('viewport').append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff,0x44475a,2.2));const key=new THREE.DirectionalLight(0xffffff,2.5);key.position.set(2,4,2);scene.add(key);const fill=new THREE.DirectionalLight(0x9cb8ff,1.2);fill.position.set(-2,2,1);scene.add(fill);
const grid=new THREE.GridHelper(8,16,0x777777,0x444444);scene.add(grid);
const root=new THREE.Group();scene.add(root);let model,sourceHeight=1,drag=null,yaw=0;
function place(){if(!model)return;const h=Number($('height').value),distance=Number($('distance').value),floor=Number($('floor').value);model.scale.setScalar(h/sourceHeight);model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3());model.position.x-=center.x;model.position.y+=floor-box.min.y;model.position.z-=center.z;root.position.z=-distance;$('floorValue').value=`${floor.toFixed(2)} m`;}
new GLTFLoader().load('stef-front-textured-v1.glb?v=1',gltf=>{model=gltf.scene;model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model);sourceHeight=box.max.y-box.min.y;root.add(model);place();$('status').textContent='Textured mesh ready · 1.60 m';$('vr').disabled=false;},undefined,error=>{$('error').hidden=false;$('error').textContent=error.message;$('status').textContent='Load failed';});
async function enterVR(){try{const session=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});await renderer.xr.setSession(session);}catch(error){$('error').hidden=false;$('error').textContent=error.message;}}
$('vr').onclick=enterVR;$('reset').onclick=()=>{yaw=0;root.rotation.y=0;camera.position.set(0,1.55,0);};$('height').onchange=$('distance').onchange=$('floor').oninput=place;
renderer.domElement.addEventListener('pointerdown',e=>{drag=e.clientX;renderer.domElement.setPointerCapture(e.pointerId)});renderer.domElement.addEventListener('pointermove',e=>{if(drag===null||renderer.xr.isPresenting)return;yaw+=(e.clientX-drag)*.006;drag=e.clientX;root.rotation.y=yaw});renderer.domElement.addEventListener('pointerup',()=>drag=null);renderer.domElement.addEventListener('wheel',e=>{if(renderer.xr.isPresenting)return;camera.position.z=THREE.MathUtils.clamp(camera.position.z+e.deltaY*.002,-1,1)});
renderer.xr.addEventListener('sessionstart',()=>document.body.classList.add('immersive'));renderer.xr.addEventListener('sessionend',()=>document.body.classList.remove('immersive'));
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});renderer.setAnimationLoop(()=>renderer.render(scene,camera));
