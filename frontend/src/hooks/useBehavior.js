import { useRef, useCallback } from 'react';

// Sampling interval for mousemove — raw mousemove can fire hundreds of times
// per second, which would flood the payload and the AI service for no real
// gain in signal. ~20 samples/sec is enough to reconstruct trajectory,
// speed, and jitter without the noise.
const MOUSE_SAMPLE_INTERVAL_MS = 50;

export function useBehavior() {
  const events = useRef([]);
  const lastMouseSampleRef = useRef(0);

  const onKeyDown = useCallback((e) => {
    // Ignore OS key-repeat (holding a key down fires many keydowns with no
    // matching keyup in between). Unpaired repeats desync the AI's
    // dwell/flight-time pairing logic and can crash the scoring step.
    if (e.repeat) return;

    events.current.push({
      type: 'key_down',
      target: e.key,
      timestamp: Date.now()
    });
  }, []);

  const onKeyUp = useCallback((e) => {
    events.current.push({
      type: 'key_up',
      target: e.key,
      timestamp: Date.now()
    });
  }, []);

  const onMouseMove = useCallback((e) => {
    const now = Date.now();
    if (now - lastMouseSampleRef.current < MOUSE_SAMPLE_INTERVAL_MS) return;
    lastMouseSampleRef.current = now;
    events.current.push({
      type: 'mouse_move',
      x: e.clientX,
      y: e.clientY,
      timestamp: now
    });
  }, []);

  const onMouseDown = useCallback((e) => {
    events.current.push({
      type: 'mouse_down',
      x: e.clientX,
      y: e.clientY,
      button: e.button,
      timestamp: Date.now()
    });
  }, []);

  const onMouseUp = useCallback((e) => {
    events.current.push({
      type: 'mouse_up',
      x: e.clientX,
      y: e.clientY,
      button: e.button,
      timestamp: Date.now()
    });
  }, []);

  const getEvents = useCallback(() => {
    return [...events.current];
  }, []);

  const clearEvents = useCallback(() => {
    events.current = [];
  }, []);

  // Keyboard-only listeners — used when you need typing capture scoped to
  // a specific focused element (e.g. the hidden input on EnrollPage).
  const attachKeyListeners = useCallback((element) => {
    if (!element) return;
    element.addEventListener('keydown', onKeyDown);
    element.addEventListener('keyup', onKeyUp);
    return () => {
      element.removeEventListener('keydown', onKeyDown);
      element.removeEventListener('keyup', onKeyUp);
    };
  }, [onKeyDown, onKeyUp]);

  // Mouse-only listeners — used when you want movement tracked across a
  // whole container regardless of what has keyboard focus.
  const attachMouseListeners = useCallback((element) => {
    if (!element) return;
    element.addEventListener('mousemove', onMouseMove);
    element.addEventListener('mousedown', onMouseDown);
    element.addEventListener('mouseup', onMouseUp);
    return () => {
      element.removeEventListener('mousemove', onMouseMove);
      element.removeEventListener('mousedown', onMouseDown);
      element.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove, onMouseDown, onMouseUp]);

  // Combined listeners on a single element — used by LiveMonitor, which
  // attaches everything to `document` and has no separate focused input
  // to worry about double-counting against.
  const attachListeners = useCallback((element) => {
    if (!element) return;
    element.addEventListener('keydown', onKeyDown);
    element.addEventListener('keyup', onKeyUp);
    element.addEventListener('mousemove', onMouseMove);
    element.addEventListener('mousedown', onMouseDown);
    element.addEventListener('mouseup', onMouseUp);
    return () => {
      element.removeEventListener('keydown', onKeyDown);
      element.removeEventListener('keyup', onKeyUp);
      element.removeEventListener('mousemove', onMouseMove);
      element.removeEventListener('mousedown', onMouseDown);
      element.removeEventListener('mouseup', onMouseUp);
    };
  }, [onKeyDown, onKeyUp, onMouseMove, onMouseDown, onMouseUp]);

  return {
    onKeyDown, onKeyUp, onMouseMove, onMouseDown, onMouseUp,
    getEvents, clearEvents,
    attachListeners, attachKeyListeners, attachMouseListeners
  };
}