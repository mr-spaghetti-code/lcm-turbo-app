'use client'
import { useState, useEffect, useRef } from 'react'
import * as THREE from 'three';
import { OrbitControls } from 'assets/three/OrbitControls.js';
import { EffectComposer } from 'assets/three/postprocessing/EffectComposer.js';
import { OutlinePass } from 'assets/three/postprocessing/OutlinePass.js';
import { RenderPass } from 'assets/three/postprocessing/RenderPass.js';
import { OutputPass } from 'assets/three/postprocessing/OutputPass.js';



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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [animateToggle, setAnimateToggle] = useState(true);
  const animateToggleRef = useRef(animateToggle);

  useEffect(() => {
    animateToggleRef.current = animateToggle;
  }, [animateToggle]);

  useEffect(() => {
    const camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, 1500);
    camera.position.set(-35, 70, 100);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    // RENDERER
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current!,
      preserveDrawingBuffer: true
    });
    
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(400, 400);
    renderer.shadowMap.enabled = true;

    const composer = new EffectComposer( renderer );

    // SCENE
    const scene: THREE.Scene = new THREE.Scene()
    scene.background = new THREE.Color(0xbfd1e5);

    // CONTROLS
    const controls = new OrbitControls(camera, renderer.domElement);

    const animate = async function () {
      dragObject();
      // console.log(animateRef.current.value)
      oscillateObjects(scene, animateToggleRef.current);
      requestAnimationFrame( animate );
      renderer.render(scene, camera);
      composer.render(); 
      let dataUrl = await getDataUrl()
        send({
          ...baseArgs,
          image_url: dataUrl,
          prompt: inputRef.current?.value ?? ''
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

    function getFloorYPosition() {
      // Assuming the floor's y position might be changing, we retrieve the current y position
      const floor = scene.children.find(obj => obj.userData.ground);
      return floor ? floor.position.y : 0; // If floor is not found, default to 0
    }

    // box
    function createBox() {
      let floorY = getFloorYPosition();
      let scale = { x: Math.random() * 10, y: Math.random() * 10, z: Math.random() * 10 }
      let pos = { x: (Math.random() - 0.5) * 100, y: floorY + scale.y / 2, z: (Math.random() - 0.5) * 100 }

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
      let floorY = getFloorYPosition();
      let radius = Math.random() * 10;
      let pos = { x: (Math.random() - 0.5) * 100, y: floorY + radius, z: (Math.random() - 0.5) * 100 };

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
      let floorY = getFloorYPosition();
      let radius = Math.random() * 10;
      let height = Math.random() * 20;
      let pos = { x: (Math.random() - 0.5) * 100, y: floorY + height / 2, z: (Math.random() - 0.5) * 100 };

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
    var outlinePass = new OutlinePass(new THREE.Vector2(400, 400), scene, camera);
    
    
    const renderPass = new RenderPass( scene, camera );
    composer.addPass( renderPass );
    outlinePass.visibleEdgeColor.set('#ff0000');
    outlinePass.hiddenEdgeColor.set('#ff0000');
    composer.addPass(outlinePass);

    const outputPass = new OutputPass();
    composer.addPass( outputPass );

    
    function intersect(pos: THREE.Vector2) {
      raycaster.setFromCamera(pos, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);
      return intersects.filter(intersect => intersect.object.visible);
    }
    
    function changeColor(object: THREE.Object3D) {
      if (object instanceof THREE.Mesh) {
        const color = new THREE.Color(Math.random(), Math.random(), Math.random());
        (object.material as THREE.MeshPhongMaterial).color = color;
      }
    }

    function updateOutline() {
      if (draggable) {
        outlinePass.selectedObjects = [draggable];
      } else {
        outlinePass.selectedObjects = [];
      }
    }

    function oscillateObjects(scene: THREE.Scene, animateToggle: boolean) {
      if (animateToggle) {
        scene.children.forEach(child => {
          child.position.y += Math.sin(Date.now() * 0.001) * 0.1;
        });
      }
    }

    window.addEventListener('click', event => {
      // THREE RAYCASTER
      clickMouse.x = ((event.clientX - renderer.domElement.offsetLeft) / renderer.domElement.clientWidth) * 2 - 1;
      clickMouse.y = -((event.clientY - renderer.domElement.offsetTop) / renderer.domElement.clientHeight) * 2 + 1;

      if (draggable != null) {
        console.log(`dropping draggable ${draggable.userData.name}`)
        draggable = null;
        updateOutline();
        return;
      }
    
      const found = intersect(clickMouse);
      if (found.length > 0) {
        const draggableObject = found.find(intersectObject => intersectObject.object.userData.draggable && intersectObject.object.visible);
        if (draggableObject) {
          draggable = draggableObject.object;
          console.log(`found draggable ${draggable.userData.name}`)
          updateOutline();
        }
      }
    })
    
    window.addEventListener('mousemove', event => {
      moveMouse.x = ((event.clientX - renderer.domElement.offsetLeft) / renderer.domElement.clientWidth) * 2 - 1;
      moveMouse.y = -((event.clientY - renderer.domElement.offsetTop) / renderer.domElement.clientHeight) * 2 + 1;
    });

    window.addEventListener('keydown', event => {
      if (event.code === 'ArrowUp') {
        if (draggable != null) {
          draggable.position.y += 0.2;
        }
      } else if (event.code === 'ArrowDown') {
        if (draggable != null) {
          draggable.position.y -= 0.2;
        }
      } else if (event.code === 'ArrowRight') {
        if (draggable != null) {
          draggable.scale.x *= 1.1;
          draggable.scale.y *= 1.1;
          draggable.scale.z *= 1.1;
        }
      } else if (event.code === 'ArrowLeft') {
        if (draggable != null) {
          draggable.scale.x /= 1.1;
          draggable.scale.y /= 1.1;
          draggable.scale.z /= 1.1;
        }
      } else if (event.code === 'Space') {
        if (draggable != null) {
          changeColor(draggable);
        } else {
          createRandomObject();
        }
      } else if (event.code === 'Backspace') {
        if (draggable != null) {
          scene.remove(draggable);
          draggable = null;
          updateOutline();
        }
      } else if (event.code === 'KeyF') {
        scene.children.forEach(child => {
          if (child.userData.ground) {
            changeColor(child);
          }
        });
      } else if (event.code === 'Digit1') {
        createBox();
      } else if (event.code === 'Digit2') {
        createSphere();
      } else if (event.code === 'Digit3') {
        createCylinder();
      } else if (event.code === 'KeyP') {
        animateToggleRef.current = !animateToggleRef.current;
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
      <h1 className="text-xl mb-2">Three.JS + Fal SDXL Turbo Demo</h1>
      <details className="instructions text-sm">
        <summary className="font-bold cursor-pointer">App Instructions</summary>
        <div>
          <p>Interact with the 3D scene using your mouse and keyboard:</p>
          <ul className="list-disc pl-4">
            <li><strong>Rotate View:</strong> Click and drag to rotate the camera.</li>
            <li><strong>Select Object:</strong> Click an object to select it (outlined in red).</li>
            <li><strong>Deselect Object:</strong> Click on empty space to deselect.</li>
          </ul>
          <p>Use the following keyboard shortcuts:</p>
          <ul className="list-disc pl-4">
            <li><strong>Arrow Up:</strong> Increase scale of selected object.</li>
            <li><strong>Arrow Down:</strong> Decrease scale of selected object.</li>
            <li><strong>Space:</strong> Change color of selected object or create a new object if none is selected.</li>
            <li><strong>Delete:</strong> Remove selected object.</li>
            <li><strong>Key F:</strong> Change floor color.</li>
            <li><strong>Digit 1:</strong> Create a box.</li>
            <li><strong>Digit 2:</strong> Create a sphere.</li>
            <li><strong>Digit 3:</strong> Create a cylinder.</li>
            <li><strong>Key P:</strong> Toggle object movement.</li>
          </ul>
          <p>Other controls:</p>
          <ul className="list-disc pl-4">
            <li>Click the <strong>Pause/Start Movement Button</strong> to toggle object animation.</li>
            <li>Enter a text prompt for image generation in the <strong>Prompt Input</strong>.</li>
          </ul>
          <p>Generated images based on the 3D scene and prompt will be displayed next to the canvas.</p>
        </div>
      </details>
      <button
        className='border rounded-lg p-2 mb-2'
        onClick={() => setAnimateToggle(!animateToggle)}
      >
        {animateToggle ? 'Pause Movement' : 'Start Movement'}
      </button>
      <p><small>Enter your prompt</small></p>
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
