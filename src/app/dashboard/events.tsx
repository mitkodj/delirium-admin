import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import EventsTable from "../components/EventsTable";
import EventFormModal from "../components/EventFormModal";
import AddButton from "../components/AddButton";
import { useSearchFilters } from "../../providers/SearchCriteriaContext";
import { useSidebar } from "../../providers/SidebarContext";
import { DEvent } from "../../types/Disco";
import { fetchEvents } from "../../utils/service";
import adminStyles from "./styles/adminStyles";
import themeConfig from "../../themes/themeConfig";

function EventsHeader({ onNew }: { onNew: () => void }) {
    const insets = useSafeAreaInsets();
    const { sidebarOpen, toggleSidebar } = useSidebar();
    return (
        <View style={[headerStyles.container, { paddingTop: insets.top }]}>
            {!sidebarOpen && (
                <View style={headerStyles.sidePanel}>
                    <TouchableOpacity style={headerStyles.sidePanelBtn} onPress={toggleSidebar}>
                        <Ionicons name="chevron-forward" size={22} color={themeConfig.text.muted} />
                    </TouchableOpacity>
                </View>
            )}
            {/* Title centered across the full header width, behind touch targets */}
            <View style={[StyleSheet.absoluteFillObject, { paddingTop: insets.top }]} pointerEvents="none">
                <View style={headerStyles.titleOverlay}>
                    <Text style={headerStyles.title}>Events</Text>
                </View>
            </View>
            {/* Right slot drives the container height and holds the add button */}
            <View style={headerStyles.rightSlot}>
                <AddButton onPress={onNew} />
            </View>
        </View>
    );
}

const headerStyles = StyleSheet.create({
    container: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: themeConfig.background.primary,
    },
    sidePanel: {
        width: 60,
        backgroundColor: themeConfig.background.secondary,
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
        alignItems: 'center',
        marginBlock: 12,
    },
    sidePanelBtn: {
        padding: 12,
        borderRadius: 12,
    },
    titleOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
        color: themeConfig.text.primary,
    },
    rightSlot: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingVertical: 10,
        paddingRight: 20,
    },
});

export default function Events({ perPage = 15 }: { perPage: number }) {
    const [page, setPage] = useState(0);
    const { events, setEvents } = useSearchFilters();

    const fetchEventsData = async (): Promise<DEvent[]> => {
        const clubData = await fetchEvents({} as any, 15, 0);
        return clubData?.data as any;
    };

    const handleRefresh = async (): Promise<void> => {
        return fetchEventsData().then((eventsData) => {
            setEvents(eventsData);
        });
    };

    useEffect(() => {
        if (events.length === 0) {
            fetchEventsData().then((eventsData) => {
                setEvents(eventsData);
            });
        }
    }, []);

    const paginatedEvents = events.slice(page * perPage, (page + 1) * perPage);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingEvent, setEditingEvent] = useState<DEvent | null>(null);

    const openEdit = (event: DEvent) => {
        setEditingEvent(event);
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
        setEditingEvent(null);
    };

    return (
        <View style={adminStyles.adminPage}>
            <Stack.Screen
                options={{
                    header: () => <EventsHeader onNew={() => setModalVisible(true)} />,
                }}
            />

            <EventsTable
                events={paginatedEvents}
                page={page}
                itemsPerPage={perPage}
                totalItems={events.length}
                onPageChange={setPage}
                handleRefresh={handleRefresh}
                onEdit={openEdit}
            />

            <EventFormModal
                visible={modalVisible}
                event={editingEvent ?? undefined}
                onClose={closeModal}
                onSave={(data) => {
                    handleRefresh();
                }}
            />
        </View>
    );
}
