import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, Platform, StyleSheet, ActivityIndicator, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Floor, FloorObject, FloorObjectType } from '../../types/FloorMap';
import FloorCanvas from '../components/floorMap/FloorCanvas';
import Toolbar from '../components/floorMap/Toolbar';
import { postLayout } from '../../utils/service';
import { useClubData } from '../../providers/ClubDataContext';
import themeConfig from '../../themes/themeConfig';
import adminStyles from './styles/adminStyles';

type Mode = 'preview' | 'edit';

const MIN_CANVAS_WIDTH  = 200;
const MIN_CANVAS_HEIGHT = 300;

const DEFAULT_SIZES: Record<FloorObjectType, { w: number; h: number }> = {
  table_circle:   { w: 64,  h: 64  },
  table_vip_rect: { w: 90,  h: 60  },
  stage_circle:   { w: 100, h: 100 },
  stage_rect:     { w: 140, h: 80  },
};

const DEFAULT_CAPACITY: Partial<Record<FloorObjectType, number>> = {
  table_circle:   3,
  table_vip_rect: 6,
};

export default function HostPanel() {
  const { floors, setFloors, layoutLoading: loading, loadLayout } = useClubData();
  const [mode, setMode] = useState<Mode>('preview');
  const [activeFloorId, setActiveFloorId] = useState<string>();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const [canvasWrapperWidth, setCanvasWrapperWidth] = useState(0);
  const [editDate, setEditDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [renamingFloorId, setRenamingFloorId] = useState<string | null>(null);
  const [floorDraftName, setFloorDraftName] = useState('');
  const [floorsSnapshot, setFloorsSnapshot] = useState<Floor[]>([]);
  const nextIdRef = useRef(1);
  const nextIdInitialized = useRef(false);

  // ── Edit-mode freehand pan ────────────────────────────────────────
  const [editPan, setEditPan] = useState({ tx: 0, ty: 0 });
  const editPanLive = useRef({ tx: 0, ty: 0 });
  const editPanBase = useRef({ tx: 0, ty: 0 });
  const selectedIdForPan = useRef<string | null>(null);
  selectedIdForPan.current = selectedId;
  const panMeta = useRef({ containerW: 0, containerH: 0, canvasW: 0, canvasH: 0 });

  const editPanResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) =>
      selectedIdForPan.current === null && (Math.abs(gs.dx) > 4 || Math.abs(gs.dy) > 4),
    onPanResponderGrant: () => {
      editPanBase.current = { ...editPanLive.current };
    },
    onPanResponderMove: (_, gs) => {
      const { containerW, containerH, canvasW, canvasH } = panMeta.current;
      const tx = Math.min(0, Math.max(Math.min(0, containerW - canvasW), editPanBase.current.tx + gs.dx));
      const ty = Math.min(0, Math.max(Math.min(0, containerH - canvasH), editPanBase.current.ty + gs.dy));
      editPanLive.current = { tx, ty };
      setEditPan({ tx, ty });
    },
  })).current;

  const clubId = (globalThis as any).myClubs?.[0]?.id;

  const activeFloor = floors.find(f => f.id === activeFloorId) ?? floors[0];
  const activeObjects = activeFloor?.objects ?? [];
  const activeCanvasW = Math.max(activeFloor?.width  ?? MIN_CANVAS_WIDTH,  MIN_CANVAS_WIDTH);
  const activeCanvasH = Math.max(activeFloor?.height ?? MIN_CANVAS_HEIGHT, MIN_CANVAS_HEIGHT);

  // ── Load layout on mount ──────────────────────────────────────────

  useEffect(() => { loadLayout(clubId); }, [clubId]);

  // Set initial active floor once floors are populated
  useEffect(() => {
    if (floors.length > 0 && !activeFloorId) setActiveFloorId(floors[0].id);
  }, [floors]);

  // Seed nextIdRef from BE data so new object IDs never collide with existing ones
  useEffect(() => {
    if (nextIdInitialized.current || floors.length === 0) return;
    nextIdInitialized.current = true;
    const max = floors.flatMap(f => f.objects).reduce((m, o) => {
      const n = parseInt(o.id.replace(/\D/g, ''), 10);
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);
    nextIdRef.current = max + 1;
  }, [floors]);

  // ── Mode transitions ──────────────────────────────────────────────

  const resetEditPan = () => { setEditPan({ tx: 0, ty: 0 }); editPanLive.current = { tx: 0, ty: 0 }; };
  const enterEdit = () => { setFloorsSnapshot(floors); setEditDate(null); setMode('edit'); resetEditPan(); };
  const enterEditForDate = () => { setFloorsSnapshot(floors); setEditDate(new Date()); setMode('edit'); resetEditPan(); };
  const exitEdit = () => { setSelectedId(null); setEditDate(null); setMode('preview'); };
  const cancelEdit = () => { setFloors(floorsSnapshot); exitEdit(); };

  // ── Object operations ─────────────────────────────────────────────

  const growFloor = (f: Floor, rightEdge: number, bottomEdge: number): Floor => {
    const curW = Math.max(f.width  ?? MIN_CANVAS_WIDTH,  MIN_CANVAS_WIDTH);
    const curH = Math.max(f.height ?? MIN_CANVAS_HEIGHT, MIN_CANVAS_HEIGHT);
    const newW = rightEdge  > curW ? rightEdge  + 50 : curW;
    const newH = bottomEdge > curH ? bottomEdge + 50 : curH;
    return (newW !== curW || newH !== curH) ? { ...f, width: newW, height: newH } : f;
  };

  const fitFloor = (f: Floor): Floor => {
    if (f.objects.length === 0) return f;
    const maxRight  = Math.max(...f.objects.map(o => o.x + o.width));
    const maxBottom = Math.max(...f.objects.map(o => o.y + o.height));
    const newW = Math.max(MIN_CANVAS_WIDTH,  maxRight  + 30);
    const newH = Math.max(MIN_CANVAS_HEIGHT, maxBottom + 30);
    return { ...f, width: newW, height: newH };
  };

  const addObject = (type: FloorObjectType) => {
    const { w, h } = DEFAULT_SIZES[type];
    const id = nextIdRef.current++;
    const offset = (id % 8) * 16;
    const newObj: FloorObject = {
      id: `obj-${id}`,
      type,
      x: 20 + offset,
      y: 20 + offset,
      width: w,
      height: h,
      ...(DEFAULT_CAPACITY[type] !== undefined && { capacity: DEFAULT_CAPACITY[type] }),
    };
    setFloors(prev => prev.map(f => {
      if (f.id !== activeFloorId) return f;
      const withObj = { ...f, objects: [...f.objects, newObj] };
      return growFloor(withObj, newObj.x + newObj.width, newObj.y + newObj.height);
    }));
    setSelectedId(newObj.id);
  };

  const updateObject = (
    id: string,
    patch: Partial<Pick<FloorObject, 'x' | 'y' | 'width' | 'height' | 'label' | 'capacity'>>
  ) => {
    setFloors(prev => prev.map(f => {
      if (f.id !== activeFloorId) return f;
      const updatedObjects = f.objects.map(o => o.id === id ? { ...o, ...patch } : o);
      return fitFloor({ ...f, objects: updatedObjects });
    }));
  };

  const duplicateObject = (id: string) => {
    let copyId: string | null = null;
    setFloors(prev => prev.map(f => {
      if (f.id !== activeFloorId) return f;
      const src = f.objects.find(o => o.id === id);
      if (!src) return f;
      copyId = `obj-${nextIdRef.current++}`;
      const copy: FloorObject = { ...src, id: copyId, x: src.x + 10, y: src.y + 10 };
      const withCopy = { ...f, objects: [...f.objects, copy] };
      return growFloor(withCopy, copy.x + copy.width, copy.y + copy.height);
    }));
    if (copyId) setSelectedId(copyId);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setFloors(prev => prev.map(f =>
      f.id !== activeFloorId ? f : {
        ...f,
        objects: f.objects.filter(o => o.id !== selectedId),
      }
    ));
    setSelectedId(null);
  };

  // ── Floor operations ──────────────────────────────────────────────

  const addFloor = () => {
    const newFloor: Floor = {
      id: `floor-${Date.now()}`,
      name: `Floor ${floors.length + 1}`,
      objects: [],
    };
    setFloors(prev => [...prev, newFloor]);
    setActiveFloorId(newFloor.id);
  };

  const openFloorRename = (floorId: string) => {
    setFloorDraftName(floors.find(f => f.id === floorId)?.name ?? '');
    setRenamingFloorId(floorId);
  };

  const confirmFloorRename = () => {
    const trimmed = floorDraftName.trim();
    if (trimmed && renamingFloorId) {
      setFloors(prev => prev.map(f =>
        f.id === renamingFloorId ? { ...f, name: trimmed } : f
      ));
    }
    setRenamingFloorId(null);
  };

  const deleteFloor = (floorId: string) => {
    if (floors.length <= 1) return;
    const remaining = floors.filter(f => f.id !== floorId);
    setFloors(remaining);
    if (activeFloorId === floorId) setActiveFloorId(remaining[0].id);
    setRenamingFloorId(null);
  };

  // ── Save ──────────────────────────────────────────────────────────

  const saveLayout = async () => {
    if (clubId) {
      try {
        await postLayout(clubId, floors);
      } catch (e) {
        console.error('Failed to save layout', e);
      }
    }
    exitEdit();
  };

  const isEdit = mode === 'edit';

  panMeta.current = { containerW: canvasWrapperWidth, containerH: canvasHeight, canvasW: activeCanvasW, canvasH: activeCanvasH };

  // Preview scale
  const previewScale =
    canvasWrapperWidth > 0 && canvasHeight > 0
      ? Math.min(canvasWrapperWidth / activeCanvasW, canvasHeight / activeCanvasH)
      : 1;

  return (
    <View style={ [adminStyles.adminPage, styles.container]}>

      {/* ── Preview: edit buttons ─────────────────────────────────── */}
      <View style={styles.previewActions}>
        <TouchableOpacity style={styles.primaryButton} onPress={enterEdit} activeOpacity={0.8}>
          <Ionicons name="create-outline" size={16} color={themeConfig.text.inverse} />
          <Text style={styles.primaryButtonLabel}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.outlineButton} onPress={enterEditForDate} activeOpacity={0.8}>
          <Ionicons name="calendar-outline" size={16} color={themeConfig.accent.primary} />
          <Text style={styles.outlineButtonLabel}>Edit for Date</Text>
        </TouchableOpacity>
      </View>

      {/* ── Preview: floor tabs (read-only) ───────────────────────── */}
      {(!isEdit && floors.length > 1) && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.floorTabsScroll}
          contentContainerStyle={styles.floorTabsContent}
        >
          {floors.map(floor => (
            <TouchableOpacity
              key={floor.id}
              style={[styles.floorTab, floor.id === activeFloorId && styles.floorTabActive]}
              onPress={() => setActiveFloorId(floor.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.floorTabLabel, floor.id === activeFloorId && styles.floorTabLabelActive]}>
                {floor.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── Preview: canvas ───────────────────────────────────────── */}
      <View
        style={styles.canvasWrapper}
        onLayout={e => {
          setCanvasHeight(e.nativeEvent.layout.height);
          setCanvasWrapperWidth(e.nativeEvent.layout.width);
        }}
      >
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={themeConfig.accent.primary} />
          </View>
        )}
        {canvasHeight > 0 && canvasWrapperWidth > 0 && (
          <View style={{ width: canvasWrapperWidth, height: canvasHeight, overflow: 'hidden', backgroundColor: '#14122a', borderRadius: 12 }}>
            <View
              style={{
                position: 'absolute',
                width: activeCanvasW,
                height: activeCanvasH,
                left: (canvasWrapperWidth - activeCanvasW) / 2,
                top:  (canvasHeight - activeCanvasH) / 2,
                transform: [{ scale: previewScale }],
              }}
            >
              <FloorCanvas
                objects={activeObjects}
                selectedId={null}
                width={activeCanvasW}
                height={activeCanvasH}
                isReadonly={true}

                onDeselect={() => {}}
                onSelect={() => {}}
                onUpdate={() => {}}
                onDuplicate={() => {}}
              />
            </View>
          </View>
        )}
      </View>

      {/* ══════════════════════════════════════════════════════════════
          Edit full-screen modal
      ══════════════════════════════════════════════════════════════ */}
      <Modal visible={isEdit} animationType="slide" onRequestClose={cancelEdit}>
        <View style={styles.editModal}>

          {/* Title row with optional date pill */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>Floor Map</Text>
            {editDate != null && (
              <TouchableOpacity style={styles.datePill} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
                <Ionicons name="calendar-outline" size={13} color={themeConfig.accent.primary} />
                <Text style={styles.datePillLabel}>
                  {editDate.getDate()} {editDate.toLocaleDateString('en-US', { month: 'short' })}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Toolbar */}
          <Toolbar onAdd={addObject} />

          {/* Floor tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.floorTabsScroll}
            contentContainerStyle={styles.floorTabsContent}
          >
            {floors.map((floor, index) => (
              <TouchableOpacity
                key={floor.id}
                style={[styles.floorTab, floor.id === activeFloorId && styles.floorTabActive]}
                onPress={() => setActiveFloorId(floor.id)}
                onLongPress={() => openFloorRename(floor.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.floorTabLabel, floor.id === activeFloorId && styles.floorTabLabelActive]}>
                  {floor.name}
                </Text>
                {floors.length > 1 && index !== 0 && (
                  <TouchableOpacity
                    style={styles.floorTabClose}
                    onPress={() => deleteFloor(floor.id)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={12} color={themeConfig.text.muted} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.addFloorBtn} onPress={addFloor} activeOpacity={0.7}>
              <Ionicons name="add" size={18} color={themeConfig.accent.primary} />
            </TouchableOpacity>
          </ScrollView>

          {/* Canvas */}
          <View style={styles.canvasWrapper} {...editPanResponder.panHandlers}>
            <View style={{ transform: [{ translateX: editPan.tx }, { translateY: editPan.ty }] }}>
              <FloorCanvas
                objects={activeObjects}
                selectedId={selectedId}
                width={activeCanvasW}
                height={activeCanvasH}
                isReadonly={false}
                onDeselect={() => setSelectedId(null)}
                onSelect={setSelectedId}
                onUpdate={updateObject}
                onDuplicate={duplicateObject}
              />
            </View>

            {selectedId !== null && (
              <TouchableOpacity style={styles.floatingDelete} onPress={deleteSelected} activeOpacity={0.8}>
                <Ionicons name="trash-outline" size={16} color="#ff6b6b" />
                <Text style={styles.floatingDeleteLabel}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Bottom actions */}
          <View style={styles.bottomActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={cancelEdit} activeOpacity={0.8}>
              <Text style={styles.cancelLabel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={saveLayout} activeOpacity={0.8}>
              <Text style={styles.saveLabel}>Save</Text>
            </TouchableOpacity>
          </View>

          {/* Date picker sub-modal */}
          <Modal transparent animationType="slide" visible={showDatePicker} onRequestClose={() => setShowDatePicker(false)}>
            <View style={styles.datePickerOverlay}>
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={editDate ?? new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(_: any, selected?: Date) => {
                    if (selected) setEditDate(selected);
                    if (Platform.OS === 'android') setShowDatePicker(false);
                  }}
                  themeVariant="dark"
                  style={styles.datePicker}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity style={styles.datePickerDone} onPress={() => setShowDatePicker(false)} activeOpacity={0.8}>
                    <Text style={styles.datePickerDoneLabel}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Modal>

          {/* Floor rename sub-modal */}
          <Modal transparent animationType="fade" visible={renamingFloorId !== null} onRequestClose={() => setRenamingFloorId(null)}>
            <View style={styles.renameOverlay}>
              <View style={styles.renameBox}>
                <Text style={styles.renameTitle}>Rename Floor</Text>
                <TextInput
                  style={styles.renameInput}
                  value={floorDraftName}
                  onChangeText={setFloorDraftName}
                  autoFocus
                  selectTextOnFocus
                  returnKeyType="done"
                  onSubmitEditing={confirmFloorRename}
                />
                <View style={styles.renameActions}>
                  {floors.length > 1 && (
                    <TouchableOpacity
                      style={styles.deleteFloorBtn}
                      onPress={() => renamingFloorId && deleteFloor(renamingFloorId)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="trash-outline" size={14} color="#ff6b6b" />
                      <Text style={styles.deleteFloorLabel}>Delete</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.renameCancelBtn} onPress={() => setRenamingFloorId(null)} activeOpacity={0.8}>
                    <Text style={styles.renameCancelLabel}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.renameConfirmBtn} onPress={confirmFloorRename} activeOpacity={0.8}>
                    <Text style={styles.renameConfirmLabel}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  editModal: {
    flex: 1,
    padding: 20,
    paddingTop: 55,
    backgroundColor: themeConfig.background.primary,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: themeConfig.text.primary,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: themeConfig.accent.primary,
    backgroundColor: themeConfig.background.secondary,
  },
  datePillLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: themeConfig.accent.primary,
  },
  previewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: themeConfig.background.secondary,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: themeConfig.accent.primary,
  },
  primaryButtonLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: themeConfig.text.inverse,
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: themeConfig.accent.primary,
    backgroundColor: 'transparent',
  },
  outlineButtonLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: themeConfig.accent.primary,
  },
  // Floor tabs
  floorTabsScroll: {
    flexGrow: 0,
    marginBottom: 10,
  },
  floorTabsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  floorTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: themeConfig.background.secondary,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  floorTabActive: {
    borderColor: themeConfig.accent.primary,
  },
  floorTabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: themeConfig.text.muted,
  },
  floorTabLabelActive: {
    color: themeConfig.accent.primary,
  },
  floorTabClose: {
    marginLeft: 5,
  },
  addFloorBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: themeConfig.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Canvas
  canvasWrapper: { flex: 1, overflow: 'hidden' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    zIndex: 10,
  },
  floatingDelete: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a1010',
    borderWidth: 1.5,
    borderColor: '#ff6b6b',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  floatingDeleteLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ff6b6b',
    marginLeft: 6,
  },
  // Bottom actions
  bottomActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: themeConfig.background.secondary,
    alignItems: 'center',
  },
  cancelLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: themeConfig.text.muted,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: themeConfig.background.secondary,
    borderWidth: 1.5,
    borderColor: themeConfig.accent.primary,
    alignItems: 'center',
  },
  saveLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: themeConfig.accent.primary,
    letterSpacing: 0.5,
  },
  // Date picker Modal
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    backgroundColor: '#111',
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    width: '100%',
  },
  datePicker: { width: '100%' },
  datePickerDone: {
    marginTop: 12,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 8,
    backgroundColor: themeConfig.background.secondary,
  },
  datePickerDoneLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: themeConfig.accent.primary,
  },
  // Floor rename Modal
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
    gap: 8,
  },
  deleteFloorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#ff6b6b',
    backgroundColor: '#2a1010',
  },
  deleteFloorLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ff6b6b',
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
