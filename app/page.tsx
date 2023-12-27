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


  useEffect(() => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xADD8E6); // Set scene background to baby blue
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    const renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        preserverDrawingBuffer: true
      });

    const controls = new OrbitControls( camera, renderer.domElement );

    renderer.setSize(400,400)
    const light = new THREE.AmbientLight( 0x404040 ); // soft white light
    scene.add( light );

    const geometry = new THREE.TorusKnotGeometry( 2, 0.2, 100, 16 ); 
    const material = new THREE.MeshNormalMaterial({
      // color: 0x00ff00
    });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    camera.position.z = 5;
    let hue = 0;
    controls.update();

    // let currentInput = getCurrentInput()
    // console.log(currentInput)
    const animate = async function () {
      setTimeout( async function() {
        controls.update();
        requestAnimationFrame(animate);
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;

        // Change the cube's color over time
        hue += 0.01;
        if (hue >= 1) hue = 0; // Reset hue after full spectrum
        const color = new THREE.Color(`hsl(${hue * 360}, 100%, 50%)`);
        cube.material.color = color;

        // Move the cube up and down over time in a smooth sin curve
        cube.position.y = Math.sin(Date.now() * 0.001) * 2;

        renderer.render(scene, camera);
        // setAppState(appState)
        let dataUrl = await getDataUrl()
        send({
          ...baseArgs,
          image_url: dataUrl,
          prompt: inputRef.current.value,
        })

      }, 1000 / 10);
    };

    animate();

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
      <p className="text-xl mb-2">Fal SDXL Turbo</p>
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
      <div>
        <canvas ref={canvasRef} />
        {
          image && (
            <Image
              src={image}
              width={400}
              height={400}
              alt='fal image'
            />
          )
        }
        
      </div>
    </main>
  )
}
