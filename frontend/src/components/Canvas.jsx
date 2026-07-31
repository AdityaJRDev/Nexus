import React, { useRef, useEffect } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { useDrag, useWheel } from '@use-gesture/react';
import useStore from '../store/useStore';
import Tile from './Tile';

const Canvas = () => {
  const tiles = useStore((state) => state.tiles);
  const containerRef = useRef(null);

  // Canvas state for panning and zooming
  const [{ x, y, scale }, api] = useSpring(() => ({
    x: 0,
    y: 0,
    scale: 1,
    config: { tension: 350, friction: 30 },
  }));

  // Middle click (button 1) or Spacebar drag. We will just support any drag on the canvas background for now, or require spacebar.
  // Let's implement simple middle click or any drag on the canvas root.
  const bindDrag = useDrag(
    ({ movement: [mx, my], offset: [ox, oy], event, first, target }) => {
      // Allow panning with left, middle or right click on background
      api.start({ x: ox, y: oy });
    },
    {
      from: () => [x.get(), y.get()],
    }
  );

  const bindWheel = useWheel(
    ({ event, offset: [, oy], active }) => {
      event.preventDefault(); // Prevent native scroll
      // Simple scaling logic based on wheel scroll
      // A more robust implementation would zoom toward the mouse cursor
      const newScale = Math.max(0.1, Math.min(3, 1 - oy / 500));
      api.start({ scale: newScale });
    },
    {
      target: containerRef,
      eventOptions: { passive: false },
    }
  );

  return (
    <div
      ref={containerRef}
      {...bindDrag()}
      className="w-screen h-screen overflow-hidden bg-neutral-900 cursor-grab active:cursor-grabbing relative"
      style={{ touchAction: 'none' }}
    >
      {/* Background Pattern */}
      <animated.div
        style={{
          x,
          y,
          scale,
          transformOrigin: '0 0',
          width: '100%',
          height: '100%',
        }}
        className="absolute inset-0"
      >
        <div
          className="absolute w-[10000px] h-[10000px] -left-[5000px] -top-[5000px]"
          style={{
            backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            backgroundPosition: '0 0',
          }}
        />
        
        {/* Tiles */}
        {tiles.map((tile) => (
          <Tile key={tile.id} {...tile} />
        ))}
      </animated.div>
    </div>
  );
};

export default Canvas;
