import React, { useEffect, useState } from 'react';
import {
    Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FloorCanvas from './floorMap/FloorCanvas';
import themeConfig from '../../themes/themeConfig';
import { useClubData } from '../../providers/ClubDataContext';
import { Reservation } from '../../types/Disco';
import { ReservationRow } from './ReservationRow';
import { TabletModalWrapper } from '../../helpers/useTabletModalStyle';

const CANVAS_W = 900;
const CANVAS_H = 600;

const TABLE_TYPES = new Set(['table_circle', 'table_vip_rect']);

type ContentProps = {
    tableColorOverrides?: Record<string, string>;
    reservations?: Reservation[];
    onClose?: () => void;
    onPressReservation: (reservation: Reservation) => void;
    onAddReservation?: (tableId: string) => void;
    showCloseButton?: boolean;
    inModal?: boolean;
};

type Props = ContentProps & {
    visible: boolean;
    onClose: () => void;
};

export function SchemaViewerContent({
    tableColorOverrides,
    reservations,
    onClose,
    onPressReservation,
    onAddReservation,
    showCloseButton = true,
    inModal = false,
}: ContentProps) {
    const { floors, layoutLoading } = useClubData();

    const [activeFloorId, setActiveFloorId] = useState<string>();
    const [containerW, setContainerW] = useState(0);
    const [containerH, setContainerH] = useState(0);
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

    useEffect(() => {
        if (floors.length > 0 && !activeFloorId) setActiveFloorId(floors[0].id);
    }, [floors]);

    const allObjects = floors.flatMap(f => f.objects);
    const activeFloor = floors.find(f => f.id === activeFloorId) ?? floors[0];
    const canvasW = activeFloor?.width ?? CANVAS_W;
    const canvasH = activeFloor?.height ?? CANVAS_H;

    const scale = containerW > 0 && containerH > 0
        ? Math.min(containerW / canvasW, containerH / canvasH)
        : 1;

    const matched = selectedTableId
        ? reservations?.find(r => r.tables?.includes(selectedTableId))
        : undefined;

    return (
        <TabletModalWrapper style={[styles.container, inModal && styles.containerModal]}>

            {showCloseButton && (
                <View style={styles.header}>
                    <Text style={styles.title}>Floor Plan</Text>
                    <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close" size={24} color={themeConfig.text.muted} />
                    </TouchableOpacity>
                </View>
            )}

            {selectedTableId && (
                <View style={styles.reservationPreview}>
                    {matched ? (
                        <ReservationRow
                            item={matched}
                            onPress={() => { onClose?.(); onPressReservation(matched); }}
                            onEdit={() => { onClose?.(); onPressReservation(matched); }}
                        />
                    ) : (
                        <TouchableOpacity
                            style={styles.addRow}
                            onPress={() => { onClose?.(); onAddReservation?.(selectedTableId); }}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.addRowText}>Add reservation</Text>
                            <Ionicons name="add-circle-outline" size={20} color={themeConfig.accent.primary} />
                        </TouchableOpacity>
                    )}
                </View>
            )}

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
                            transform: [{ scale }],
                        }}>
                            <FloorCanvas
                                objects={activeFloor.objects}
                                selectedId={selectedTableId}
                                width={canvasW}
                                height={canvasH}
                                isReadonly={true}
                                selectOnly

                                tableColorOverrides={tableColorOverrides}
                                onDeselect={() => setSelectedTableId(null)}
                                onSelect={id => {
                                    const obj = allObjects.find(o => o.id === id);
                                    setSelectedTableId(obj && TABLE_TYPES.has(obj.type) ? id : null);
                                }}
                                onUpdate={() => {}}
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

        </TabletModalWrapper>
    );
}

export default function SchemaViewerModal({
    visible,
    tableColorOverrides,
    reservations,
    onClose,
    onPressReservation,
    onAddReservation,
}: Props) {
    const clubId = (globalThis as any).myClubs?.[0]?.id;
    const { loadLayout } = useClubData();

    useEffect(() => {
        if (!visible || !clubId) return;
        loadLayout(clubId);
    }, [visible]);

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
            <SchemaViewerContent
                tableColorOverrides={tableColorOverrides}
                reservations={reservations}
                onClose={onClose}
                onPressReservation={onPressReservation}
                onAddReservation={onAddReservation}
                showCloseButton={true}
                inModal={true}
            />
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: themeConfig.background.primary,
    },
    containerModal: {
        paddingTop: 55,
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
    reservationPreview: {
        paddingHorizontal: 12,
        paddingBottom: 8,
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
    addRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: themeConfig.border.subtle,
        backgroundColor: themeConfig.background.secondary,
    },
    addRowText: {
        fontSize: 14,
        fontWeight: '600',
        color: themeConfig.accent.primary,
    },
});
