import { useRef, useCallback } from 'react';

const MOUSE_SAMPLE_INTERVAL_MS = 50;

export function useBehavior() {
  const events = useRef([]);
  const lastMouseSampleRef = useRef(0);

  const onKeyDown = useCallback((e) => {
   
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

  
  const attachKeyListeners = useCallback((element) => {
    if (!element) return;
    element.addEventListener('keydown', onKeyDown);
    element.addEventListener('keyup', onKeyUp);
    return () => {
      element.removeEventListener('keydown', onKeyDown);
      element.removeEventListener('keyup', onKeyUp);
    };
  }, [onKeyDown, onKeyUp]);

  
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