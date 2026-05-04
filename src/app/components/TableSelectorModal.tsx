import React, { useEffect, useState } from 'react';
import {
    Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FloorCanvas from './floorMap/FloorCanvas';
import themeConfig from '../../themes/themeConfig';
import { useClubData } from '../../providers/ClubDataContext';

const CANVAS_W = 900;
const CANVAS_H = 600;

const TABLE_TYPES = new Set(['table_circle', 'table_vip_rect']);

type SelectedTable = { id: string; label: string };

type Props = {
    visible: boolean;
    suggestedTableId?: string | null;
    currentStatusColor?: string;
    tableColorOverrides?: Record<string, string>;
    onClose: () => void;
    onChoose: (table: SelectedTable) => void;
};

export default function TableSelectorModal({ visible, suggestedTableId, currentStatusColor, tableColorOverrides, onClose, onChoose }: Props) {
    const clubId = (globalThis as any).myClubs?.[0]?.id;
    const { floors, layoutLoading, loadLayout } = useClubData();

    const [activeFloorId, setActiveFloorId] = useState<string>();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [containerW, setContainerW] = useState(0);
    const [containerH, setContainerH] = useState(0);

    const activeFloor = floors.find(f => f.id === activeFloorId) ?? floors[0];
    const canvasW = Math.max(activeFloor?.width ?? CANVAS_W, CANVAS_W);
    const canvasH = Math.max(activeFloor?.height ?? CANVAS_H, CANVAS_H);

    const screenIsPortrait = containerH > containerW;
    const shouldRotate = canvasW > canvasH && screenIsPortrait;
    const displayW = shouldRotate ? canvasH : canvasW;
    const displayH = shouldRotate ? canvasW : canvasH;
    const scale = containerW > 0 && containerH > 0
        ? Math.min(containerW / displayW, containerH / displayH)
        : 1;

    useEffect(() => {
        if (visible && clubId) loadLayout(clubId);
    }, [visible]);

    useEffect(() => {
        if (floors.length > 0 && !activeFloorId) setActiveFloorId(floors[0].id);
    }, [floors]);

    // Pre-select suggested table when floors load or suggestion changes
    useEffect(() => {
        if (suggestedTableId) setSelectedId(suggestedTableId);
    }, [suggestedTableId, floors]);

    // Merge all reserved-table colours with the currently selected table's colour
    const mergedColorOverrides: Record<string, string> = {
        ...(tableColorOverrides ?? {}),
        ...(selectedId && currentStatusColor ? { [selectedId]: currentStatusColor } : {}),
    };

    const handleSelect = (id: string) => {
        const obj = floors.flatMap(f => f.objects).find(o => o.id === id);
        if (obj && TABLE_TYPES.has(obj.type)) setSelectedId(id);
    };

    const handleChoose = () => {
        const obj = floors.flatMap(f => f.objects).find(o => o.id === selectedId);
        if (!obj) return;
        onChoose({ id: obj.id, label: obj.label ?? obj.id });
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={styles.container}>

                <View style={styles.header}>
                    <Text style={styles.title}>Select Table</Text>
                    <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close" size={24} color={themeConfig.text.muted} />
                    </TouchableOpacity>
                </View>

                {/* Floor tabs — hidden when only one floor */}
                {floors.length > 1 && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.tabsScroll}
                        contentContainerStyle={styles.tabsContent}
                    >
                        {floors.map(floor => (
                            <TouchableOpacity
                                key={floor.id}
                                style={[styles.tab, floor.id === activeFloorId && styles.tabActive]}
                                onPress={() => setActiveFloorId(floor.id)}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.tabLabel, floor.id === activeFloorId && styles.tabLabelActive]}>
                                    {floor.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                {/* Canvas */}
                <View
                    style={styles.canvasWrapper}
                    onLayout={e => {
                        setContainerW(e.nativeEvent.layout.width);
                        setContainerH(e.nativeEvent.layout.height);
                    }}
                >
                    {layoutLoading && (
                        <View style={styles.loader}>
                            <ActivityIndicator size="large" color={themeConfig.accent.primary} />
                        </View>
                    )}
                    {!layoutLoading && containerW > 0 && containerH > 0 && activeFloor && (
                        <View style={{ width: containerW, height: containerH, overflow: 'hidden', backgroundColor: '#14122a', borderRadius: 12 }}>
                            <View style={{
                                position: 'absolute',
                                width: canvasW,
                                height: canvasH,
                                left: (containerW - canvasW) / 2,
                                top: (containerH - canvasH) / 2,
                                transform: shouldRotate
                                    ? [{ rotate: '90deg' }, { scale }]
                                    : [{ scale }],
                            }}>
                                <FloorCanvas
                                    objects={activeFloor.objects}
                                    selectedId={selectedId}
                                    width={canvasW}
                                    height={canvasH}
                                    isReadonly={true}
                                    selectOnly
                                    counterRotateLabels={shouldRotate}
                                    tableColorOverrides={mergedColorOverrides}
                                    pulsingTableId={selectedId ?? undefined}
                                    dimmedTableId={selectedId !== suggestedTableId ? suggestedTableId ?? undefined : undefined}
                                    onDeselect={() => {}}
                                    onSelect={handleSelect}
                                    onUpdate={() => {}}
                                    onDuplicate={() => {}}
                                />
                            </View>
                        </View>
                    )}
                </View>

                {/* Bottom: hint + Choose button */}
                <View style={styles.bottom}>
                    <Text style={styles.hint}>
                        {selectedId
                            ? `Selected: ${floors.flatMap(f => f.objects).find(o => o.id === selectedId)?.label ?? selectedId}`
                            : 'Tap a table to select it'}
                    </Text>
                    <TouchableOpacity
                        style={[styles.chooseBtn, !selectedId && styles.chooseBtnDisabled]}
                        onPress={handleChoose}
                        disabled={!selectedId}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.chooseBtnText}>Choose</Text>
                    </TouchableOpacity>
                </View>

            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 55,
        backgroundColor: themeConfig.background.primary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: themeConfig.text.primary,
    },
    tabsScroll: {
        flexGrow: 0,
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    tabsContent: {
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
    },
    tab: {
        paddingVertical: 7,
        paddingHorizontal: 14,
        borderRadius: 8,
        backgroundColor: themeConfig.background.secondary,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    tabActive: {
        borderColor: themeConfig.accent.primary,
    },
    tabLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: themeConfig.text.muted,
    },
    tabLabelActive: {
        color: themeConfig.accent.primary,
    },
    canvasWrapper: {
        flex: 1,
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bottom: {
        padding: 20,
        gap: 12,
    },
    hint: {
        fontSize: 13,
        color: themeConfig.text.muted,
        textAlign: 'center',
    },
    chooseBtn: {
        paddingVertical: 14,
        borderRadius: 10,
        backgroundColor: themeConfig.accent.primary,
        alignItems: 'center',
    },
    chooseBtnDisabled: {
        opacity: 0.4,
    },
    chooseBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: themeConfig.text.inverse,
    },
});
