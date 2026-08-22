// components/shooting-stars.jsx
import { useEffect, useRef, useState, useCallback } from "react";

const MIN_SPAWN_INTERVAL = 800; // jarak minimal antar bintang (ms)
const MAX_SPAWN_INTERVAL = 3500; // jarak maksimal antar bintang (ms)

const MIN_DURATION = 900; // kecepatan jatuh tercepat (ms)
const MAX_DURATION = 2200; // kecepatan jatuh terlambat (ms)

const MIN_LENGTH = 80; // panjang ekor terpendek (px)
const MAX_LENGTH = 220; // panjang ekor terpanjang (px)

const MIN_ANGLE = 20; // derajat, arah jatuh (dari horizontal)
const MAX_ANGLE = 45;

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

export default function ShootingStars() {
  const [stars, setStars] = useState([]);
  const idCounter = useRef(0);
  const timeoutRef = useRef(null);

  const spawnStar = useCallback(() => {
    const id = idCounter.current++;

    const angle = randomBetween(MIN_ANGLE, MAX_ANGLE);
    const duration = randomBetween(MIN_DURATION, MAX_DURATION);
    const tailLength = randomBetween(MIN_LENGTH, MAX_LENGTH);

    // Posisi awal random di sepanjang atas & kiri layar
    const startX = randomBetween(-10, 90); // vw
    const startY = randomBetween(-5, 30); // vh

    // Jarak tempuh, biar konsisten keluar layar berapapun sudutnya
    const travelDistance = randomBetween(400, 700);

    const newStar = {
      id,
      angle,
      duration,
      tailLength,
      startX,
      startY,
      travelDistance,
    };

    setStars((prev) => [...prev, newStar]);

    // Hapus dari array setelah animasi selesai
    setTimeout(() => {
      setStars((prev) => prev.filter((s) => s.id !== id));
    }, duration + 100);

    // Jadwalin spawn berikutnya dengan interval random
    const nextInterval = randomBetween(MIN_SPAWN_INTERVAL, MAX_SPAWN_INTERVAL);
    timeoutRef.current = setTimeout(spawnStar, nextInterval);
  }, []);

  useEffect(() => {
    // Mulai spawn pertama setelah delay singkat
    timeoutRef.current = setTimeout(spawnStar, 500);
    return () => clearTimeout(timeoutRef.current);
  }, [spawnStar]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[5] overflow-hidden">
      {stars.map((star) => (
        <div
          key={star.id}
          className="shooting-star"
          style={{
            "--angle": `${star.angle}deg`,
            "--duration": `${star.duration}ms`,
            "--tail-length": `${star.tailLength}px`,
            "--travel": `${star.travelDistance}px`,
            left: `${star.startX}vw`,
            top: `${star.startY}vh`,
          }}
        />
      ))}

      <style>{`
        .shooting-star {
          position: absolute;
          width: 2px;
          height: 2px;
          background: #ffffff;
          border-radius: 50%;
          transform: rotate(var(--angle));
          animation: shooting-star-fall var(--duration) linear forwards;
        }

        .shooting-star::before {
          content: "";
          position: absolute;
          top: 50%;
          right: 0;
          width: var(--tail-length);
          height: 1px;
          background: linear-gradient(
            to left,
            rgba(255, 255, 255, 0.9),
            rgba(243, 243, 242, 0.4) 40%,
            transparent
          );
          transform: translateY(-50%);
        }

        @keyframes shooting-star-fall {
          0% {
            opacity: 0;
            transform: rotate(var(--angle)) translateX(0);
          }
          8% {
            opacity: 1;
          }
          85% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: rotate(var(--angle)) translateX(var(--travel));
          }
        }
      `}</style>
    </div>
  );
}
