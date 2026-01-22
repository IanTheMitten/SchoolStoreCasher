# Project Overview

This is a standalone local cashier and inventory management app for Android tablets. It is a single-page application (SPA) built with React, Vite, and TypeScript. All data is stored locally in the browser's IndexedDB, and there is no backend server. The application is designed to be wrapped in an Android app using Capacitor.

## Key Technologies

*   **Frontend:** React, Vite, TypeScript
*   **Styling:** Tailwind CSS, radix-ui
*   **Data Storage:** IndexedDB
*   **Mobile:** Capacitor for Android

## Architecture

The application is architected as a local-only, single-page application.

*   **`src/`**: Contains all the frontend source code.
    *   **`components/`**: Contains the React components that make up the UI. The application is divided into several pages, including `CashierPage`, `InventoryPage`, and `BudgetPage`.
    *   **`services/`**: Contains the data access logic.
        *   **`api.ts`**: Defines a local API that interacts with the IndexedDB database.
        *   **`localDb.ts`**: Provides a wrapper around IndexedDB for creating, reading, updating, and deleting data.
    *   **`data/`**: Contains mock data for seeding the database.
*   **`server/`**: This directory contains a Node.js server, but it does not appear to be used by the main application, which is a local-only app.
*   **`android/`**: Contains the Android project for the Capacitor app.

## Building and Running

1.  **Install dependencies:**

    ```bash
    npm i
    ```

2.  **Run the development server:**

    ```bash
    npm run dev
    ```

    This will start the Vite development server, and the application will be available at `http://localhost:3000`.

3.  **Build the application:**

    ```bash
    npm run build
    ```

    This will create a production build of the application in the `build/` directory.

## Development Conventions

*   The project uses TypeScript for static typing.
*   Styling is done with Tailwind CSS and a set of `radix-ui` components.
*   The application state is managed within the `App.tsx` component.
*   Data is stored locally in IndexedDB. All interactions with the database are handled by the `src/services/localDb.ts` file.
*   The application is designed to be a hybrid mobile app for Android using Capacitor.
