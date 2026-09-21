import { StyleSheet } from 'react-native';
import themeConfig from '../../themes/themeConfig';

const styles = StyleSheet.create({

    actionsRow: {
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 16,
        marginTop: 16,
    },

    squareButton: {
        flex: 1,
        aspectRatio: 1,
        borderRadius: 12,
        borderWidth: 2,
        backgroundColor: themeConfig.background.primary,
        justifyContent: 'center',
        alignItems: 'center',
        height: 120
    },

    squareImage: {
        width: '100%',
        height: '100%',
        borderRadius: 10,
    },

    dateButton: {
        borderWidth: 2,
        borderColor: '#555',
        backgroundColor: 'transparent',
    },

    dateDay: {
        color: '#fff',
        fontSize: 30,
        fontWeight: '700',
    },

    dateMonth: {
        color: '#aaa',
        fontSize: 22,
        marginTop: -2,
    },

    locationContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },

    addressText: {
        marginTop: 4,
        color: '#ccc',
        fontSize: 11,
        lineHeight: 14,
        textAlign: 'center',
    },
});

export default styles;
