// Browser display geometry. Gaze coordinates are in viewport CSS pixels, so
// these numbers decide (a) whether a calibration still holds and (b) how gaze
// maps onto the screen recording's frames.

export interface DisplayInfo {
  innerWidth: number;
  innerHeight: number;
  devicePixelRatio: number;
  screenWidth: number;
  screenHeight: number;
  screenX: number;
  screenY: number;
  outerWidth: number;
  outerHeight: number;
}

const CALIBRATION_KEY = 'calibration_display';

export function readDisplay(): DisplayInfo {
  return {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    screenX: window.screenX,
    screenY: window.screenY,
    outerWidth: window.outerWidth,
    outerHeight: window.outerHeight,
  };
}

/**
 * The fields that change what a viewport pixel means physically. Browser zoom
 * changes innerWidth and devicePixelRatio in Chrome, so zoom is covered too.
 */
export function describeDisplayChange(from: DisplayInfo, to: DisplayInfo): string[] {
  const changes: string[] = [];
  if (from.innerWidth !== to.innerWidth || from.innerHeight !== to.innerHeight) {
    changes.push(
      `viewport ${from.innerWidth}×${from.innerHeight} → ${to.innerWidth}×${to.innerHeight}`
    );
  }
  if (from.devicePixelRatio !== to.devicePixelRatio) {
    changes.push(`pixel ratio ${from.devicePixelRatio} → ${to.devicePixelRatio} (zoom or display change)`);
  }
  if (from.screenX !== to.screenX || from.screenY !== to.screenY) {
    changes.push(`window moved (${from.screenX},${from.screenY}) → (${to.screenX},${to.screenY})`);
  }
  return changes;
}

// sessionStorage matches a calibration's lifetime: one tab, cleared on close.
export function saveCalibrationDisplay(info: DisplayInfo) {
  try {
    sessionStorage.setItem(CALIBRATION_KEY, JSON.stringify(info));
  } catch {
    // storage unavailable — the server-side snapshot is still logged
  }
}

export function getCalibrationDisplay(): DisplayInfo | null {
  try {
    const raw = sessionStorage.getItem(CALIBRATION_KEY);
    return raw ? (JSON.parse(raw) as DisplayInfo) : null;
  } catch {
    return null;
  }
}
