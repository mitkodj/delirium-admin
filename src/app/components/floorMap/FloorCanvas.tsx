import React, { useRef, useState } from 'react';
import { View, Pressable, StyleSheet, PanResponder } from 'react-native';
import { FloorObject } from '../../../types/FloorMap';
import FloorItem from './FloorItem';
import themeConfig from '../../../themes/themeConfig';

const GRID_SIZE = 40;
const MIN_SCALE = 1;
const MAX_SCALE = 4;

interface Props {
  objects: FloorObject[];
  selectedId: string | null;
  width: number;
  height: number;
  isReadonly: boolean;
  selectOnly?: boolean;
  zoomEnabled?: boolean;
  tableColorOverrides?: Record<string, string>;
  pulsingTableIds?: string[];
  dimmedTableId?: string;
  onDeselect: () => void;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Pick<FloorObject, 'x' | 'y' | 'width' | 'height' | 'label'>>) => void;
}

type Touch2 = { pageX: number; pageY: number; locationX: number; locationY: number };

function getTouchDist(t: Touch2[]) {
  const dx = t[1].pageX - t[0].pageX;
  const dy = t[1].pageY - t[0].pageY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getMidpoint(t: Touch2[]) {
  return { x: (t[0].pageX + t[1].pageX) / 2, y: (t[0].pageY + t[1].pageY) / 2 };
}

export default function FloorCanvas({
  objects, selectedId, width, height, isReadonly, selectOnly, zoomEnabled: zoomEnabledProp, tableColorOverrides, pulsingTableIds, dimmedTableId, onDeselect, onSelect, onUpdate,
}: Props) {
  const vLines = Math.floor(width  / GRID_SIZE);
  const hLines = Math.floor(height / GRID_SIZE);

  const zoomEnabled = zoomEnabledProp ?? isReadonly;

  // live values — always reflect current state
  const liveScale = useRef(1);
  const liveTx    = useRef(0);
  const liveTy    = useRef(0);
  // pinch anchor (captured at 2-finger gesture start)
  const baseScale = useRef(1);
  const baseTx    = useRef(0);
  const baseTy    = useRef(0);
  const initDist  = useRef(0);
  const initMid   = useRef({ x: 0, y: 0 });
  // 1-finger pan anchor — previous touch location in canvas-local coords
  const lastLoc = useRef<{ x: number; y: number } | null>(null);

  const [view, setView] = useState({ scale: 1, tx: 0, ty: 0 });

  const pinchResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: e => {
      if (!zoomEnabled) return false;
      const n = e.nativeEvent.touches.length;
      return n === 2 || (n === 1 && liveScale.current > 1);
    },
    onMoveShouldSetPanResponder: e => {
      if (!zoomEnabled) return false;
      const n = e.nativeEvent.touches.length;
      return n === 2 || (n === 1 && liveScale.current > 1);
    },
    onPanResponderGrant: e => {
      const touches = e.nativeEvent.touches as unknown as Touch2[];
      if (touches.length >= 2) {
        // capture pinch anchor
        baseScale.current = liveScale.current;
        baseTx.current    = liveTx.current;
        baseTy.current    = liveTy.current;
        initDist.current  = getTouchDist(touches);
        initMid.current   = getMidpoint(touches);
        lastLoc.current   = null;
      } else {
        lastLoc.current = { x: touches[0].pageX, y: touches[0].pageY };
      }
    },
    onPanResponderMove: e => {
      const touches = e.nativeEvent.touches as unknown as Touch2[];

      if (touches.length >= 2) {
        // ── pinch zoom ───────────────────────────────────────────────────────
        if (initDist.current === 0) return;
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE,
          baseScale.current * (getTouchDist(touches) / initDist.current),
        ));
        const mid  = getMidpoint(touches);
        const maxTx = (width  * (newScale - 1)) / 2;
        const maxTy = (height * (newScale - 1)) / 2;
        const newTx = Math.min(maxTx, Math.max(-maxTx, baseTx.current + mid.x - initMid.current.x));
        const newTy = Math.min(maxTy, Math.max(-maxTy, baseTy.current + mid.y - initMid.current.y));
        liveScale.current = newScale;
        liveTx.current    = newTx;
        liveTy.current    = newTy;
        setView({ scale: newScale, tx: newTx, ty: newTy });
        lastLoc.current = null; // keep anchor stale so 2→1 transition re-initialises

      } else if (touches.length === 1) {
        // ── one-finger pan — use pageX/Y (screen-absolute, unaffected by transforms)
        if (lastLoc.current === null) {
          // first frame after 2→1 transition: capture anchor, defer movement
          lastLoc.current = { x: touches[0].pageX, y: touches[0].pageY };
          return;
        }
        const rawDx = touches[0].pageX - lastLoc.current.x;
        const rawDy = touches[0].pageY - lastLoc.current.y;
        lastLoc.current = { x: touches[0].pageX, y: touches[0].pageY };

        const dx = rawDx;
        const dy = rawDy;

        const maxTx = (width  * (liveScale.current - 1)) / 2;
        const maxTy = (height * (liveScale.current - 1)) / 2;
        const newTx = Math.min(maxTx, Math.max(-maxTx, liveTx.current + dx));
        const newTy = Math.min(maxTy, Math.max(-maxTy, liveTy.current + dy));
        liveTx.current = newTx;
        liveTy.current = newTy;
        setView(prev => ({ ...prev, tx: newTx, ty: newTy }));
      }
    },
    // no release handler — view stays where fingers left it
  })).current;

  return (
    <View
      style={[styles.canvas, { width, height }, zoomEnabled && { overflow: 'visible', borderRadius: 0, borderWidth: 0 }]}
      {...(zoomEnabled ? pinchResponder.panHandlers : {})}
    >
      {/* Zoomable content layer */}
      <View
        pointerEvents={zoomEnabled && !selectOnly && isReadonly ? 'none' : 'box-none'}
        style={{ width, height, transform: zoomEnabled ? [{ translateX: view.tx }, { translateY: view.ty }, { scale: view.scale }] : undefined }}
      >
        {/* Background tap target — only active in edit mode */}
        <Pressable
          style={[StyleSheet.absoluteFillObject, { zIndex: 0 }]}
          onPress={isReadonly ? undefined : onDeselect}
        />

        {/* Grid overlay — edit mode only, touch-transparent */}
        {!isReadonly && (
          <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { zIndex: 1 }]}>
            {Array.from({ length: vLines }, (_, i) => (
              <View
                key={`v${i}`}
                style={[styles.gridLine, {
                  left: (i + 1) * GRID_SIZE,
                  top: 0,
                  width: 1,
                  height,
                }]}
              />
            ))}
            {Array.from({ length: hLines }, (_, i) => (
              <View
                key={`h${i}`}
                style={[styles.gridLine, {
                  top: (i + 1) * GRID_SIZE,
                  left: 0,
                  height: 1,
                  width,
                }]}
              />
            ))}
          </View>
        )}

        {objects.map(obj => (
          <FloorItem
            key={obj.id}
            item={obj}
            isSelected={selectedId === obj.id}
            isReadonly={isReadonly}
            selectOnly={selectOnly}
            colorOverride={tableColorOverrides?.[obj.id]}
            isPulsing={pulsingTableIds?.includes(obj.id) ?? false}
            staticOpacity={dimmedTableId === obj.id ? 0.35 : undefined}
            onSelect={onSelect}
            onUpdate={onUpdate}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    backgroundColor: '#14122a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeConfig.border.subtle,
    overflow: 'hidden',
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
});
