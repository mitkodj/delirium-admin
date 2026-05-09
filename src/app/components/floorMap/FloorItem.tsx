import React, { useRef, useState, useEffect } from 'react';
import { Animated, View, Text, TextInput, Modal, TouchableOpacity, Pressable, PanResponder, StyleSheet } from 'react-native';
import { FloorObject, FloorObjectType } from '../../../types/FloorMap';
import themeConfig from '../../../themes/themeConfig';

const MIN_SIZE = 40;
const HANDLE_SIZE = 14;

type ShapeStyle = { fill: string; border: string; labelColor: string };

const TYPE_STYLES: Record<FloorObjectType, ShapeStyle> = {
  table_circle:   { fill: '#2e2c52', border: '#7a72cc', labelColor: '#c8c0ff' },
  table_vip_rect: { fill: '#2e2c52', border: '#7a72cc', labelColor: '#c8c0ff' },
  stage_circle:   { fill: '#9b7acc', border: '#9b7acc', labelColor: '#1a1028' },
  stage_rect:     { fill: '#9b7acc', border: '#9b7acc', labelColor: '#1a1028' },
};


interface Props {
  item: FloorObject;
  isSelected: boolean;
  isReadonly: boolean;
  selectOnly?: boolean;
  colorOverride?: string;
  isPulsing?: boolean;
  staticOpacity?: number;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Pick<FloorObject, 'x' | 'y' | 'width' | 'height' | 'label' | 'capacity'>>) => void;
  onDuplicate: (id: string) => void;
}

export default function FloorItem({ item, isSelected, isReadonly, selectOnly, colorOverride, isPulsing, staticOpacity, onSelect, onUpdate, onDuplicate }: Props) {
  // Keep latest prop values accessible inside stable PanResponder closures
  const itemRef = useRef(item);
  itemRef.current = item;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const dragStart = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ w: 0, h: 0 });
  const lastTapRef = useRef(0);

  const [isRenaming, setIsRenaming] = useState(false);
  const [draftLabel, setDraftLabel] = useState('');
  const [draftCapacity, setDraftCapacity] = useState('');

  const openRename = () => {
    setDraftLabel(itemRef.current.label as string);
    setDraftCapacity(itemRef.current.capacity !== undefined ? String(itemRef.current.capacity) : '');
    setIsRenaming(true);
  };

  const confirmRename = () => {
    const trimmed = draftLabel.trim();
    const capacityNum = parseInt(draftCapacity, 10);
    onUpdateRef.current(itemRef.current.id, {
      label: trimmed,
      ...(itemRef.current.capacity !== undefined && { capacity: isNaN(capacityNum) ? itemRef.current.capacity : capacityNum }),
    });
    setIsRenaming(false);
  };

  // Drag: moves the item across the canvas
  const dragResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          openRename();
        }
        lastTapRef.current = now;
        dragStart.current = { x: itemRef.current.x, y: itemRef.current.y };
        onSelectRef.current(itemRef.current.id);
      },
      onPanResponderMove: (_, gs) => {
        onUpdateRef.current(itemRef.current.id, {
          x: Math.max(0, dragStart.current.x + gs.dx),
          y: Math.max(0, dragStart.current.y + gs.dy),
        });
      },
    })
  ).current;

  // Resize: bottom-right handle, captured before parent drag responder
  const resizeResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        resizeStart.current = {
          w: itemRef.current.width,
          h: itemRef.current.height,
        };
      },
      onPanResponderMove: (_, gs) => {
        const cur = itemRef.current;
        const isCircle = cur.type === 'table_circle' || cur.type === 'stage_circle';
        const newW = Math.max(MIN_SIZE, resizeStart.current.w + gs.dx);
        const newH = Math.max(MIN_SIZE, resizeStart.current.h + gs.dy);
        onUpdateRef.current(cur.id, isCircle
          ? { width: newW, height: newW }           // keep circles square
          : { width: newW, height: newH }
        );
      },
    })
  ).current;

  const isCircle = item.type === 'table_circle' || item.type === 'stage_circle';
  const { fill, border, labelColor } = TYPE_STYLES[item.type];
  const activeLabelColor = colorOverride ? '#1a1a1a' : labelColor;

  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (isPulsing) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.35, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      Animated.timing(pulseAnim, { toValue: staticOpacity ?? 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [isPulsing, staticOpacity]);

  return (
    <Animated.View
      {...(!isReadonly && !selectOnly ? dragResponder.panHandlers : {})}
      style={[
        styles.item,
        {
          left: item.x,
          top: item.y,
          width: item.width,
          height: item.height,
          borderRadius: isCircle ? item.width / 2 : 8,
          backgroundColor: colorOverride ?? fill,
          borderColor: isSelected ? themeConfig.accent.primary : border,
          borderWidth: isSelected ? 2 : 1.5,
          zIndex: isSelected ? 10 : 1,
          opacity: pulseAnim,
        },
      ]}
    >
      {/* Tap-to-select overlay used in selectOnly mode */}
      {selectOnly && (
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={() => onSelect(item.id)}
        />
      )}

      <Text style={[styles.label, { color: activeLabelColor }]} numberOfLines={1}>
        {item.label}
      </Text>
      {item.capacity !== undefined && (
        <Text style={[styles.capacity, { color: activeLabelColor }]}>
          ({item.capacity})
        </Text>
      )}

      {!isReadonly && !selectOnly && isSelected && (
        <>
          <TouchableOpacity
            style={styles.duplicateHandle}
            onPress={() => onDuplicate(item.id)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            activeOpacity={0.7}
          >
            <Text style={styles.duplicateIcon}>⧉</Text>
          </TouchableOpacity>
          <View {...resizeResponder.panHandlers} style={styles.resizeHandle} />
        </>
      )}

      <Modal transparent animationType="fade" visible={isRenaming} onRequestClose={() => setIsRenaming(false)}>
        <View style={styles.renameOverlay}>
          <View style={styles.renameBox}>
            <Text style={styles.renameTitle}>Rename</Text>
            <TextInput
              style={styles.renameInput}
              value={draftLabel}
              onChangeText={setDraftLabel}
              autoFocus
              selectTextOnFocus
              returnKeyType="next"
              placeholder="Label"
              placeholderTextColor="rgba(255,255,255,0.3)"
            />
            {itemRef.current.capacity !== undefined && (
              <TextInput
                style={styles.renameInput}
                value={draftCapacity}
                onChangeText={setDraftCapacity}
                keyboardType="number-pad"
                returnKeyType="done"
                onSubmitEditing={confirmRename}
                placeholder="Capacity"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
            )}
            <View style={styles.renameActions}>
              <TouchableOpacity style={styles.renameCancelBtn} onPress={() => setIsRenaming(false)} activeOpacity={0.8}>
                <Text style={styles.renameCancelLabel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.renameConfirmBtn} onPress={confirmRename} activeOpacity={0.8}>
                <Text style={styles.renameConfirmLabel}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  item: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  capacity: {
    fontSize: 9,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.8,
  },
  resizeHandle: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: 3,
    backgroundColor: themeConfig.accent.primary,
  },
  duplicateHandle: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: 3,
    backgroundColor: themeConfig.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  duplicateIcon: {
    fontSize: 9,
    color: themeConfig.accent.primary,
    lineHeight: 12,
  },
  renameOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  renameBox: {
    width: '100%',
    backgroundColor: themeConfig.background.secondary,
    borderRadius: 14,
    padding: 20,
  },
  renameTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: themeConfig.text.primary,
    marginBottom: 12,
  },
  renameInput: {
    backgroundColor: themeConfig.background.primary,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: themeConfig.border.subtle,
    color: themeConfig.text.primary,
    fontSize: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  renameActions: {
    flexDirection: 'row',
    gap: 10,
  },
  renameCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: themeConfig.background.primary,
    alignItems: 'center',
  },
  renameCancelLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: themeConfig.text.muted,
  },
  renameConfirmBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: themeConfig.accent.primary,
    alignItems: 'center',
  },
  renameConfirmLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: themeConfig.text.inverse,
  },
});
