'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

const floatingClouds = [
  { id: 1, top: '10%', left: '45%', width: 180, height: 60, opacity: 0.55, speedX: 1.4, speedY: 0.22 },
  { id: 2, top: '40%', left: '7%', width: 200, height: 90, opacity: 0.65, speedX: 2.2, speedY: 0.38 },
  { id: 3, top: '50%', left: '70%', width: 200, height: 90, opacity: 0.65, speedX: 2.2, speedY: 0.38 },
];

export function LoginScene() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const move = useCallback((event: MouseEvent) => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    setMouse({ x: (event.clientX - centerX) / centerX, y: (event.clientY - centerY) / centerY });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, [move]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {floatingClouds.map((cloud) => (
        <div key={cloud.id} className="absolute" style={{ top: cloud.top, left: cloud.left, zIndex: 3, width: cloud.width, height: cloud.height, transform: `translate(${mouse.x * -cloud.speedX * 20}px, ${mouse.y * cloud.speedY * 20}px)`, transition: 'transform .2s ease-out' }}>
          <Image src="/images/nuvemFundo.png" alt="" fill loading="eager" sizes={`${cloud.width}px`} style={{ opacity: cloud.opacity, objectFit: 'contain' }} />
        </div>
      ))}

      <div className="absolute bottom-[-5px] left-[-3%] w-[106%]" style={{ zIndex: 8, transform: `translate(${mouse.x * -10}px, ${mouse.y * 5}px)`, transition: 'transform .22s ease-out' }}>
        <Image src="/images/camadas/terceiraCamada.png" alt="" width={1279} height={302} loading="eager" className="h-auto w-full object-cover object-bottom opacity-25 [filter:brightness(.3)_contrast(1.3)_saturate(.5)]" />
      </div>
      <div className="absolute bottom-[-10px] left-[-4vw] w-[60vw]" style={{ zIndex: 9, transform: `translate(${mouse.x * -18}px, ${mouse.y * 10}px)`, transition: 'transform .18s ease-out' }}>
        <Image src="/images/camadas/segundaCamada.png" alt="" width={829} height={233} loading="eager" className="h-auto w-full object-cover object-left-bottom opacity-60 [filter:brightness(.45)_contrast(1.2)_saturate(.7)_hue-rotate(10deg)]" />
      </div>
      <div className="absolute bottom-[-15px] right-[-4vw] w-[70vw]" style={{ zIndex: 10, transform: `translate(${mouse.x * -25}px, ${mouse.y * 15}px)`, transition: 'transform .15s ease-out' }}>
        <Image src="/images/camadas/primeiraCamada.png" alt="" width={899} height={237} loading="eager" className="h-auto w-full object-cover object-right-bottom [filter:brightness(.75)_contrast(1.1)_hue-rotate(15deg)]" />
      </div>

      <div className="absolute bottom-0 left-0 h-[4vh] w-full bg-white [filter:brightness(.75)_contrast(1.1)_hue-rotate(15deg)]" style={{ zIndex: 20 }}>
        <Image src="/images/onibus.png" alt="Ônibus" width={203} height={159} className="login-scene-bus absolute bottom-full left-[25%] h-[18vh] w-auto object-contain [filter:brightness(1)_contrast(1.05)]" />
      </div>
    </div>
  );
}
