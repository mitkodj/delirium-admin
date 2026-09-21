import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import themeConfig from "../../themes/themeConfig";

type Props = {
  disabled: boolean;
  accentColor: string;
  onPress: () => void;
};

export default function LocationSelector({ disabled, accentColor, onPress }: Props) {
  return (
    <TouchableOpacity style={[styles.container, {
      backgroundColor: accentColor
    }]} disabled={disabled} onPress={onPress}>
      <Text style={styles.text}>
        {"Select location"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: themeConfig.accent.primary
  },
  text: {
    fontSize: 16,
    fontWeight: 600,
    color: themeConfig.text.inverse
  },
});