'use client'
import { useState, useEffect, useRef } from 'react'
import { Excalidraw, exportToBlob, serializeAsJSON } from "@excalidraw/excalidraw"
import * as THREE from 'three';
import { OrbitControls } from 'assets/three/OrbitControls.js';

import * as fal from "@fal-ai/serverless-client"
import Image from 'next/image'

fal.config({
  proxyUrl: "/api/fal/proxy",
})

const seed = Math.floor(Math.random() * 100000)
const baseArgs = {
  sync_mode: true,
  strength: .99,
  seed
}
export default function Home() {

  const [prompt, setPrompt] = useState('digital art, beautiful snake, pattern');

  const [image, setImage] = useState(null)
  const [_appState, setAppState] = useState<any>(null)
  const canvasRef = useRef(null);
  const inputRef = useRef(null);
  const [animateToggle, setAnimateToggle] = useState(true);

  useEffect(() => {
    const camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, 1500);
    camera.position.set(-35, 70, 100);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    // RENDERER
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      preserverDrawingBuffer: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(400, 400);
    renderer.shadowMap.enabled = true;

    // SCENE
    const scene: THREE.Scene = new THREE.Scene()
    scene.background = new THREE.Color(0xbfd1e5);

    // CONTROLS
    const controls = new OrbitControls(camera, renderer.domElement);

    const animate = async function () {
      dragObject();
      // console.log(animateRef.current.value)
      oscillateObjects(scene);
      requestAnimationFrame( animate );
      renderer.render(scene, camera);
      let dataUrl = await getDataUrl()
        send({
          ...baseArgs,
          image_url: dataUrl,
          prompt: inputRef.current.value,
        })
    };

    // ambient light
    let hemiLight = new THREE.AmbientLight(0xffffff, 0.20);
    scene.add(hemiLight);

    //Add directional light
    let dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(-30, 50, -30);
    scene.add(dirLight);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.left = -70;
    dirLight.shadow.camera.right = 70;
    dirLight.shadow.camera.top = 70;
    dirLight.shadow.camera.bottom = -70;


    function createFloor() {
      let pos = { x: 0, y: -1, z: 3 };
      let scale = { x: 100, y: 2, z: 100 };

      let blockPlane = new THREE.Mesh(new THREE.BoxGeometry(),
          new THREE.MeshPhongMaterial({ color: 0xf9c834 }));
      blockPlane.position.set(pos.x, pos.y, pos.z);
      blockPlane.scale.set(scale.x, scale.y, scale.z);
      blockPlane.castShadow = true;
      blockPlane.receiveShadow = true;
      scene.add(blockPlane);

      blockPlane.userData.ground = true
    }

    // box
    function createBox() {
      let scale = { x: Math.random() * 10, y: Math.random() * 10, z: Math.random() * 10 }
      let pos = { x: (Math.random() - 0.5) * 100, y: scale.y / 2, z: (Math.random() - 0.5) * 100 }

      let box = new THREE.Mesh(new THREE.BoxGeometry(), 
          new THREE.MeshPhongMaterial({ color: new THREE.Color(Math.random(), Math.random(), Math.random()) }));
      box.position.set(pos.x, pos.y, pos.z);
      box.scale.set(scale.x, scale.y, scale.z);
      box.castShadow = true;
      box.receiveShadow = true;
      scene.add(box)

      box.userData.draggable = true
      box.userData.name = 'BOX'
    }

    function createSphere() {
      let radius = Math.random() * 10;
      let pos = { x: (Math.random() - 0.5) * 100, y: radius, z: (Math.random() - 0.5) * 100 };

      let sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 32), 
          new THREE.MeshPhongMaterial({ color: new THREE.Color(Math.random(), Math.random(), Math.random()) }))
      sphere.position.set(pos.x, pos.y, pos.z)
      sphere.castShadow = true
      sphere.receiveShadow = true
      scene.add(sphere)

      sphere.userData.draggable = true
      sphere.userData.name = 'SPHERE'
    }

    function createCylinder() {
      let radius = Math.random() * 10;
      let height = Math.random() * 20;
      let pos = { x: (Math.random() - 0.5) * 100, y: height / 2, z: (Math.random() - 0.5) * 100 };

      let cylinder = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 32), 
          new THREE.MeshPhongMaterial({ color: new THREE.Color(Math.random(), Math.random(), Math.random()) }))
      cylinder.position.set(pos.x, pos.y, pos.z)
      cylinder.castShadow = true
      cylinder.receiveShadow = true
      scene.add(cylinder)

      cylinder.userData.draggable = true
      cylinder.userData.name = 'CYLINDER'
    }

    function createRandomObject() {
      const objectType = Math.floor(Math.random() * 3);
      switch (objectType) {
        case 0:
          createBox();
          break;
        case 1:
          createSphere();
          break;
        case 2:
          createCylinder();
          break;
      }
    }

    const raycaster = new THREE.Raycaster(); // create once
    const clickMouse = new THREE.Vector2();  // create once
    const moveMouse = new THREE.Vector2();   // create once
    var draggable: THREE.Object3D | null = null;
    
    function intersect(pos: THREE.Vector2) {
      raycaster.setFromCamera(pos, camera);
      return raycaster.intersectObjects(scene.children);
    }
    
    function changeColor(object: THREE.Mesh) {
      const color = new THREE.Color(Math.random(), Math.random(), Math.random());
      object.material.color = color;
    }

    function oscillateObjects(scene: THREE.Scene) {
      if (animateToggle) {
        scene.children.forEach(child => {
            child.position.y += Math.sin(Date.now() * 0.001) * 0.1;
        });
      }
    }

    window.addEventListener('click', event => {
      // THREE RAYCASTER
      clickMouse.x = ((event.clientX - renderer.domElement.offsetLeft) / 400) * 2 - 1;
      clickMouse.y = -((event.clientY - renderer.domElement.offsetTop) / 400) * 2 + 1;

      if (draggable != null) {
        console.log(`dropping draggable ${draggable.userData.name}`)
        draggable = null
        return;
      }
    
      const found = intersect(clickMouse);
      if (found.length > 0) {
        if (found[0].object.userData.draggable) {
          draggable = found[0].object as THREE.Mesh
          console.log(`found draggable ${draggable.userData.name}`)
        }
      }
    })
    
    window.addEventListener('mousemove', event => {
      moveMouse.x = ((event.clientX - renderer.domElement.offsetLeft) / 400) * 2 - 1;
      moveMouse.y = -((event.clientY - renderer.domElement.offsetTop) / 400) * 2 + 1;
    });

    window.addEventListener('keydown', event => {
      if (event.code === 'Space') {
        if (draggable != null) {
          changeColor(draggable);
        } else {
          createRandomObject();
        }
      }
    });
    
    function dragObject() {
      if (draggable != null) {
        const found = intersect(moveMouse);
        if (found.length > 0) {
          for (let i = 0; i < found.length; i++) {
            if (!found[i].object.userData.ground)
              continue
            
            let target = found[i].point;
            draggable.position.x = target.x
            draggable.position.z = target.z
          }
        }
      }
    }

    function init() {
      createFloor()
      createBox()
      createSphere()
      createCylinder()
      createBox()
      createSphere()
      createCylinder()
      createBox()
      createSphere()
      createCylinder()
    }

    init();
    animate()

  }, []);


  const { send } = fal.realtime.connect('110602490-sdxl-turbo-realtime', {
    connectionKey: 'realtime-nextjs-app',
    onResult(result) {
      if (result.error) return
      setImage(result.images[0].url)
    }
  })

  async function getDataUrl() {
    if (canvasRef.current) {
      var blob = canvasRef.current.toDataURL();
      return blob;
    }
    // handle the case when canvasRef.current is null
    // return a default value or throw an error
    return
  }

  return (
    <main className="p-12">
      <p className="text-xl mb-2">Three.JS + Fal SDXL Turbo Demo</p>
      <input
        ref={inputRef}
        className='border rounded-lg p-2 w-full mb-2'
        value={prompt}
        onChange={async (e) => {
          setPrompt(e.target.value)
          let dataUrl = await getDataUrl()
          send({
            ...baseArgs,
            prompt: prompt,
            image_url: dataUrl
          })
        }}
      />  
      <div className="flex justify-center space-x-4">
        <canvas ref={canvasRef} />
        {
          image && (
            <div>
              <Image
                src={image}
                width={400}
                height={400}
                alt='fal image'
              />
            </div>
          )
        }
      </div>
    </main>
  )
}
