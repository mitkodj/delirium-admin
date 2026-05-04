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

type Props = {
    visible: boolean;
    tableColorOverrides?: Record<string, string>;
    onClose: () => void;
};

export default function SchemaViewerModal({ visible, tableColorOverrides, onClose }: Props) {
    const clubId = (globalThis as any).myClubs?.[0]?.id;
    const { floors, layoutLoading, loadLayout } = useClubData();

    const [activeFloorId, setActiveFloorId] = useState<string>();
    const [containerW, setContainerW] = useState(0);
    const [containerH, setContainerH] = useState(0);

    useEffect(() => {
        if (!visible || !clubId) return;
        loadLayout(clubId);
    }, [visible]);

    useEffect(() => {
        if (floors.length > 0 && !activeFloorId) setActiveFloorId(floors[0].id);
    }, [floors]);

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

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={styles.container}>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Floor Plan</Text>
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
                        <ActivityIndicator size="large" color={themeConfig.accent.primary} />
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
                                    selectedId={null}
                                    width={canvasW}
                                    height={canvasH}
                                    isReadonly={true}
                                    counterRotateLabels={shouldRotate}
                                    tableColorOverrides={tableColorOverrides}
                                    onDeselect={() => {}}
                                    onSelect={() => {}}
                                    onUpdate={() => {}}
                                    onDuplicate={() => {}}
                                />
                            </View>
                        </View>
                    )}
                    {!layoutLoading && !activeFloor && (
                        <View style={styles.empty}>
                            <Ionicons name="map-outline" size={48} color={themeConfig.text.muted} />
                            <Text style={styles.emptyText}>No floor plan available</Text>
                        </View>
                    )}
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    empty: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    emptyText: {
        fontSize: 15,
        color: themeConfig.text.muted,
    },
});
