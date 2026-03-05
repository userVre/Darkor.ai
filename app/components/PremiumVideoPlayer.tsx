"use client";

import { motion, useSpring } from "framer-motion";
import { Maximize, Minimize, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";

type PremiumVideoPlayerProps = {
  src: string;
  poster?: string;
  className?: string;
};

const SPEEDS = [1, 1.5, 2] as const;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function PremiumVideoPlayer({ src, poster, className = "" }: PremiumVideoPlayerProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const hideControlsTimeoutRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [lastVolume, setLastVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const rotateX = useSpring(0, { stiffness: 220, damping: 22, mass: 0.6 });
  const rotateY = useSpring(0, { stiffness: 220, damping: 22, mass: 0.6 });

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const clearHideControlsTimer = () => {
    if (hideControlsTimeoutRef.current !== null) {
      window.clearTimeout(hideControlsTimeoutRef.current);
      hideControlsTimeoutRef.current = null;
    }
  };

  const scheduleHideControls = () => {
    clearHideControlsTimer();

    if (!isPlaying || isHovering || isDragging) {
      return;
    }

    hideControlsTimeoutRef.current = window.setTimeout(() => {
      setShowControls(false);
    }, 1400);
  };

  const revealControls = () => {
    setShowControls(true);
    scheduleHideControls();
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === wrapperRef.current);
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    scheduleHideControls();
    return () => clearHideControlsTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, isHovering, isDragging]);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (video.paused) {
      await video.play();
      setIsPlaying(true);
      revealControls();
      return;
    }

    video.pause();
    setIsPlaying(false);
    revealControls();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (video.muted || video.volume === 0) {
      video.muted = false;
      video.volume = lastVolume > 0 ? lastVolume : 1;
      setIsMuted(false);
      revealControls();
      return;
    }

    setLastVolume(video.volume || 1);
    video.muted = true;
    setIsMuted(true);
    revealControls();
  };

  const cycleSpeed = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const nextIndex = (speedIndex + 1) % SPEEDS.length;
    video.playbackRate = SPEEDS[nextIndex];
    setSpeedIndex(nextIndex);
    revealControls();
  };

  const seekToClientX = (clientX: number) => {
    const bar = progressRef.current;
    const video = videoRef.current;
    if (!bar || !video || !duration) {
      return;
    }

    const rect = bar.getBoundingClientRect();
    const clamped = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const ratio = rect.width > 0 ? clamped / rect.width : 0;
    const nextTime = ratio * duration;

    video.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const onPointerDownProgress = (event: PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    seekToClientX(event.clientX);
    revealControls();
  };

  const onPointerMoveProgress = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) {
      return;
    }
    seekToClientX(event.clientX);
  };

  const onPointerUpProgress = () => {
    setIsDragging(false);
    scheduleHideControls();
  };

  const toggleFullscreen = async () => {
    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return;
    }

    if (document.fullscreenElement === wrapper) {
      await document.exitFullscreen();
      revealControls();
      return;
    }

    await wrapper.requestFullscreen();
    revealControls();
  };

  const onMouseMoveTilt = (event: MouseEvent<HTMLDivElement>) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return;
    }

    const rect = wrapper.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;

    const xRatio = (offsetX / rect.width - 0.5) * 2;
    const yRatio = (offsetY / rect.height - 0.5) * 2;

    rotateY.set(xRatio * 7);
    rotateX.set(-yRatio * 7);
    revealControls();
  };

  const resetTilt = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div
      ref={wrapperRef}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        transformPerspective: 1400,
      }}
      onMouseEnter={() => {
        setIsHovering(true);
        revealControls();
      }}
      onMouseLeave={() => {
        setIsHovering(false);
        setIsDragging(false);
        resetTilt();
        scheduleHideControls();
      }}
      onMouseMove={onMouseMoveTilt}
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-black/55 shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-white/10 via-transparent to-fuchsia-500/10" />

      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        preload="metadata"
        muted
        className="h-full w-full object-cover"
        onLoadedMetadata={(event) => {
          const target = event.currentTarget;
          setDuration(target.duration || 0);
          target.playbackRate = SPEEDS[speedIndex];
          revealControls();
        }}
        onTimeUpdate={(event) => {
          setCurrentTime(event.currentTarget.currentTime);
        }}
        onPlay={() => {
          setIsPlaying(true);
          scheduleHideControls();
        }}
        onPause={() => {
          setIsPlaying(false);
          revealControls();
        }}
      />

      <button
        type="button"
        onClick={() => void togglePlay()}
        className="absolute inset-0 z-[2]"
        aria-label={isPlaying ? "Pause video" : "Play video"}
      />

      <motion.div
        initial={false}
        animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : 8 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        className="absolute inset-x-0 bottom-0 z-[3] p-3"
      >
        <div className="rounded-2xl border border-white/20 bg-black/55 p-3 backdrop-blur-md">
          <div
            ref={progressRef}
            role="slider"
            aria-label="Video progress"
            aria-valuemin={0}
            aria-valuemax={Math.floor(duration || 0)}
            aria-valuenow={Math.floor(currentTime)}
            tabIndex={0}
            onPointerDown={onPointerDownProgress}
            onPointerMove={onPointerMoveProgress}
            onPointerUp={onPointerUpProgress}
            onPointerCancel={onPointerUpProgress}
            className="relative mb-3 h-2 w-full cursor-pointer rounded-full bg-white/20"
          >
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400"
              style={{ width: `${progress}%` }}
            />
            <div
              className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-white/30 bg-white shadow-lg"
              style={{ left: `calc(${progress}% - 8px)` }}
            />
          </div>

          <div className="flex items-center gap-2 text-zinc-100">
            <button
              type="button"
              onClick={() => void togglePlay()}
              className="rounded-lg border border-white/20 bg-white/10 p-2 transition hover:bg-white/20"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-white" />}
            </button>

            <button
              type="button"
              onClick={toggleMute}
              className="rounded-lg border border-white/20 bg-white/10 p-2 transition hover:bg-white/20"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>

            <span className="min-w-[88px] text-xs font-medium text-zinc-200">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={cycleSpeed}
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold transition hover:bg-white/20"
                aria-label="Playback speed"
              >
                {SPEEDS[speedIndex]}x
              </button>

              <button
                type="button"
                onClick={() => void toggleFullscreen()}
                className="rounded-lg border border-white/20 bg-white/10 p-2 transition hover:bg-white/20"
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
