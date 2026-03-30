import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { type LayoutChangeEvent } from "react-native";
import { Gesture } from "react-native-gesture-handler";

export type MaskPoint = {
  x: number;
  y: number;
};

export type MaskStroke = {
  id: string;
  kind?: "stroke" | "region";
  tool?: "brush" | "eraser";
  width: number;
  points: MaskPoint[];
  path: string;
};

type UseMaskDrawingOptions = {
  disabled?: boolean;
  toolMode?: "brush" | "eraser";
  initialBrushWidth: number;
  minBrushWidth: number;
  maxBrushWidth: number;
  pointSmoothing?: number;
  minimumPointDelta?: number;
  loupeSize?: number;
  loupeZoom?: number;
};

type LoupeMetrics = {
  left: number;
  top: number;
  translateX: number;
  translateY: number;
  size: number;
  zoom: number;
};

function buildSmoothPath(points: MaskPoint[]) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y} L ${points[0].x} ${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    path += ` Q ${current.x} ${current.y} ${midX} ${midY}`;
  }

  const last = points[points.length - 1];
  path += ` L ${last.x} ${last.y}`;
  return path;
}

function buildClosedPath(points: MaskPoint[]) {
  if (!points.length) return "";
  const [first, ...rest] = points;
  let path = `M ${first.x} ${first.y}`;
  for (const point of rest) {
    path += ` L ${point.x} ${point.y}`;
  }
  path += " Z";
  return path;
}

function buildCompoundClosedPath(regions: MaskPoint[][]) {
  return regions
    .filter((points) => points.length >= 3)
    .map((points) => buildClosedPath(points))
    .join(" ");
}

function cloneStroke(stroke: MaskStroke | null) {
  if (!stroke) return null;
  return {
    ...stroke,
    points: [...stroke.points],
  };
}

function clampPoint(point: MaskPoint, width: number, height: number) {
  return {
    x: Math.max(0, Math.min(point.x, width)),
    y: Math.max(0, Math.min(point.y, height)),
  };
}

export function useMaskDrawing({
  disabled = false,
  toolMode = "brush",
  initialBrushWidth,
  minBrushWidth,
  maxBrushWidth,
  pointSmoothing = 0.42,
  minimumPointDelta = 0.8,
  loupeSize = 116,
  loupeZoom = 1.8,
}: UseMaskDrawingOptions) {
  const [strokes, setStrokes] = useState<MaskStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<MaskStroke | null>(null);
  const [redoStrokes, setRedoStrokes] = useState<MaskStroke[]>([]);
  const [activePoint, setActivePoint] = useState<MaskPoint | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushWidth, setBrushWidth] = useState(initialBrushWidth);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [sliderWidth, setSliderWidth] = useState(0);

  const frameRef = useRef<number | null>(null);
  const strokeIdRef = useRef(0);
  const currentStrokeRef = useRef<MaskStroke | null>(null);
  const activePointRef = useRef<MaskPoint | null>(null);

  const flushVisualState = useCallback(() => {
    frameRef.current = null;
    setCurrentStroke(cloneStroke(currentStrokeRef.current));
    setActivePoint(activePointRef.current ? { ...activePointRef.current } : null);
  }, []);

  const scheduleVisualState = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(flushVisualState);
  }, [flushVisualState]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const handleCanvasLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    setCanvasSize((current) =>
      current.width === nextWidth && current.height === nextHeight ? current : { width: nextWidth, height: nextHeight },
    );
  }, []);

  const startStroke = useCallback(
    (x: number, y: number) => {
      if (disabled || canvasSize.width <= 0 || canvasSize.height <= 0) return;

      const point = clampPoint({ x, y }, canvasSize.width, canvasSize.height);
      const stroke: MaskStroke = {
        id: `mask-stroke-${strokeIdRef.current++}`,
        kind: "stroke",
        tool: toolMode,
        width: brushWidth,
        points: [point],
        path: buildSmoothPath([point]),
      };

      currentStrokeRef.current = stroke;
      activePointRef.current = point;
      setIsDrawing(true);
      scheduleVisualState();
    },
    [brushWidth, canvasSize.height, canvasSize.width, disabled, scheduleVisualState, toolMode],
  );

  const extendStroke = useCallback(
    (x: number, y: number) => {
      const activeStrokeValue = currentStrokeRef.current;
      if (!activeStrokeValue) return;

      const rawPoint = clampPoint({ x, y }, canvasSize.width, canvasSize.height);
      const lastPoint = activeStrokeValue.points[activeStrokeValue.points.length - 1] ?? rawPoint;
      const nextPoint = {
        x: lastPoint.x + (rawPoint.x - lastPoint.x) * pointSmoothing,
        y: lastPoint.y + (rawPoint.y - lastPoint.y) * pointSmoothing,
      };

      if (
        Math.abs(lastPoint.x - nextPoint.x) < minimumPointDelta &&
        Math.abs(lastPoint.y - nextPoint.y) < minimumPointDelta
      ) {
        activePointRef.current = rawPoint;
        scheduleVisualState();
        return;
      }

      const nextPoints = [...activeStrokeValue.points, nextPoint];
      currentStrokeRef.current = {
        ...activeStrokeValue,
        points: nextPoints,
        path: buildSmoothPath(nextPoints),
      };
      activePointRef.current = rawPoint;
      scheduleVisualState();
    },
    [canvasSize.height, canvasSize.width, minimumPointDelta, pointSmoothing, scheduleVisualState],
  );

  const finishStroke = useCallback(() => {
    const activeStrokeValue = currentStrokeRef.current;
    if (!activeStrokeValue) return;

    currentStrokeRef.current = null;
    activePointRef.current = null;
    setCurrentStroke(null);
    setActivePoint(null);
    setIsDrawing(false);
    setStrokes((current) => [...current, activeStrokeValue]);
    setRedoStrokes([]);
  }, []);

  const undoLastStroke = useCallback(() => {
    currentStrokeRef.current = null;
    activePointRef.current = null;
    setCurrentStroke(null);
    setActivePoint(null);
    setIsDrawing(false);
    setStrokes((current) => {
      if (!current.length) {
        return current;
      }

      const nextStroke = current[current.length - 1];
      setRedoStrokes((redoCurrent) => [...redoCurrent, nextStroke]);
      return current.slice(0, -1);
    });
  }, []);

  const redoLastStroke = useCallback(() => {
    currentStrokeRef.current = null;
    activePointRef.current = null;
    setCurrentStroke(null);
    setActivePoint(null);
    setIsDrawing(false);
    setRedoStrokes((current) => {
      if (!current.length) {
        return current;
      }

      const nextStroke = current[current.length - 1];
      setStrokes((strokesCurrent) => [...strokesCurrent, nextStroke]);
      return current.slice(0, -1);
    });
  }, []);

  const clearMask = useCallback(() => {
    currentStrokeRef.current = null;
    activePointRef.current = null;
    setCurrentStroke(null);
    setActivePoint(null);
    setIsDrawing(false);
    setStrokes([]);
    setRedoStrokes([]);
  }, []);

  const replaceMaskWithRegions = useCallback(
    (regions: MaskPoint[][]) => {
      const sanitizedRegions = regions.filter((points) => points.length >= 3);
      currentStrokeRef.current = null;
      activePointRef.current = null;
      setCurrentStroke(null);
      setActivePoint(null);
      setIsDrawing(false);
      setStrokes(
        sanitizedRegions.length
          ? [
              {
                id: `mask-region-${strokeIdRef.current++}`,
                kind: "region" as const,
                tool: "brush" as const,
                width: 0,
                points: sanitizedRegions[0],
                path: buildCompoundClosedPath(sanitizedRegions),
              },
            ]
          : [],
      );
      setRedoStrokes([]);
    },
    [],
  );

  const resetMaskDrawing = useCallback((options?: { resetBrush?: boolean }) => {
    clearMask();
    setCanvasSize({ width: 0, height: 0 });
    setSliderWidth(0);
    if (options?.resetBrush) {
      setBrushWidth(initialBrushWidth);
    }
  }, [clearMask, initialBrushWidth]);

  const updateBrushFromPosition = useCallback(
    (x: number) => {
      if (sliderWidth <= 0) return;
      const ratio = Math.max(0, Math.min(x / sliderWidth, 1));
      setBrushWidth(Math.round(minBrushWidth + ratio * (maxBrushWidth - minBrushWidth)));
    },
    [maxBrushWidth, minBrushWidth, sliderWidth],
  );

  const drawGesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(0)
        .maxPointers(1)
        .averageTouches(true)
        .shouldCancelWhenOutside(true)
        .onBegin((event) => startStroke(event.x, event.y))
        .onUpdate((event) => extendStroke(event.x, event.y))
        .onFinalize(() => finishStroke()),
    [extendStroke, finishStroke, startStroke],
  );

  const sliderGesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .onBegin((event) => updateBrushFromPosition(event.x))
        .onUpdate((event) => updateBrushFromPosition(event.x)),
    [updateBrushFromPosition],
  );

  const renderedStrokes = useMemo(
    () => (currentStroke ? [...strokes, currentStroke] : strokes),
    [currentStroke, strokes],
  );

  const brushProgress = sliderWidth > 0 ? (brushWidth - minBrushWidth) / (maxBrushWidth - minBrushWidth) : 0;

  const loupeMetrics = useMemo<LoupeMetrics | null>(() => {
    if (!activePoint || canvasSize.width <= 0 || canvasSize.height <= 0) return null;

    return {
      left: Math.max(12, Math.min(activePoint.x - loupeSize / 2, Math.max(canvasSize.width - loupeSize - 12, 12))),
      top: Math.max(12, Math.min(activePoint.y - loupeSize - 28, Math.max(canvasSize.height - loupeSize - 12, 12))),
      translateX: -(activePoint.x * loupeZoom - loupeSize / 2),
      translateY: -(activePoint.y * loupeZoom - loupeSize / 2),
      size: loupeSize,
      zoom: loupeZoom,
    };
  }, [activePoint, canvasSize.height, canvasSize.width, loupeSize, loupeZoom]);

  return {
    strokes,
    currentStroke,
    renderedStrokes,
    activePoint,
    isDrawing,
    brushWidth,
    setBrushWidth: setBrushWidth as Dispatch<SetStateAction<number>>,
    brushProgress,
    canvasSize,
    sliderWidth,
    setSliderWidth,
    hasMask: renderedStrokes.length > 0,
    handleCanvasLayout,
    clearMask,
    undoLastStroke,
    resetMaskDrawing,
    replaceMaskWithRegions,
    drawGesture,
    sliderGesture,
    loupeMetrics,
    redoLastStroke,
    canRedo: redoStrokes.length > 0,
  };
}
