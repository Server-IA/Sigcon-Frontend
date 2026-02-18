/**
 * Config
 * -------------------------------------------------------------------------------------
 * ! IMPORTANT: Make sure you clear the browser local storage In order to see the config changes in the template.
 * ! To clear local storage: (https://www.leadshook.com/help/how-to-clear-local-storage-in-google-chrome-browser/).
 */

'use strict';

/**
 * Colores disponibles:
 * - config.colors: primary, secondary, success, info, warning, danger, dark, black, white,
 *   cardColor, bodyBg, bodyColor, headingColor, textMuted, borderColor
 * - config.colors_label: variantes con transparencia (ej. primary -> #666cff29)
 * - config.colors_dark: variantes para modo oscuro
 *
 * Uso en JavaScript/React:
 *   window.config.colors.primary
 *   window.config.colors_label.success
 *
 * Uso en CSS/SCSS (inyectados automáticamente en :root):
 *   color: var(--config-primary);
 *   background: var(--config-success);
 *   border-color: var(--config-primary-label);
 *   (modo oscuro) var(--config-dark-bodyBg);
 */
window.config = {
  colors: {
    primary: '#666cff',
    secondary: '#6d788d',
    success: '#72e128',
    info: '#26c6f9',
    warning: '#fdb528',
    danger: '#ff4d49',
    dark: '#4b4b4b',
    black: '#000',
    white: '#fff',
    cardColor: '#fff',
    bodyBg: '#f7f7f9',
    bodyColor: '#676a7b',
    headingColor: '#3b4055',
    textMuted: '#a8aab4',
    borderColor: '#e5e5e8'
  },
  colors_label: {
    primary: '#666cff29',
    secondary: '#6d788d29',
    success: '#72e12829',
    info: '#26c6f929',
    warning: '#fdb52829',
    danger: '#ff4d4929',
    dark: '#4b4b4b29'
  },
  colors_dark: {
    cardColor: '#30334e',
    bodyBg: '#282a42',
    bodyColor: '#b2b3ca',
    headingColor: '#d7d8ee',
    textMuted: '#7b7d95',
    borderColor: '#464964'
  },
  enableMenuLocalStorage: true // Enable menu state with local storage support
};

window.assetsPath = document.documentElement.getAttribute('data-assets-path');
window.templateName = document.documentElement.getAttribute('data-template');
window.rtlSupport = true; // set true for rtl support (rtl + ltr), false for ltr only.

/**
 * TemplateCustomizer
 * ! You must use(include) template-customizer.js to use TemplateCustomizer settings
 * -----------------------------------------------------------------------------------------------
 */

// To use more themes, just push it to THEMES object.

/* TemplateCustomizer.THEMES.push({
  name: 'theme-raspberry',
  title: 'Raspberry'
}); */

// To add more languages, just push it to LANGUAGES object.
/*
TemplateCustomizer.LANGUAGES.fr = { ... };
*/

/**
 * TemplateCustomizer settings
 * -------------------------------------------------------------------------------------
 * cssPath: Core CSS file path
 * themesPath: Theme CSS file path
 * displayCustomizer: true(Show customizer), false(Hide customizer)
 * lang: To set default language, Add more langues and set default. Fallback language is 'en'
 * controls: [ 'rtl', 'style', 'headerType', 'contentLayout', 'layoutCollapsed', 'layoutNavbarOptions', 'themes' ] | Show/Hide customizer controls
 * defaultTheme: 0(Default), 1(Bordered), 2(Semi Dark)
 * defaultStyle: 'light', 'dark', 'system' (Mode)
 * defaultTextDir: 'ltr', 'rtl' (rtlSupport must be true for rtl mode)
 * defaultContentLayout: 'compact', 'wide' (compact=container-xxl, wide=container-fluid)
 * defaultHeaderType: 'static', 'fixed' (for horizontal layout only)
 * defaultMenuCollapsed: true, false (For vertical layout only)
 * defaultNavbarType: 'sticky', 'static', 'hidden' (For vertical layout only)
 * defaultFooterFixed: true, false (For vertical layout only)
 * defaultShowDropdownOnHover : true, false (for horizontal layout only)
 */

if (typeof TemplateCustomizer !== 'undefined') {

  window.templateCustomizer = new TemplateCustomizer({
    cssPath: assetsPath + 'vendor/css' + (rtlSupport ? '/rtl' : '') + '/',
    themesPath: assetsPath + 'vendor/css' + (rtlSupport ? '/rtl' : '') + '/',
    displayCustomizer: true,
    lang: localStorage.getItem('templateCustomizer-' + templateName + '--Lang') || 'en', // Set default language here
    // defaultTheme: 2,
    // defaultStyle: 'system',
    // defaultTextDir: 'rtl',
    // defaultContentLayout: 'wide',
    // defaultHeaderType: 'static',
    // defaultMenuCollapsed: true,
    // defaultNavbarType: 'sticky',
    // defaultFooterFixed: false,
    // defaultShowDropdownOnHover: false,
    controls: ['rtl', 'style', 'headerType', 'contentLayout', 'layoutCollapsed', 'layoutNavbarOptions', 'themes']
  });
}

/**
 * Inyectar colores de config como variables CSS en :root
 * Uso en CSS: var(--config-primary), var(--config-success), etc.
 * Uso en JS/React: window.config.colors.primary
 */
(function injectConfigColors() {
  if (typeof window.config === 'undefined' || !window.config.colors) return;
  var root = document.documentElement;
  var colors = window.config.colors;
  var colorsLabel = window.config.colors_label || {};
  var colorsDark = window.config.colors_dark || {};
  Object.keys(colors).forEach(function (key) {
    root.style.setProperty('--config-' + key, colors[key]);
  });
  Object.keys(colorsLabel).forEach(function (key) {
    root.style.setProperty('--config-' + key + '-label', colorsLabel[key]);
  });
  Object.keys(colorsDark).forEach(function (key) {
    root.style.setProperty('--config-dark-' + key, colorsDark[key]);
  });
})();


function lightenColor(hex, percent = 75) {
  // Quitar #
  hex = hex.replace("#", "");

  // Convertir a RGB
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  // Mezclar con blanco
  r = Math.round(r + (255 - r) * (percent / 100));
  g = Math.round(g + (255 - g) * (percent / 100));
  b = Math.round(b + (255 - b) * (percent / 100));

  // Convertir de nuevo a HEX
  return (
    "#" +
    r.toString(16).padStart(2, "0") +
    g.toString(16).padStart(2, "0") +
    b.toString(16).padStart(2, "0")
  );
}
