import React, { useEffect, useState } from 'react';
import {
    Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FloorCanvas from './floorMap/FloorCanvas';
import themeConfig from '../../themes/themeConfig';
import { useClubData } from '../../providers/ClubDataContext';
import { TabletModalWrapper } from '../../helpers/useTabletModalStyle';

const CANVAS_W = 900;
const CANVAS_H = 600;

const TABLE_TYPES = new Set(['table_circle', 'table_vip_rect']);

type SelectedTable = { id: string; label: string };

type Props = {
    visible: boolean;
    initialSelectedIds?: string[];
    clientsCount?: number;
    currentStatusColor?: string;
    tableColorOverrides?: Record<string, string>;
    onClose: () => void;
    onChoose: (tables: SelectedTable[]) => void;
};

export default function TableSelectorModal({
    visible,
    initialSelectedIds,
    clientsCount,
    currentStatusColor,
    tableColorOverrides,
    onClose,
    onChoose,
}: Props) {
    const clubId = (globalThis as any).myClubs?.[0]?.id;
    const { floors, layoutLoading, loadLayout } = useClubData();

    const [activeFloorId, setActiveFloorId] = useState<string>();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [containerW, setContainerW] = useState(0);
    const [containerH, setContainerH] = useState(0);

    const activeFloor = floors.find(f => f.id === activeFloorId) ?? floors[0];
    const canvasW = activeFloor?.width ?? CANVAS_W;
    const canvasH = activeFloor?.height ?? CANVAS_H;
    const scale = containerW > 0 && containerH > 0
        ? Math.min(containerW / canvasW, containerH / canvasH)
        : 1;

    const allObjects = floors.flatMap(f => f.objects);

    useEffect(() => {
        if (visible && clubId) loadLayout(clubId);
    }, [visible]);

    useEffect(() => {
        if (floors.length > 0 && !activeFloorId) setActiveFloorId(floors[0].id);
    }, [floors]);

    // Seed local selection from parent whenever the modal opens
    useEffect(() => {
        if (visible) setSelectedIds(new Set(initialSelectedIds ?? []));
    }, [visible]);

    const mergedColorOverrides: Record<string, string> = {
        ...(tableColorOverrides ?? {}),
        ...Object.fromEntries(
            [...selectedIds].map(id => [id, currentStatusColor ?? themeConfig.accent.primary])
        ),
    };

    const handleSelect = (id: string) => {
        const obj = allObjects.find(o => o.id === id);
        if (!obj || !TABLE_TYPES.has(obj.type)) return;
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) { next.delete(id); } else { next.add(id); }
            return next;
        });
    };

    const handleDone = () => {
        const tables: SelectedTable[] = [...selectedIds].map(id => {
            const obj = allObjects.find(o => o.id === id);
            return { id, label: obj?.label ?? id };
        });
        onChoose(tables);
        onClose();
    };

    const peopleLabel = clientsCount !== undefined && !isNaN(clientsCount)
        ? ` (${clientsCount} ${clientsCount === 1 ? 'person' : 'people'})`
        : '';

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
            <TabletModalWrapper style={styles.container}>

                <View style={styles.header}>
                    <Text style={styles.title}>Select Tables{peopleLabel}</Text>
                    <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close" size={24} color={themeConfig.text.muted} />
                    </TouchableOpacity>
                </View>

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
                                transform: [{ scale }],
                            }}>
                                <FloorCanvas
                                    objects={activeFloor.objects}
                                    selectedId={null}
                                    width={canvasW}
                                    height={canvasH}
                                    isReadonly
                                    selectOnly
                                    tableColorOverrides={mergedColorOverrides}
                                    pulsingTableIds={selectedIds.size > 0 ? [...selectedIds] : undefined}
                                    onDeselect={() => {}}
                                    onSelect={handleSelect}
                                    onUpdate={() => {}}
                                    // onDuplicate={() => {}}
                                />
                            </View>
                        </View>
                    )}
                </View>

                <View style={styles.bottom}>
                    <Text style={styles.hint}>
                        {selectedIds.size === 0
                            ? 'Tap a table to select it'
                            : `${selectedIds.size} table${selectedIds.size > 1 ? 's' : ''} selected — tap again to deselect`}
                    </Text>
                    <TouchableOpacity style={styles.chooseBtn} onPress={handleDone} activeOpacity={0.8}>
                        <Text style={styles.chooseBtnText}>
                            {selectedIds.size === 0 ? 'Done' : `Confirm ${selectedIds.size} table${selectedIds.size > 1 ? 's' : ''}`}
                        </Text>
                    </TouchableOpacity>
                </View>

            </TabletModalWrapper>
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
    chooseBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: themeConfig.text.inverse,
    },
});
