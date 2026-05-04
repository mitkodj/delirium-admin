import React from 'react';

export type ThemeColors = {
  background: {
    primary: string;
    secondary?: string;
    overlay?: string;
  };

  surface: {
    primary: string;
    elevated?: string;
  };

  text: {
    primary: string;
    secondary?: string;
    muted?: string;
    inverse?: string;
  };

  accent: {
    primary: string;
    pressed?: string;
  };

  border: {
    subtle: string;
    strong?: string;
  };

};