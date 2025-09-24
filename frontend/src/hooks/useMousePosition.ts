import { useEffect, useState } from "react";

function useMousePositionAndWidth() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };

    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    // Add event listener for mouse movement on the window
    window.addEventListener("mousemove", handleMouseMove);

    // Add event listener for window resize to update element width
    window.addEventListener("resize", handleResize);

    // Initial width measurement
    handleResize();

    // Cleanup function to remove event listeners
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return { mousePosition, windowSize };
}

export default useMousePositionAndWidth;
