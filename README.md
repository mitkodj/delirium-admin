# Delirium Admin

Expo (React Native) admin app for clubs: events, reservations, floor map, gallery and club profile.

## Project structure

```
assets/
  branding/        app icon, adaptive icon, splash, favicon, logos
  images/          sample photos
plugins/           Expo config plugins
src/
  app/             expo-router routes only (screens): login, dashboard/*
  components/
    common/        generic building blocks (buttons, header, table, pickers)
    events/        event form, genre selector, events table
    floorMap/      floor canvas/editor pieces and the schema viewer modal
    gallery/       photo gallery and lightbox
    location/      location selector, widget and map modal
    reservations/  reservation row, form, detail and table selector
  config/          per-environment app config (read by app.config.js)
  constants/       shared constants
  hooks/           reusable hooks (tablet modal layout, image color)
  mocks/           mock data
  providers/       React contexts
  services/        API client and session storage
  styles/          shared StyleSheets
  theme/           theme tokens, dark theme, paper theme
  types/           TypeScript types
  utils/           pure helpers (dates, OData query builder, asset URLs)
```

`src/app` is the expo-router directory: every file in it becomes a route, so keep non-route code (components, hooks, styles) outside of it.
