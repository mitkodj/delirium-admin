import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native"
import themeConfig from "../../themes/themeConfig";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSidebar } from "../../providers/SidebarContext";

const AdminHeader = ({ title }: { title: string }) => {
    const insets = useSafeAreaInsets();
    const { sidebarOpen, toggleSidebar } = useSidebar();
    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {!sidebarOpen &&
                <View style={[styles.sidePanel, { borderBottomRightRadius: 12 }]}>
                    <TouchableOpacity style={styles.iconWrapper} onPress={toggleSidebar}>
                        <Ionicons name="chevron-forward" size={22} color={themeConfig.text.muted} />
                    </TouchableOpacity>
                </View>
            }
            <Text style={styles.title}>
                {title}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: themeConfig.background.primary,
        paddingRight: 60
    },
    sidePanel: {
        width: 60,
        backgroundColor: themeConfig.background.secondary,
        alignItems: 'center',
        borderTopRightRadius: 12
    },
    iconWrapper: {
        paddingHorizontal: 14,
        marginVertical: 8,
        borderRadius: 12,
    },
    title: {
        flex: 1,
        fontSize: 18,
        fontWeight: '700',
        color: themeConfig.accent.primary,
        textAlign: 'center',
    },
});

export default AdminHeader;
