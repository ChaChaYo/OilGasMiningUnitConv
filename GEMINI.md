# Project Requirements: Unit Converter (Oil, Gas, Mining)

## Overview
A specialized unit conversion calculator for the oil, gas, and mining industries, originally developed in Google AI Studio. It supports weight, energy, and price conversions for Gold, LNG, and Oil.

## Key Features
- **Gold / 黄金**:
    - Weight conversion (oz, Moz, g, t).
    - Price conversion (USD/oz to CNY/g).
- **LNG / 天然气**:
    - Mass (t, Mt).
    - Energy (MMBtu).
    - Volume (cf, bcf, tcf, m³, MSm³).
    - Price conversion (USD/MMBtu to CNY/m³).
- **Oil / 原油**:
    - Inventory conversion (Tonne to Barrels).
    - Production Rate (Annual t/y to Daily bbl/d).
    - Density/API Gravity adjustments.
- **Advanced Features**:
    - Real-time USD-CNY exchange rate fetching.
    - Adjustable parameters (Density, Days per year).

## Goals
- [ ] Perform local testing to ensure all conversions are accurate and the UI is functional.
- [ ] Prepare the project for deployment to GitHub Pages or a similar platform.

## Local Development Guidelines
- Use `npm install` to set up dependencies.
- Use `npm run dev` for local development and testing.
- Ensure TypeScript types are correctly defined in `src/types.ts`.
- Follow the existing styling using Tailwind CSS.

## Deployment Instructions
1. Build the project: `npm run build`.
2. Deploy the `dist` folder to GitHub.
