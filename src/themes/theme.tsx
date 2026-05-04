import { StyleSheet } from 'react-native';
import themeConfig from './themeConfig';

const PILL_RADIUS = 36;
const SHADOW_THICKNESS = 6;

const themeStyles = StyleSheet.create({
    container: {
      flex: 1,
      width: "100%",
      alignItems: 'center',
    },
     /* CENTER */
    centerContent: {
      flex: 1,
      justifyContent: 'center', // ✅ exact vertical center
      alignItems: 'center',
      gap: 8,
    },
    topContent: {
      alignItems: "center",
      width: "100%",
      marginTop: 50,
      flex: 1
    },
    noTopSpace: {
      marginTop: 0
    },
    text: {
      fontSize: 20,
    },

    lightContainer: {
      backgroundColor: themeConfig.background.secondary,
    },
    darkContainer: {
      backgroundColor: themeConfig.background.primary,
    },
    lightThemeText: {
      color: themeConfig.background.primary,
    },
    darkThemeText: {
      color: themeConfig.text.primary,
    },

    darkRedColor: {
      color: themeConfig.text.primary
    },

    darkButton: {
      backgroundColor: themeConfig.background.primary,
      color: themeConfig.text.primary,
      width: "100%",
      fontWeight: 600,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: "center",
      marginBottom: 24,
    },
    inputContainer: {
      width: 250,
      alignItems: "center",
    },
    /* TOP */
    searchBadge: {
        alignSelf: 'center',
        borderWidth: 2,
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        borderColor: '#fff',
    },
    searchText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8
    },
    nextButton: {
      marginBottom: 16,
      paddingVertical: 16,
      borderRadius: 12,
      backgroundColor: '#fff',
      alignItems: 'center',
      marginHorizontal: 16
    },

    overlayTop: {
      position: 'absolute',
      bottom: -32,
      zIndex: 10,
      left: 0,
      right: 0,
      alignItems: 'center',
    },

    squareImage: {
      width: 60,
      height: 60,
      borderRadius: 12,
      borderWidth: 1
    },

    shadowGradient: {
      padding: 8,          // thickness of the “shadow”
      borderRadius: 38,    // pill radius + padding
    },

    wrapper: {
      position: 'relative', // needed for absolute gradients
      alignSelf: 'flex-start', // shrink-wrap pill width
    },
    top: {
      position: 'absolute',
      top: -SHADOW_THICKNESS,
      left: -SHADOW_THICKNESS,
      right: -SHADOW_THICKNESS,
      height: SHADOW_THICKNESS,
      borderTopLeftRadius: PILL_RADIUS + SHADOW_THICKNESS,
      borderTopRightRadius: PILL_RADIUS + SHADOW_THICKNESS,
    },
    bottom: {
      position: 'absolute',
      bottom: -SHADOW_THICKNESS,
      left: -SHADOW_THICKNESS,
      right: -SHADOW_THICKNESS,
      height: SHADOW_THICKNESS,
      borderBottomLeftRadius: PILL_RADIUS + SHADOW_THICKNESS,
      borderBottomRightRadius: PILL_RADIUS + SHADOW_THICKNESS,
    },
    left: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: -SHADOW_THICKNESS,
      width: SHADOW_THICKNESS,
      borderTopLeftRadius: PILL_RADIUS + SHADOW_THICKNESS,
      borderBottomLeftRadius: PILL_RADIUS + SHADOW_THICKNESS,
    },
    right: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      right: -SHADOW_THICKNESS,
      width: SHADOW_THICKNESS,
      borderTopRightRadius: PILL_RADIUS + SHADOW_THICKNESS,
      borderBottomRightRadius: PILL_RADIUS + SHADOW_THICKNESS,
    },
  });

export default themeStyles;